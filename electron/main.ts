import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { CredentialVault } from './credential-vault';
import { WorkspaceDatabase } from './database';
import { testApiConnection, testOllamaConnection } from './providers';
import { parseConnectionInput, parseTaskInput } from './validation';
import { isNavigationAllowed, SECURE_WEB_PREFERENCES } from './security-policy';
import { ChatGptOAuth } from './chatgpt-oauth';
import { ClaudeCliAdapter } from './claude-cli';
import { AiChatService, DEFAULT_CHAT_MODELS } from './ai-chat';
import { CodeWorkspaceService } from './code-workspace';
import { PROVIDER_CATALOG } from '../src/core/provider-catalog';
import type { ChatRequest, WorkspaceFile } from '../src/shared/api';

let database: WorkspaceDatabase;
let vault: CredentialVault;
let chatGptOAuth: ChatGptOAuth;
let claudeCli: ClaudeCliAdapter;
let aiChat: AiChatService;
let codeWorkspace: CodeWorkspaceService;
const smokeDirectory = process.env.UAIW_SMOKE_DIR ? path.resolve(process.env.UAIW_SMOKE_DIR) : undefined;
const qaDataDirectory = process.env.UAIW_QA_DATA_DIR ? path.resolve(process.env.UAIW_QA_DATA_DIR) : undefined;
const smokeVariant = process.env.UAIW_SMOKE_VARIANT;
const smokeView = process.env.UAIW_SMOKE_VIEW;
const smokeCompact = process.env.UAIW_SMOKE_COMPACT === '1';
const marketingCapture = process.env.UAIW_MARKETING_CAPTURE === '1';
const developmentMode = process.env.UAIW_DEV_SERVER === '1';
if (smokeDirectory) app.setPath('userData', path.join(smokeDirectory, 'user-data'));
else if (qaDataDirectory) app.setPath('userData', qaDataDirectory);

