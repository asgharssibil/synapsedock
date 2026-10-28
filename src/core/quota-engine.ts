import type { Availability, QuotaAssessment, QuotaThresholds, QuotaWindow } from './types';

const knownPercent = (window: QuotaWindow): window is QuotaWindow & { usedPercent: number } =>
  typeof window.usedPercent === 'number' && Number.isFinite(window.usedPercent);

export function assessQuota(
  availability: Availability,
  windows: QuotaWindow[],
  thresholds: QuotaThresholds,
): QuotaAssessment {
  if (availability === 'revoked') {
    return { state: availability, action: 'wait', reason: 'Provider access was revoked.' };
  }
  if (availability === 'exhausted' || availability === 'reset-pending') {
    const next = nearestReset(windows);
    return {
      state: availability,
      action: 'switch',
      limitingWindow: next,
      reason: availability === 'exhausted' ? 'Provider reported exhausted quota.' : 'Quota reset is pending verification.',
    };
  }

  const measured = windows.filter(knownPercent).sort((a, b) => b.usedPercent - a.usedPercent);
  const limiting = measured[0];
  if (!limiting) {
    return {
      state: availability,
      action: availability === 'limited' ? 'warn' : 'continue',
      reason: 'No verified percentage is available; routing uses provider status and errors only.',
    };
  }

  const used = Math.max(0, Math.min(100, limiting.usedPercent));
  if (used >= thresholds.emergency) return result('switch', 'Emergency quota threshold reached.');
  if (used >= thresholds.switch) return result('switch', 'Safe-switch quota threshold reached.');
  if (used >= thresholds.prepare) return result('prepare', 'Prepare a checkpoint and warm the next provider.');
  if (used >= thresholds.warn) return result('warn', 'Quota warning threshold reached.');
  if (used >= thresholds.observe) return result('observe', 'Quota observation threshold reached.');
  return result('continue', 'Quota is within configured limits.');

  function result(action: QuotaAssessment['action'], reason: string): QuotaAssessment {
    return { state: availability, action, effectiveUsedPercent: used, limitingWindow: limiting, reason };
  }
}

export function nearestReset(windows: QuotaWindow[]): QuotaWindow | undefined {
  return windows
    .filter((window) => window.resetAt && !Number.isNaN(Date.parse(window.resetAt)))
    .sort((a, b) => Date.parse(a.resetAt!) - Date.parse(b.resetAt!))[0];
}
