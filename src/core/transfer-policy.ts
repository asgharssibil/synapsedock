export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'secret';

export interface TransferDecision {
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
}

export function evaluateProviderTransfer(
  sensitivity: DataSensitivity,
  sameTrustBoundary: boolean,
  explicitApproval: boolean,
): TransferDecision {
  if (sensitivity === 'secret') {
    return { allowed: false, approvalRequired: true, reason: 'Secret data cannot leave its configured trust boundary.' };
  }
  if (sensitivity === 'confidential' && !sameTrustBoundary && !explicitApproval) {
    return { allowed: false, approvalRequired: true, reason: 'Confidential cross-provider transfer requires explicit approval.' };
  }
  return { allowed: true, approvalRequired: false, reason: 'Transfer satisfies the active data policy.' };
}
