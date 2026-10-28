import type { ConnectionInput, CreateTaskInput } from '../src/shared/api';

export const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

export const cleanText = (value: unknown, max: number): string => {
  if (typeof value !== 'string') throw new Error('Invalid text input.');
  const result = value.trim();
  if (!result || result.length > max) throw new Error('Text input is empty or too long.');
  return result;
};

export function parseTaskInput(raw: unknown): CreateTaskInput {
  if (!isRecord(raw)) throw new Error('Invalid task payload.');
  return { title: cleanText(raw.title, 120), goal: cleanText(raw.goal, 4000), freeOnly: raw.freeOnly === true };
}

export function parseConnectionInput(raw: unknown): ConnectionInput {
  if (!isRecord(raw) || !['openai', 'google', 'xai'].includes(String(raw.provider))) throw new Error('Unsupported provider.');
  return { provider: raw.provider as ConnectionInput['provider'], apiKey: cleanText(raw.apiKey, 500) };
}
