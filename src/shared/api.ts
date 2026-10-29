import type { ProviderAccount, WorkspaceTask } from '../core/types';
import type { CloudProviderId } from '../core/provider-catalog';

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
  provider: CloudProviderId;
  apiKey: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  models?: string[];
}

export interface ChatGptConnectionStatus {
  connected: boolean;
  planUsage: boolean;
  email?: string;
  name?: string;
  expiresAt?: string;
}

export interface ClaudeCliStatus {
  enabled: boolean;
  installed: boolean;
  loggedIn: boolean;
  version?: string;
  authMethod?: 'none' | 'claude.ai' | 'oauth_token' | 'api_key' | 'api_key_helper' | 'third_party' | 'unknown';
  executable?: string;
  detail?: string;
}

export interface ClaudeCliVerification {
  ok: boolean;
  message: string;
  response?: string;
}

export type ChatProviderId = CloudProviderId | 'chatgpt' | 'claude-cli' | 'ollama';

export interface ChatProviderOption {
  id: ChatProviderId;
  name: string;
  connected: boolean;
  method: 'subscription' | 'api' | 'local';
  defaultModel: string;
  models: string[];
  detail?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  provider: ChatProviderId;
  model: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  provider: ChatProviderId;
  model: string;
  content: string;
}

export interface CodeWorkspaceState {
  root?: string;
  files: string[];
}

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface DesktopApi {
  getSnapshot(): Promise<WorkspaceSnapshot>;
  createTask(input: CreateTaskInput): Promise<WorkspaceSnapshot>;
  runScenario(scenario: 'gpt-90' | 'claude-exhausted' | 'all-exhausted' | 'reset-recovered'): Promise<WorkspaceSnapshot>;
  testConnection(input: ConnectionInput): Promise<ConnectionTestResult>;
  testOllama(): Promise<ConnectionTestResult>;
  getChatGptStatus(): Promise<ChatGptConnectionStatus>;
  signInChatGpt(): Promise<ChatGptConnectionStatus>;
  signOutChatGpt(): Promise<{ remoteRevoked: boolean }>;
  getClaudeCliStatus(): Promise<ClaudeCliStatus>;
  setClaudeCliEnabled(enabled: boolean): Promise<ClaudeCliStatus>;
  startClaudeCliLogin(): Promise<{ launched: boolean; message: string }>;
  verifyClaudeCli(): Promise<ClaudeCliVerification>;
  getChatProviders(): Promise<ChatProviderOption[]>;
  sendChat(input: ChatRequest): Promise<ChatResponse>;
  getCodeWorkspace(): Promise<CodeWorkspaceState>;
  chooseCodeWorkspace(): Promise<CodeWorkspaceState>;
  readWorkspaceFile(path: string): Promise<WorkspaceFile>;
  saveWorkspaceFile(file: WorkspaceFile): Promise<CodeWorkspaceState>;
  runWorkspaceCommand(command: string): Promise<CommandResult>;
  getRuntimeInfo(): Promise<{ platform: string; version: string; dataPath: string }>;
}
