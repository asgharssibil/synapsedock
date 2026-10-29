import { describe, expect, it } from 'vitest';
import { parseConnectionInput, parseTaskInput } from './validation';

describe('IPC boundary validation', () => {
  it('trims valid task input and does not coerce free-only values', () => {
    expect(parseTaskInput({ title: '  Test  ', goal: '  Goal  ', freeOnly: 'true' })).toEqual({ title: 'Test', goal: 'Goal', freeOnly: false });
  });

  it('rejects empty and oversized task input', () => {
    expect(() => parseTaskInput({ title: ' ', goal: 'x', freeOnly: true })).toThrow();
    expect(() => parseTaskInput({ title: 'x'.repeat(121), goal: 'x', freeOnly: true })).toThrow();
  });

  it('rejects unallowlisted providers and oversized credentials', () => {
    expect(() => parseConnectionInput({ provider: 'browser-cookie-scraper', apiKey: 'secret' })).toThrow('Unsupported provider');
    expect(parseConnectionInput({ provider: 'anthropic', apiKey: 'secret' })).toEqual({ provider: 'anthropic', apiKey: 'secret' });
    expect(() => parseConnectionInput({ provider: 'openai', apiKey: 'x'.repeat(501) })).toThrow();
  });
});
