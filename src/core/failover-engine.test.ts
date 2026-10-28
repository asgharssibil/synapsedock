import { describe, expect, it } from 'vitest';
import { routeTask } from './failover-engine';
import { assessQuota } from './quota-engine';
import { mayExecuteExternalOperation, requiresReconciliation } from './operation-guard';
import { DEFAULT_THRESHOLDS, type ProviderAccount } from './types';

const account = (overrides: Partial<ProviderAccount>): ProviderAccount => ({
  id: 'gpt', provider: 'mock', displayName: 'GPT simulation', plan: 'Mock', model: 'mock-gpt',
  connectionMethod: 'mock-simulation', availability: 'available', connected: true,
  capabilities: ['chat', 'code', 'streaming'], quotaWindows: [], paid: false, priority: 1,
  simulation: true, ...overrides,
});

describe('quota-aware failover', () => {
  it('prepares a checkpoint at 90 percent without switching early', () => {
    const result = assessQuota('available', [{ kind: 'five-hour', usedPercent: 90, source: 'mock-simulation', confidence: 'verified' }], DEFAULT_THRESHOLDS);
    expect(result.action).toBe('prepare');
  });

  it('switches from an exhausted provider to a compatible next provider', () => {
    const result = routeTask([
      account({ availability: 'exhausted', quotaWindows: [{ kind: 'weekly', usedPercent: 100, source: 'mock-simulation', confidence: 'verified' }] }),
      account({ id: 'claude', displayName: 'Claude simulation', priority: 2 }),
    ], 'gpt', { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result).toMatchObject({ action: 'switch', selectedAccountId: 'claude', checkpointRequired: true });
  });

  it('queues all-exhausted tasks at the earliest verified reset', () => {
    const later = '2030-01-02T00:00:00.000Z';
    const sooner = '2030-01-01T00:00:00.000Z';
    const result = routeTask([
      account({ availability: 'exhausted', quotaWindows: [{ kind: 'daily', resetAt: later, source: 'mock-simulation', confidence: 'verified' }] }),
      account({ id: 'claude', availability: 'reset-pending', priority: 2, quotaWindows: [{ kind: 'five-hour', resetAt: sooner, source: 'mock-simulation', confidence: 'verified' }] }),
    ], 'gpt', { capabilities: ['code'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result).toMatchObject({ action: 'wait', retryAt: sooner, checkpointRequired: true });
  });

  it('does not fabricate percentages when usage is unavailable', () => {
    const result = assessQuota('unknown', [], DEFAULT_THRESHOLDS);
    expect(result.effectiveUsedPercent).toBeUndefined();
    expect(result.reason).toContain('No verified percentage');
  });

  it('rejects a provider missing a required tool capability', () => {
    const result = routeTask([
      account({ capabilities: ['chat'], availability: 'available' }),
      account({ id: 'local', provider: 'ollama', displayName: 'Local', capabilities: ['chat', 'code', 'tools', 'local'], priority: 2 }),
    ], 'gpt', { capabilities: ['tools'], freeOnly: true }, DEFAULT_THRESHOLDS);
    expect(result.selectedAccountId).toBe('local');
  });
});

describe('external operation idempotency', () => {
  it('blocks retries with an unknown outcome until reconciliation', () => {
    expect(mayExecuteExternalOperation('unknown-outcome')).toBe(false);
    expect(requiresReconciliation('unknown-outcome')).toBe(true);
    expect(mayExecuteExternalOperation('failed-safe-to-retry')).toBe(true);
  });
});
