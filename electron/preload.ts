import { contextBridge, ipcRenderer } from 'electron';
import type { ConnectionInput, CreateTaskInput, DesktopApi } from '../src/shared/api';

const api: DesktopApi = {
  getSnapshot: () => ipcRenderer.invoke('workspace:snapshot'),
  createTask: (input: CreateTaskInput) => ipcRenderer.invoke('tasks:create', input),
  runScenario: (scenario) => ipcRenderer.invoke('simulation:run', scenario),
  testConnection: (input: ConnectionInput) => ipcRenderer.invoke('connections:test-api', input),
  testOllama: () => ipcRenderer.invoke('connections:test-ollama'),
  getRuntimeInfo: () => ipcRenderer.invoke('runtime:info'),
};

contextBridge.exposeInMainWorld('desktop', Object.freeze(api));
