import { afterEach, describe, expect, it, vi } from 'vitest';
import { testApiConnection, testOllamaConnection } from './providers';

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
    expect(result.message).toContain('Inference and quota were not tested');
  });

  it('uses Gemini model discovery with an encoded API key and no bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'models/gemini-test' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await testApiConnection({ provider: 'google', apiKey: 'key with spaces' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('key=key%20with%20spaces');
    expect(options.headers).toEqual({});
    expect(result.models).toEqual(['models/gemini-test']);
  });

  it('does not treat a rejected credential as connected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(testApiConnection({ provider: 'xai', apiKey: 'rejected-key' })).resolves.toEqual({ ok: false, message: 'Official API returned HTTP 401.' });
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
