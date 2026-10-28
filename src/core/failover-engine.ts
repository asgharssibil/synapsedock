import { assessQuota, nearestReset } from './quota-engine';
import type { ProviderAccount, QuotaThresholds, RoutingDecision, TaskRequirements } from './types';

export function routeTask(
  accounts: ProviderAccount[],
  currentAccountId: string | undefined,
  requirements: TaskRequirements,
  thresholds: QuotaThresholds,
  now = new Date(),
): RoutingDecision {
  const ordered = [...accounts].sort((a, b) => a.priority - b.priority);
  const compatible = ordered.filter((account) => {
    if (!account.connected || account.availability === 'revoked') return false;
    if (requirements.freeOnly && account.paid) return false;
    return requirements.capabilities.every((capability) => account.capabilities.includes(capability));
  });

  const current = compatible.find((account) => account.id === currentAccountId);
  if (current) {
    const assessment = assessQuota(current.availability, current.quotaWindows, thresholds);
    if (!['switch', 'wait'].includes(assessment.action)) {
      return {
        action: 'continue',
        selectedAccountId: current.id,
        checkpointRequired: assessment.action === 'prepare',
        reason: assessment.reason,
      };
    }
  }

  const candidate = compatible.find((account) => {
    if (account.id === currentAccountId) return false;
    const assessment = assessQuota(account.availability, account.quotaWindows, thresholds);
    return !['switch', 'wait'].includes(assessment.action);
  });

  if (candidate) {
    return {
      action: currentAccountId ? 'switch' : 'continue',
      selectedAccountId: candidate.id,
      checkpointRequired: Boolean(currentAccountId),
      reason: currentAccountId
        ? `Current provider cannot continue safely; switching to ${candidate.displayName}.`
        : `Selected highest-priority compatible provider: ${candidate.displayName}.`,
    };
  }

  const nowMs = now.getTime();
  const resets = compatible.flatMap((account) => {
    const window = nearestReset(account.quotaWindows);
    return window?.resetAt && Date.parse(window.resetAt) > nowMs ? [window.resetAt] : [];
  });
  const retryAt = resets.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? new Date(nowMs + 60_000).toISOString();
  return {
    action: 'wait',
    checkpointRequired: Boolean(currentAccountId),
    retryAt,
    reason: resets.length
      ? 'All compatible providers are unavailable; task queued until the earliest verified reset.'
      : 'No future verified reset is available; task queued with backoff and must re-verify access.',
  };
}
