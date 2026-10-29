import { contextBridge, ipcRenderer } from 'electron';
import type { ChatRequest, ConnectionInput, CreateTaskInput, DesktopApi, WorkspaceFile } from '../src/shared/api';

const api: DesktopApi = {
  getSnapshot: () => ipcRenderer.invoke('workspace:snapshot'),
  createTask: (input: CreateTaskInput) => ipcRenderer.invoke('tasks:create', input),
  runScenario: (scenario) => ipcRenderer.invoke('simulation:run', scenario),
  testConnection: (input: ConnectionInput) => ipcRenderer.invoke('connections:test-api', input),
  testOllama: () => ipcRenderer.invoke('connections:test-ollama'),
  getChatGptStatus: () => ipcRenderer.invoke('connections:chatgpt-status'),
  signInChatGpt: () => ipcRenderer.invoke('connections:chatgpt-sign-in'),
  signOutChatGpt: () => ipcRenderer.invoke('connections:chatgpt-sign-out'),
  getClaudeCliStatus: () => ipcRenderer.invoke('connections:claude-cli-status'),
  setClaudeCliEnabled: (enabled: boolean) => ipcRenderer.invoke('connections:claude-cli-enabled', enabled),
  startClaudeCliLogin: () => ipcRenderer.invoke('connections:claude-cli-login'),
  verifyClaudeCli: () => ipcRenderer.invoke('connections:claude-cli-verify'),
  getChatProviders: () => ipcRenderer.invoke('chat:providers'),
  sendChat: (input: ChatRequest) => ipcRenderer.invoke('chat:send', input),
  getCodeWorkspace: () => ipcRenderer.invoke('code:workspace'),
  chooseCodeWorkspace: () => ipcRenderer.invoke('code:choose-workspace'),
  readWorkspaceFile: (filePath: string) => ipcRenderer.invoke('code:read-file', filePath),
  saveWorkspaceFile: (file: WorkspaceFile) => ipcRenderer.invoke('code:save-file', file),
  runWorkspaceCommand: (command: string) => ipcRenderer.invoke('code:run-command', command),
  getRuntimeInfo: () => ipcRenderer.invoke('runtime:info'),
};

contextBridge.exposeInMainWorld('desktop', Object.freeze(api));
