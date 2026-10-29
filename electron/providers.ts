import type { CloudProviderId } from '../src/core/provider-catalog';
import type { ConnectionInput, ConnectionTestResult } from '../src/shared/api';

interface ProbeDefinition {
  url: string;
  headers: (key: string) => Record<string, string>;
  summary?: (body: Record<string, unknown>) => string[];
}

const bearer = (key: string): Record<string, string> => ({ Authorization: `Bearer ${key}` });
const dataModels = (body: Record<string, unknown>): string[] => {
  const source = (Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : []) as Array<Record<string, unknown>>;
  return source.map((item) => String(item.id ?? item.name ?? '')).filter(Boolean).slice(0, 12);
};

const probes: Record<CloudProviderId, ProbeDefinition> = {
  openai: { url: 'https://api.openai.com/v1/models', headers: bearer },
  anthropic: { url: 'https://api.anthropic.com/v1/models', headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }) },
  google: { url: 'https://generativelanguage.googleapis.com/v1beta/models', headers: (key) => ({ 'x-goog-api-key': key }) },
  xai: { url: 'https://api.x.ai/v1/models', headers: bearer },
  mistral: { url: 'https://api.mistral.ai/v1/models', headers: bearer },
  cohere: { url: 'https://api.cohere.com/v1/models?page_size=12', headers: bearer },
  deepseek: { url: 'https://api.deepseek.com/models', headers: bearer },
  kimi: { url: 'https://api.moonshot.ai/v1/models', headers: bearer },
  openrouter: { url: 'https://openrouter.ai/api/v1/key', headers: bearer, summary: (body) => [`Key ${String((body.data as Record<string, unknown> | undefined)?.label ?? 'verified')}`] },
  groq: { url: 'https://api.groq.com/openai/v1/models', headers: bearer },
  together: { url: 'https://api.together.xyz/v1/models', headers: bearer },
  huggingface: { url: 'https://huggingface.co/api/whoami-v2', headers: bearer, summary: (body) => [`Account ${String(body.name ?? body.fullname ?? 'verified')}`] },
  replicate: { url: 'https://api.replicate.com/v1/account', headers: bearer, summary: (body) => [`Account ${String(body.username ?? body.name ?? 'verified')}`] },
  stability: { url: 'https://api.stability.ai/v1/user/balance', headers: bearer, summary: (body) => [`Credits ${String(body.credits ?? 'available')}`] },
  runway: { url: 'https://api.dev.runwayml.com/v1/organization', headers: (key) => ({ ...bearer(key), 'X-Runway-Version': '2024-11-06' }), summary: (body) => [`Credits ${String(body.creditBalance ?? 'available')}`] },
  elevenlabs: { url: 'https://api.elevenlabs.io/v1/user', headers: (key) => ({ 'xi-api-key': key }), summary: (body) => [`Plan ${String((body.subscription as Record<string, unknown> | undefined)?.tier ?? 'verified')}`] },
};

export async function testApiConnection(input: ConnectionInput): Promise<ConnectionTestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const probe = probes[input.provider];
  try {
    const response = await fetch(probe.url, { headers: probe.headers(input.apiKey), signal: controller.signal });
    if (!response.ok) return { ok: false, message: `Official ${input.provider} API returned HTTP ${response.status}.` };
    const body = await response.json() as Record<string, unknown>;
    const models = (probe.summary ?? dataModels)(body);
    return { ok: true, message: 'Credential accepted by the official read-only endpoint. Generation and charges were not tested.', models };
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.name === 'AbortError' ? 'Official API check timed out.' : 'Official API check failed without sending a generation request.' };
  } finally { clearTimeout(timeout); }
}

export async function testOllamaConnection(): Promise<ConnectionTestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: controller.signal });
    if (!response.ok) return { ok: false, message: `Ollama returned HTTP ${response.status}.` };
    const body = await response.json() as { models?: Array<{ name: string }> };
    return { ok: true, message: 'Local Ollama runtime and models discovered. Inference was not tested.', models: (body.models ?? []).map((model) => model.name) };
  } catch { return { ok: false, message: 'Ollama is not reachable at 127.0.0.1:11434.' }; }
  finally { clearTimeout(timeout); }
}
