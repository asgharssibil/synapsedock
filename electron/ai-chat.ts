import type { ChatMessage, ChatProviderId, ChatRequest, ChatResponse } from '../src/shared/api';
import type { CredentialVault } from './credential-vault';
import type { ChatGptOAuth } from './chatgpt-oauth';
import type { ClaudeCliAdapter } from './claude-cli';

export const DEFAULT_CHAT_MODELS: Record<ChatProviderId, string> = {
  chatgpt: 'gpt-5.1',
  'claude-cli': 'subscription-default',
  openai: 'gpt-5.1', anthropic: 'claude-sonnet-4-5', google: 'gemini-2.5-flash', xai: 'grok-4-latest',
  mistral: 'mistral-small-latest', cohere: 'command-a-03-2025', deepseek: 'deepseek-chat', kimi: 'kimi-k2-0711-preview',
  openrouter: 'openai/gpt-4.1-mini', groq: 'llama-3.3-70b-versatile', together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  huggingface: 'Qwen/Qwen3-32B', replicate: '', stability: '', runway: '', elevenlabs: '', ollama: 'llama3.2',
};

const OPENAI_COMPATIBLE: Partial<Record<ChatProviderId, string>> = {
  openai: 'https://api.openai.com/v1/chat/completions', xai: 'https://api.x.ai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions', deepseek: 'https://api.deepseek.com/chat/completions',
  kimi: 'https://api.moonshot.ai/v1/chat/completions', openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions', together: 'https://api.together.xyz/v1/chat/completions',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
};

type Fetcher = typeof fetch;

function validate(input: ChatRequest): ChatRequest {
  if (!input || typeof input !== 'object' || !(input.provider in DEFAULT_CHAT_MODELS)) throw new Error('Unsupported chat provider.');
  if (!DEFAULT_CHAT_MODELS[input.provider] && !['ollama', 'claude-cli'].includes(input.provider)) throw new Error('This provider does not offer text chat in SynapseDock.');
  const model = typeof input.model === 'string' ? input.model.trim() : '';
  if (!model || model.length > 200) throw new Error('Choose a valid model.');
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 40) throw new Error('Conversation is empty or too long.');
  let total = 0;
  const messages: ChatMessage[] = input.messages.map((message) => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') throw new Error('Invalid chat message.');
    const content = message.content.trim(); total += content.length;
    if (!content || content.length > 100_000) throw new Error('A chat message is empty or too long.');
    return { role: message.role, content };
  });
  if (total > 250_000) throw new Error('Conversation context is too large.');
  return { provider: input.provider, model, messages };
}

function openAiText(body: Record<string, unknown>): string | undefined {
  const choices = body.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  return typeof message?.content === 'string' ? message.content : undefined;
}

function responsesText(body: Record<string, unknown>): string | undefined {
  if (typeof body.output_text === 'string') return body.output_text;
  const output = body.output as Array<Record<string, unknown>> | undefined;
  return output?.flatMap((item) => (item.content as Array<Record<string, unknown>> | undefined) ?? [])
    .map((item) => typeof item.text === 'string' ? item.text : '').filter(Boolean).join('\n') || undefined;
}

async function parsedResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = body.error as Record<string, unknown> | string | undefined;
    const message = typeof error === 'string' ? error : typeof error?.message === 'string' ? error.message : `HTTP ${response.status}`;
    throw new Error(`Provider request failed: ${message.slice(0, 400)}`);
  }
  return body;
}

export class AiChatService {
  constructor(
    private readonly vault: CredentialVault,
    private readonly chatGpt: ChatGptOAuth,
    private readonly claude: ClaudeCliAdapter,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async send(raw: ChatRequest): Promise<ChatResponse> {
    const input = validate(raw);
    if (input.provider === 'claude-cli') return { provider: input.provider, model: input.model, content: await this.claude.chat(input.messages) };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const { url, headers, body, extract } = await this.request(input);
      const response = await this.fetcher(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      const parsed = await parsedResponse(response);
      const content = extract(parsed)?.trim();
      if (!content) throw new Error('Provider returned an empty response.');
      return { provider: input.provider, model: input.model, content };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Provider response timed out.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  private async request(input: ChatRequest): Promise<{ url: string; headers: Record<string, string>; body: unknown; extract: (body: Record<string, unknown>) => string | undefined }> {
    const json = { 'content-type': 'application/json' };
    if (input.provider === 'chatgpt') {
      const token = await this.chatGpt.getAccessToken();
      return { url: 'https://api.openai.com/v1/responses', headers: { ...json, Authorization: `Bearer ${token}` }, body: { model: input.model, input: input.messages, store: false }, extract: responsesText };
    }
    if (input.provider === 'ollama') {
      return { url: 'http://127.0.0.1:11434/api/chat', headers: json, body: { model: input.model, messages: input.messages, stream: false }, extract: (body) => {
        const message = body.message as Record<string, unknown> | undefined; return typeof message?.content === 'string' ? message.content : undefined;
      } };
    }
    const key = this.vault.get(`${input.provider}:api-key`);
    if (!key) throw new Error('Connect this provider in Settings before chatting.');
    if (input.provider === 'anthropic') return {
      url: 'https://api.anthropic.com/v1/messages', headers: { ...json, 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: { model: input.model, max_tokens: 4096, messages: input.messages },
      extract: (body) => (body.content as Array<Record<string, unknown>> | undefined)?.map((item) => item.type === 'text' ? String(item.text ?? '') : '').join('\n'),
    };
    if (input.provider === 'google') return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`, headers: { ...json, 'x-goog-api-key': key },
      body: { contents: input.messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })) },
      extract: (body) => {
        const candidates = body.candidates as Array<Record<string, unknown>> | undefined;
        const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
        return (content?.parts as Array<Record<string, unknown>> | undefined)?.map((part) => String(part.text ?? '')).join('\n');
      },
    };
    if (input.provider === 'cohere') return {
      url: 'https://api.cohere.com/v2/chat', headers: { ...json, Authorization: `Bearer ${key}` }, body: { model: input.model, messages: input.messages },
      extract: (body) => {
        const message = body.message as Record<string, unknown> | undefined;
        return (message?.content as Array<Record<string, unknown>> | undefined)?.map((item) => String(item.text ?? '')).join('\n');
      },
    };
    const url = OPENAI_COMPATIBLE[input.provider];
    if (!url) throw new Error('This provider is not a text-chat provider.');
    const headers: Record<string, string> = { ...json, Authorization: `Bearer ${key}` };
    if (input.provider === 'openrouter') { headers['HTTP-Referer'] = 'https://github.com/asgharssibil/synapsedock'; headers['X-Title'] = 'SynapseDock'; }
    return { url, headers, body: { model: input.model, messages: input.messages, stream: false }, extract: openAiText };
  }
}
