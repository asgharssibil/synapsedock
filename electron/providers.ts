import type { ConnectionInput, ConnectionTestResult } from '../src/shared/api';

const endpoints: Record<ConnectionInput['provider'], string> = {
  openai: 'https://api.openai.com/v1/models',
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
  xai: 'https://api.x.ai/v1/models',
};

export async function testApiConnection(input: ConnectionInput): Promise<ConnectionTestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = input.provider === 'google' ? `${endpoints.google}?key=${encodeURIComponent(input.apiKey)}` : endpoints[input.provider];
    const response = await fetch(url, {
      headers: input.provider === 'google' ? {} : { Authorization: `Bearer ${input.apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, message: `Official API returned HTTP ${response.status}.` };
    const body = await response.json() as { data?: Array<{ id?: string; name?: string }>; models?: Array<{ id?: string; name?: string }> };
    const models = (body.data ?? body.models ?? []).map((item) => item.id ?? item.name ?? '').filter(Boolean).slice(0, 12);
    return { ok: true, message: 'Credentials accepted for official model discovery. Inference and quota were not tested.', models };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Connection failed.' };
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
