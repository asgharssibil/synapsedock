import { describe, expect, it, vi } from 'vitest';
import { AiChatService } from './ai-chat';
import type { CredentialVault } from './credential-vault';
import type { ChatGptOAuth } from './chatgpt-oauth';
import type { ClaudeCliAdapter } from './claude-cli';

function service(fetcher: typeof fetch, keys: Record<string, string> = {}) {
  const vault = { get: (key: string) => keys[key] } as CredentialVault;
  const chatgpt = { getAccessToken: vi.fn().mockResolvedValue('oauth-token') } as unknown as ChatGptOAuth;
  const claude = { chat: vi.fn().mockResolvedValue('Claude response') } as unknown as ClaudeCliAdapter;
  return { chat: new AiChatService(vault, chatgpt, claude, fetcher), chatgpt, claude };
}

describe('AI chat service', () => {
  it('sends an OpenAI-compatible conversation with the encrypted API credential', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'Hello from model' } }] }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    const { chat } = service(fetcher, { 'deepseek:api-key': 'secret-key' });
    const result = await chat.send({ provider: 'deepseek', model: 'deepseek-chat', messages: [{ role: 'user', content: 'Hello' }] });
    expect(result.content).toBe('Hello from model');
    expect(fetcher).toHaveBeenCalledWith('https://api.deepseek.com/chat/completions', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer secret-key' }) }));
  });

  it('supports Anthropic and Google native response shapes', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ type: 'text', text: 'Claude API' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Gemini API' }] } }] }), { status: 200 })) as typeof fetch;
    const { chat } = service(fetcher, { 'anthropic:api-key': 'a', 'google:api-key': 'g' });
    await expect(chat.send({ provider: 'anthropic', model: 'claude-test', messages: [{ role: 'user', content: 'Hi' }] })).resolves.toMatchObject({ content: 'Claude API' });
    await expect(chat.send({ provider: 'google', model: 'gemini-test', messages: [{ role: 'user', content: 'Hi' }] })).resolves.toMatchObject({ content: 'Gemini API' });
  });

  it('uses ChatGPT OAuth and Claude subscription bridges without exposing tokens to the renderer', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: 'ChatGPT response' }), { status: 200 })) as typeof fetch;
    const { chat, chatgpt, claude } = service(fetcher);
    await expect(chat.send({ provider: 'chatgpt', model: 'gpt-test', messages: [{ role: 'user', content: 'Hi' }] })).resolves.toMatchObject({ content: 'ChatGPT response' });
    await expect(chat.send({ provider: 'claude-cli', model: 'subscription-default', messages: [{ role: 'user', content: 'Hi' }] })).resolves.toMatchObject({ content: 'Claude response' });
    expect(chatgpt.getAccessToken).toHaveBeenCalledOnce();
    expect(claude.chat).toHaveBeenCalledOnce();
  });

  it('rejects unconfigured providers and unsupported media providers', async () => {
    const { chat } = service(vi.fn() as unknown as typeof fetch);
    await expect(chat.send({ provider: 'openai', model: 'gpt-test', messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(/Connect this provider/);
    await expect(chat.send({ provider: 'runway', model: 'video', messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(/does not offer text chat/);
  });

  it('supports local Ollama and Cohere chat response formats', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: { content: 'Local answer' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: { content: [{ type: 'text', text: 'Cohere answer' }] } }), { status: 200 })) as typeof fetch;
    const { chat } = service(fetcher, { 'cohere:api-key': 'cohere-key' });
    await expect(chat.send({ provider: 'ollama', model: 'llama', messages: [{ role: 'user', content: 'Hi' }] })).resolves.toMatchObject({ content: 'Local answer' });
    await expect(chat.send({ provider: 'cohere', model: 'command', messages: [{ role: 'user', content: 'Hi' }] })).resolves.toMatchObject({ content: 'Cohere answer' });
  });

  it('surfaces bounded provider errors, empty responses and invalid conversations', async () => {
    const failed = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'bad model' } }), { status: 400 })) as typeof fetch;
    const { chat } = service(failed, { 'openai:api-key': 'key' });
    await expect(chat.send({ provider: 'openai', model: 'missing', messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('bad model');
    const empty = service(vi.fn().mockResolvedValue(new Response('{}', { status: 200 })) as typeof fetch, { 'openai:api-key': 'key' }).chat;
    await expect(empty.send({ provider: 'openai', model: 'gpt', messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('empty response');
    await expect(chat.send({ provider: 'openai', model: '', messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('valid model');
    await expect(chat.send({ provider: 'openai', model: 'gpt', messages: [] })).rejects.toThrow('empty or too long');
  });
});
