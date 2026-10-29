import type { Capability, ProviderId } from './types';

export type CloudProviderId = Exclude<ProviderId, 'ollama' | 'mock'>;
export type ProviderCategory = 'text-code' | 'image-video' | 'audio';

export interface ProviderCatalogItem {
  id: CloudProviderId;
  name: string;
  category: ProviderCategory;
  capabilities: Capability[];
  credential: 'API key' | 'access token';
  docsUrl: string;
  freeTier: 'available' | 'limited' | 'paid' | 'varies';
}

export const PROVIDER_CATALOG: readonly ProviderCatalogItem[] = [
  { id: 'openai', name: 'OpenAI', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://platform.openai.com/api-keys', freeTier: 'paid' },
  { id: 'anthropic', name: 'Anthropic Claude API', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://console.anthropic.com/settings/keys', freeTier: 'paid' },
  { id: 'google', name: 'Google Gemini', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://aistudio.google.com/app/apikey', freeTier: 'available' },
  { id: 'xai', name: 'xAI / Grok', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://console.x.ai/', freeTier: 'paid' },
  { id: 'mistral', name: 'Mistral AI', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://console.mistral.ai/api-keys', freeTier: 'limited' },
  { id: 'cohere', name: 'Cohere', category: 'text-code', capabilities: ['chat', 'files', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://dashboard.cohere.com/api-keys', freeTier: 'limited' },
  { id: 'deepseek', name: 'DeepSeek', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://platform.deepseek.com/api_keys', freeTier: 'varies' },
  { id: 'kimi', name: 'Kimi / Moonshot', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://platform.kimi.ai/', freeTier: 'varies' },
  { id: 'openrouter', name: 'OpenRouter', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://openrouter.ai/settings/keys', freeTier: 'available' },
  { id: 'groq', name: 'GroqCloud', category: 'text-code', capabilities: ['chat', 'code', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://console.groq.com/keys', freeTier: 'limited' },
  { id: 'together', name: 'Together AI', category: 'text-code', capabilities: ['chat', 'code', 'vision', 'tools', 'streaming'], credential: 'API key', docsUrl: 'https://api.together.ai/settings/api-keys', freeTier: 'varies' },
  { id: 'huggingface', name: 'Hugging Face', category: 'image-video', capabilities: ['chat', 'code', 'vision', 'streaming'], credential: 'access token', docsUrl: 'https://huggingface.co/settings/tokens', freeTier: 'available' },
  { id: 'replicate', name: 'Replicate', category: 'image-video', capabilities: ['chat', 'vision', 'files'], credential: 'API key', docsUrl: 'https://replicate.com/account/api-tokens', freeTier: 'varies' },
  { id: 'stability', name: 'Stability AI', category: 'image-video', capabilities: ['vision', 'files'], credential: 'API key', docsUrl: 'https://platform.stability.ai/account/keys', freeTier: 'limited' },
  { id: 'runway', name: 'Runway', category: 'image-video', capabilities: ['vision', 'files'], credential: 'API key', docsUrl: 'https://dev.runwayml.com/', freeTier: 'paid' },
  { id: 'elevenlabs', name: 'ElevenLabs', category: 'audio', capabilities: ['files', 'streaming'], credential: 'API key', docsUrl: 'https://elevenlabs.io/app/settings/api-keys', freeTier: 'limited' },
] as const;

export const providerCatalogItem = (id: CloudProviderId): ProviderCatalogItem => {
  const item = PROVIDER_CATALOG.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown provider: ${id}`);
  return item;
};