function registerIpc(): void {
  ipcMain.handle('workspace:snapshot', () => database.snapshot());
  ipcMain.handle('tasks:create', (_event, raw: unknown) => {
    const input = parseTaskInput(raw);
    database.createTask(input.title, input.goal, input.freeOnly);
    return database.snapshot();
  });
  ipcMain.handle('simulation:run', (_event, raw: unknown) => {
    const allowed = ['gpt-90', 'claude-exhausted', 'all-exhausted', 'reset-recovered'];
    if (typeof raw !== 'string' || !allowed.includes(raw)) throw new Error('Unknown simulation scenario.');
    database.applyScenario(raw);
    return database.snapshot();
  });
  ipcMain.handle('connections:test-api', async (_event, raw: unknown) => {
    const input = parseConnectionInput(raw);
    const result = await testApiConnection(input);
    if (result.ok) {
      await vault.set(`${input.provider}:api-key`, input.apiKey);
      database.markConnection(input.provider, result.models ?? []);
    }
    return result;
  });
  ipcMain.handle('connections:test-ollama', async () => {
    const result = await testOllamaConnection();
    if (result.ok) database.markConnection('ollama', result.models ?? []);
    return result;
  });
  ipcMain.handle('connections:chatgpt-status', () => chatGptOAuth.getStatus());
  ipcMain.handle('connections:chatgpt-sign-in', async () => {
    const status = await chatGptOAuth.signIn();
    database.markChatGptConnection(status.email ?? status.name ?? 'ChatGPT account', status.planUsage);
    return status;
  });
  ipcMain.handle('connections:chatgpt-sign-out', async () => {
    const result = await chatGptOAuth.signOut();
    database.disconnectChatGpt();
    return result;
  });
  ipcMain.handle('connections:claude-cli-status', () => claudeCli.status(database.getBooleanSetting('experimental.claude-cli.enabled')));
  ipcMain.handle('connections:claude-cli-enabled', async (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid experimental connector setting.');
    database.setBooleanSetting('experimental.claude-cli.enabled', enabled);
    if (!enabled) database.disconnectClaudeCli();
    return claudeCli.status(enabled);
  });
  ipcMain.handle('connections:claude-cli-login', async () => {
    if (!database.getBooleanSetting('experimental.claude-cli.enabled')) throw new Error('Enable the experimental Claude connector first.');
    return claudeCli.launchLogin();
  });
  ipcMain.handle('connections:claude-cli-verify', async () => {
    if (!database.getBooleanSetting('experimental.claude-cli.enabled')) throw new Error('Enable the experimental Claude connector first.');
    const result = await claudeCli.verify();
    if (result.ok) database.markClaudeCliConnection(result.version ?? 'unknown', result.authMethod ?? 'unknown');
    return result;
  });
  ipcMain.handle('chat:providers', async () => {
    const snapshot = database.snapshot();
    const chatGpt = chatGptOAuth.getStatus();
    const claude = await claudeCli.status(database.getBooleanSetting('experimental.claude-cli.enabled'));
    const options = [
      { id: 'chatgpt' as const, name: 'ChatGPT subscription', connected: chatGpt.connected && chatGpt.planUsage, method: 'subscription' as const, defaultModel: DEFAULT_CHAT_MODELS.chatgpt, models: [DEFAULT_CHAT_MODELS.chatgpt], detail: chatGpt.connected ? (chatGpt.planUsage ? 'Plan access connected' : 'Plan permission missing') : 'Sign in from Connections' },
      { id: 'claude-cli' as const, name: 'Claude Pro / Max', connected: claude.enabled && claude.loggedIn, method: 'subscription' as const, defaultModel: DEFAULT_CHAT_MODELS['claude-cli'], models: [DEFAULT_CHAT_MODELS['claude-cli']], detail: claude.detail },
      ...PROVIDER_CATALOG.filter((provider) => provider.capabilities.includes('chat')).map((provider) => {
        const account = snapshot.accounts.find((item) => item.id === `${provider.id}-api`);
        const discovered = account?.model.split(',').map((item) => item.trim()).filter((item) => item && !/discover|unavailable/i.test(item)) ?? [];
        const fallback = DEFAULT_CHAT_MODELS[provider.id];
        return { id: provider.id, name: provider.name, connected: Boolean(vault.get(`${provider.id}:api-key`)), method: 'api' as const, defaultModel: fallback, models: [...new Set([fallback, ...discovered].filter(Boolean))] };
      }),
      { id: 'ollama' as const, name: 'Ollama Local', connected: Boolean(snapshot.accounts.find((item) => item.id === 'ollama-local')?.connected), method: 'local' as const, defaultModel: DEFAULT_CHAT_MODELS.ollama, models: [DEFAULT_CHAT_MODELS.ollama], detail: 'Local runtime at 127.0.0.1' },
    ];
    return options;
  });
  ipcMain.handle('chat:send', (_event, input: ChatRequest) => aiChat.send(input));
  ipcMain.handle('code:workspace', () => codeWorkspace.state());
  ipcMain.handle('code:choose-workspace', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = owner ? await dialog.showOpenDialog(owner, { properties: ['openDirectory', 'createDirectory'] }) : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (!result.canceled && result.filePaths[0]) {
      codeWorkspace.setRoot(result.filePaths[0]);
      database.setStringSetting('code.workspace.root', result.filePaths[0]);
    }
    return codeWorkspace.state();
  });
  ipcMain.handle('code:read-file', (_event, filePath: unknown) => {
    if (typeof filePath !== 'string') throw new Error('Invalid workspace path.');
    return codeWorkspace.read(filePath);
  });
  ipcMain.handle('code:save-file', (_event, file: WorkspaceFile) => codeWorkspace.save(file));
  ipcMain.handle('code:run-command', (_event, command: unknown) => {
    if (typeof command !== 'string') throw new Error('Invalid command.');
    return codeWorkspace.run(command);
  });
  ipcMain.handle('runtime:info', () => ({ platform: process.platform, version: app.getVersion(), dataPath: app.getPath('userData') }));
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: smokeCompact ? 1100 : 1480, height: smokeCompact ? 700 : 940, minWidth: 1100, minHeight: 700,
    icon: app.isPackaged ? path.join(process.resourcesPath, 'app-icon.png') : path.join(__dirname, '../../assets/app-icon.png'),
    backgroundColor: '#0b0f14', titleBarStyle: 'hiddenInset', show: !smokeDirectory,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), ...SECURE_WEB_PREFERENCES, devTools: developmentMode,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isNavigationAllowed(url, developmentMode)) event.preventDefault();
  });
  if (developmentMode) await window.loadURL('http://localhost:5173');
  else await window.loadFile(path.join(__dirname, '../../dist/index.html'));
  if (smokeDirectory) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const renderer = await window.webContents.executeJavaScript(`(async () => {
      if (${JSON.stringify(smokeVariant)} === 'en-light') {
        document.querySelector('.locale-button')?.click();
        document.querySelector('.icon-button')?.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const requestedView = ${JSON.stringify(smokeView)};
      if (requestedView) {
        document.querySelector('[data-view="' + requestedView + '"]')?.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      const runtime = await window.desktop.getRuntimeInfo();
      const claudeCliStatus = await window.desktop.getClaudeCliStatus();
      const chatProviders = await window.desktop.getChatProviders();
      const codeWorkspace = await window.desktop.getCodeWorkspace();
      const smokeFile = codeWorkspace.files.includes('smoke.js') ? await window.desktop.readWorkspaceFile('smoke.js') : undefined;
      if (smokeFile) await window.desktop.saveWorkspaceFile({ path: 'smoke.js', content: smokeFile.content + '\\n// saved by E2E' });
      const commandResult = codeWorkspace.root ? await window.desktop.runWorkspaceCommand('Write-Output SYNAPSEDOCK_TERMINAL_OK') : undefined;
      await new Promise((resolve) => setTimeout(resolve, 200));
      const before = await window.desktop.getSnapshot();
      const after = await window.desktop.createTask({ title: 'Electron E2E task', goal: 'Verify preload, IPC, SQLite and renderer.', freeOnly: true });
      return {
        title: document.title,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        theme: document.documentElement.dataset.theme,
        hasAppShell: Boolean(document.querySelector('.app-shell')),
        text: document.body.innerText.slice(0, 2000),
        runtime,
        claudeCliStatus,
        chatProviderCount: chatProviders.length,
        codeWorkspaceReady: Boolean(codeWorkspace.root && smokeFile?.content.includes('smoke')),
        terminalReady: Boolean(commandResult?.stdout.includes('SYNAPSEDOCK_TERMINAL_OK') && commandResult.exitCode === 0),
        accountCount: before.accounts.length,
        tasksBefore: before.tasks.length,
        tasksAfter: after.tasks.length,
        ipcTaskPersisted: after.tasks.some((task) => task.title === 'Electron E2E task')
      };
    })()`);
    await vault.set('smoke-test', 'smoke-secret-value');
    const credentialRoundTrip = vault.get('smoke-test') === 'smoke-secret-value';
    const encryptedCredentialFile = fs.readFileSync(path.join(smokeDirectory, 'user-data', 'credentials.enc.json'), 'utf8');
    if (marketingCapture) {
      window.showInactive();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const image = await window.webContents.capturePage();
    fs.mkdirSync(smokeDirectory, { recursive: true });
    fs.writeFileSync(path.join(smokeDirectory, 'renderer.png'), image.toPNG());
    fs.writeFileSync(path.join(smokeDirectory, 'smoke.json'), JSON.stringify({ renderer, snapshot: database.snapshot(), electron: process.versions.electron, credentialEncrypted: !encryptedCredentialFile.includes('smoke-secret-value'), credentialRoundTrip }, null, 2));
    app.quit();
  }
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const dataPath = app.getPath('userData');
  database = await WorkspaceDatabase.open(path.join(dataPath, 'workspace.sqlite'));
  vault = new CredentialVault(path.join(dataPath, 'credentials.enc.json'));
  chatGptOAuth = new ChatGptOAuth(vault);
  const claudeWorkingDirectory = path.join(dataPath, 'claude-bridge');
  fs.mkdirSync(claudeWorkingDirectory, { recursive: true });
  claudeCli = new ClaudeCliAdapter(claudeWorkingDirectory);
  aiChat = new AiChatService(vault, chatGptOAuth, claudeCli);
  codeWorkspace = new CodeWorkspaceService();
  const savedWorkspace = database.getStringSetting('code.workspace.root');
  if (savedWorkspace && fs.existsSync(savedWorkspace)) codeWorkspace.setRoot(savedWorkspace);
  if (smokeDirectory) {
    const smokeWorkspace = path.join(smokeDirectory, 'code-workspace');
    fs.mkdirSync(smokeWorkspace, { recursive: true });
    fs.writeFileSync(path.join(smokeWorkspace, 'smoke.js'), 'console.log("smoke");', 'utf8');
    codeWorkspace.setRoot(smokeWorkspace);
  }
  registerIpc();
  try { await createWindow(); }
  catch (error) {
    if (smokeDirectory) {
      fs.mkdirSync(smokeDirectory, { recursive: true });
      fs.writeFileSync(path.join(smokeDirectory, 'smoke-error.txt'), error instanceof Error ? error.stack ?? error.message : String(error));
    }
    app.exit(1);
  }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
