export type ProviderId = 'openai' | 'anthropic' | 'google' | 'xai' | 'mistral' | 'cohere' | 'deepseek' | 'kimi' | 'openrouter' | 'groq' | 'together' | 'huggingface' | 'replicate' | 'stability' | 'runway' | 'elevenlabs' | 'ollama' | 'mock';
export type Availability = 'available' | 'limited' | 'exhausted' | 'reset-pending' | 'unknown' | 'revoked';
export type QuotaSource = 'official-api' | 'official-cli' | 'response-headers' | 'local-runtime' | 'mock-simulation' | 'unknown';
export type Confidence = 'verified' | 'estimated' | 'unknown';
export type Capability = 'chat' | 'code' | 'vision' | 'files' | 'tools' | 'streaming' | 'local';
export type ConnectionMethod = 'official-api' | 'official-subscription' | 'official-cli' | 'local-runtime' | 'mock-simulation';

export interface QuotaWindow {
  kind: 'rate' | 'five-hour' | 'daily' | 'weekly' | 'monthly' | 'tokens' | 'requests' | 'credit';
  usedPercent?: number;
  remaining?: number;
  limit?: number;
  resetAt?: string;
  source: QuotaSource;
  confidence: Confidence;
}

export interface ProviderAccount {
  id: string;
  provider: ProviderId;
  displayName: string;
  plan: string;
  model: string;
  connectionMethod: ConnectionMethod;
  availability: Availability;
  connected: boolean;
  capabilities: Capability[];
  quotaWindows: QuotaWindow[];
  paid: boolean;
  priority: number;
  currentTask?: string;
  lastUpdatedAt?: string;
  simulation: boolean;
}

export interface QuotaThresholds {
  observe: number;
  warn: number;
  prepare: number;
  switch: number;
  emergency: number;
}

export interface QuotaAssessment {
  state: Availability;
  effectiveUsedPercent?: number;
  limitingWindow?: QuotaWindow;
  action: 'continue' | 'observe' | 'warn' | 'prepare' | 'switch' | 'wait';
  reason: string;
}

export interface TaskRequirements {
  capabilities: Capability[];
  freeOnly: boolean;
  estimatedMinutes?: number;
}

export interface RoutingDecision {
  action: 'continue' | 'switch' | 'wait';
  selectedAccountId?: string;
  checkpointRequired: boolean;
  reason: string;
  retryAt?: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  goal: string;
  status: 'queued' | 'running' | 'waiting-quota' | 'paused' | 'completed' | 'failed';
  providerAccountId?: string;
  createdAt: string;
  updatedAt: string;
  retryAt?: string;
}

export const DEFAULT_THRESHOLDS: QuotaThresholds = {
  observe: 80,
  warn: 85,
  prepare: 90,
  switch: 95,
  emergency: 100,
};
