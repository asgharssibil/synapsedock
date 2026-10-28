import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import { CredentialVault } from './credential-vault';
import { WorkspaceDatabase } from './database';
import { testApiConnection, testOllamaConnection } from './providers';
import { parseConnectionInput, parseTaskInput } from './validation';
import { isNavigationAllowed, SECURE_WEB_PREFERENCES } from './security-policy';

let database: WorkspaceDatabase;
let vault: CredentialVault;
const smokeDirectory = process.env.UAIW_SMOKE_DIR ? path.resolve(process.env.UAIW_SMOKE_DIR) : undefined;
const smokeVariant = process.env.UAIW_SMOKE_VARIANT;
const smokeView = process.env.UAIW_SMOKE_VIEW;
const smokeCompact = process.env.UAIW_SMOKE_COMPACT === '1';
const marketingCapture = process.env.UAIW_MARKETING_CAPTURE === '1';
const developmentMode = process.env.UAIW_DEV_SERVER === '1';
if (smokeDirectory) app.setPath('userData', path.join(smokeDirectory, 'user-data'));

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
        accountCount: before.accounts.length,
        tasksBefore: before.tasks.length,
        tasksAfter: after.tasks.length,
        ipcTaskPersisted: after.tasks.some((task) => task.title === 'Electron E2E task')
      };
    })()`);
    await vault.set('smoke-test', 'smoke-secret-value');
    const encryptedCredentialFile = fs.readFileSync(path.join(smokeDirectory, 'user-data', 'credentials.enc.json'), 'utf8');
    if (marketingCapture) {
      window.showInactive();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const image = await window.webContents.capturePage();
    fs.mkdirSync(smokeDirectory, { recursive: true });
    fs.writeFileSync(path.join(smokeDirectory, 'renderer.png'), image.toPNG());
    fs.writeFileSync(path.join(smokeDirectory, 'smoke.json'), JSON.stringify({ renderer, snapshot: database.snapshot(), electron: process.versions.electron, credentialEncrypted: !encryptedCredentialFile.includes('smoke-secret-value') }, null, 2));
    app.quit();
  }
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const dataPath = app.getPath('userData');
  database = await WorkspaceDatabase.open(path.join(dataPath, 'workspace.sqlite'));
  vault = new CredentialVault(path.join(dataPath, 'credentials.enc.json'));
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
