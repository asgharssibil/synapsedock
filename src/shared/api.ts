import type { ProviderAccount, WorkspaceTask } from '../core/types';

export interface ActivityItem {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  event: string;
  message: string;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  accounts: ProviderAccount[];
  tasks: WorkspaceTask[];
  activities: ActivityItem[];
  stats: { running: number; waiting: number; connected: number; checkpoints: number };
}

export interface CreateTaskInput {
  title: string;
  goal: string;
  freeOnly: boolean;
}

export interface ConnectionInput {
  provider: 'openai' | 'google' | 'xai';
  apiKey: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  models?: string[];
}

export interface DesktopApi {
  getSnapshot(): Promise<WorkspaceSnapshot>;
  createTask(input: CreateTaskInput): Promise<WorkspaceSnapshot>;
  runScenario(scenario: 'gpt-90' | 'claude-exhausted' | 'all-exhausted' | 'reset-recovered'): Promise<WorkspaceSnapshot>;
  testConnection(input: ConnectionInput): Promise<ConnectionTestResult>;
  testOllama(): Promise<ConnectionTestResult>;
  getRuntimeInfo(): Promise<{ platform: string; version: string; dataPath: string }>;
}
