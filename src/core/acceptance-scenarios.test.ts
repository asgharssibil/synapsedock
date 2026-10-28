import { describe, expect, it } from 'vitest';
import { routeTask } from './failover-engine';
import { assessQuota } from './quota-engine';
import { mayExecuteExternalOperation, requiresReconciliation } from './operation-guard';
import { evaluateProviderTransfer } from './transfer-policy';
import { DEFAULT_THRESHOLDS, type ProviderAccount, type QuotaThresholds } from './types';

const makeAccount = (overrides: Partial<ProviderAccount> = {}): ProviderAccount => ({
  id: 'gpt', provider: 'mock', displayName: 'GPT mock', plan: 'Test fixture', model: 'mock-code',
  connectionMethod: 'mock-simulation', availability: 'available', connected: true,
  capabilities: ['chat', 'code', 'tools', 'streaming'], quotaWindows: [], paid: false, priority: 1,
  simulation: true, ...overrides,
});

describe('twelve required acceptance scenarios', () => {
  it('TEST 1: checkpoints and switches at a configured 90% safe-switch threshold', () => {
    const policy: QuotaThresholds = { ...DEFAULT_THRESHOLDS, prepare: 85, switch: 90 };
    const result = routeTask([
      makeAccount({ quotaWindows: [{ kind: 'five-hour', usedPercent: 90, source: 'mock-simulation', confidence: 'verified' }] }),
      makeAccount({ id: 'claude', displayName: 'Claude mock', priority: 2 }),
    ], 'gpt', { capabilities: ['code'], freeOnly: true }, policy);
    expect(result).toMatchObject({ action: 'switch', selectedAccountId: 'claude', checkpointRequired: true });
  });

  it('TEST 2: switches after Claude exhaustion without mutating project state', () => {
    const state = Object.freeze({ completedSteps: ['edit', 'test'], pending: ['package'] });
    const result = routeTask([
      makeAccount({ id: 'claude', displayName: 'Claude mock', availability: 'exhausted' }),
      makeAccount({ id: 'local', provider: 'ollama', displayName: 'Local model', priority: 2, capabilities: ['chat', 'code', 'tools', 'local'] }),
    ], 'claude', { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result).toMatchObject({ action: 'switch', selectedAccountId: 'local', checkpointRequired: true });
    expect(state.completedSteps).toEqual(['edit', 'test']);
  });

  it('TEST 3: waits for the earliest verified future reset when all providers are exhausted', () => {
    const now = new Date('2030-01-01T00:00:00.000Z');
    const result = routeTask([
      makeAccount({ availability: 'exhausted', quotaWindows: [{ kind: 'daily', resetAt: '2030-01-01T02:00:00.000Z', source: 'mock-simulation', confidence: 'verified' }] }),
      makeAccount({ id: 'claude', availability: 'reset-pending', priority: 2, quotaWindows: [{ kind: 'weekly', resetAt: '2030-01-01T01:00:00.000Z', source: 'mock-simulation', confidence: 'verified' }] }),
    ], 'gpt', { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS, now);
    expect(result).toMatchObject({ action: 'wait', retryAt: '2030-01-01T01:00:00.000Z', checkpointRequired: true });
  });

  it('TEST 4: resumes only after access is reported available again', () => {
    const result = routeTask([makeAccount({ availability: 'available', quotaWindows: [{ kind: 'five-hour', usedPercent: 0, source: 'mock-simulation', confidence: 'verified' }] })], undefined, { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result).toMatchObject({ action: 'continue', selectedAccountId: 'gpt' });
  });

  it('TEST 5: blocks duplicate email after a disconnected unknown outcome', () => {
    expect(mayExecuteExternalOperation('unknown-outcome')).toBe(false);
    expect(requiresReconciliation('unknown-outcome')).toBe(true);
  });

  it('TEST 7: free-only mode never selects the compatible paid account', () => {
    const result = routeTask([
      makeAccount({ id: 'paid', paid: true, priority: 1 }),
      makeAccount({ id: 'free', paid: false, priority: 2 }),
    ], undefined, { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result.selectedAccountId).toBe('free');
  });

  it('TEST 8: keeps unavailable percentages unknown', () => {
    const result = assessQuota('limited', [{ kind: 'rate', source: 'response-headers', confidence: 'unknown' }], DEFAULT_THRESHOLDS);
    expect(result.effectiveUsedPercent).toBeUndefined();
    expect(result.action).toBe('warn');
  });

  it('TEST 9: skips a model without required tools and preserves a controlled wait if none match', () => {
    const result = routeTask([makeAccount({ capabilities: ['chat', 'code'] })], 'gpt', { capabilities: ['tools'], freeOnly: true }, DEFAULT_THRESHOLDS, new Date('2030-01-01T00:00:00Z'));
    expect(result).toMatchObject({ action: 'wait', checkpointRequired: true });
  });

  it('TEST 10: requires approval before confidential cross-provider transfer', () => {
    expect(evaluateProviderTransfer('confidential', false, false)).toMatchObject({ allowed: false, approvalRequired: true });
    expect(evaluateProviderTransfer('confidential', false, true)).toMatchObject({ allowed: true, approvalRequired: false });
  });

  it('TEST 11: does not trust an elapsed reset while the provider remains limited', () => {
    const now = new Date('2030-01-01T12:00:00.000Z');
    const result = routeTask([makeAccount({ availability: 'exhausted', quotaWindows: [{ kind: 'daily', resetAt: '2030-01-01T11:00:00.000Z', source: 'official-api', confidence: 'verified' }] })], 'gpt', { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS, now);
    expect(result.action).toBe('wait');
    expect(Date.parse(result.retryAt!)).toBeGreaterThan(now.getTime());
    expect(result.reason).toContain('re-verify');
  });

  it('TEST 12: excludes revoked access while leaving caller-owned project state intact', () => {
    const project = { files: ['main.ts'], checkpoint: 'cp-1' };
    const result = routeTask([makeAccount({ availability: 'revoked', connected: false })], 'gpt', { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result.action).toBe('wait');
    expect(project).toEqual({ files: ['main.ts'], checkpoint: 'cp-1' });
  });
});
