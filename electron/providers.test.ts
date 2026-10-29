import { afterEach, describe, expect, it, vi } from 'vitest';
import { testApiConnection, testOllamaConnection } from './providers';
import { PROVIDER_CATALOG } from '../src/core/provider-catalog';

afterEach(() => vi.unstubAllGlobals());

describe('official provider connection probes', () => {
  it('uses the OpenAI official endpoint and bearer authorization without exposing the key in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'gpt-test' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await testApiConnection({ provider: 'openai', apiKey: 'secret-openai-key' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/models');
    expect(options.headers.Authorization).toBe('Bearer secret-openai-key');
    expect(String(url)).not.toContain('secret-openai-key');
    expect(result).toMatchObject({ ok: true, models: ['gpt-test'] });
    expect(result.message).toContain('read-only endpoint');
  });

  it('uses Gemini model discovery with the key in the official header, not the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'models/gemini-test' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await testApiConnection({ provider: 'google', apiKey: 'key with spaces' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(options.headers).toEqual({ 'x-goog-api-key': 'key with spaces' });
    expect(url).not.toContain('key with spaces');
    expect(result.models).toEqual(['models/gemini-test']);
  });

  it('does not treat a rejected credential as connected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(testApiConnection({ provider: 'xai', apiKey: 'rejected-key' })).resolves.toEqual({ ok: false, message: 'Official xai API returned HTTP 401.' });
  });

  it('covers at least ten additional official providers without sending generation requests', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: [{ id: 'verified-model', label: 'verified' }], models: [{ name: 'verified-model' }], subscription: { tier: 'trial' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    for (const provider of PROVIDER_CATALOG) {
      await expect(testApiConnection({ provider: provider.id, apiKey: 'credential-value' })).resolves.toMatchObject({ ok: true });
    }
    expect(PROVIDER_CATALOG.length).toBeGreaterThanOrEqual(14);
    expect(fetchMock).toHaveBeenCalledTimes(PROVIDER_CATALOG.length);
    expect(fetchMock.mock.calls.every((call) => call[1]?.method === undefined)).toBe(true);
  });

  it('uses provider-specific headers for video and audio services', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ creditBalance: 10, subscription: { tier: 'trial' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await testApiConnection({ provider: 'runway', apiKey: 'runway-key' });
    await testApiConnection({ provider: 'elevenlabs', apiKey: 'eleven-key' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.dev.runwayml.com/v1/organization');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer runway-key', 'X-Runway-Version': '2024-11-06' });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ 'xi-api-key': 'eleven-key' });
  });

  it('restricts Ollama probing to the loopback endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'qwen-local' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await testOllamaConnection();
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/tags');
    expect(result).toMatchObject({ ok: true, models: ['qwen-local'] });
    expect(result.message).toContain('Inference was not tested');
  });
});
