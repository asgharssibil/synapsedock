export type OperationState = 'reserved' | 'unknown-outcome' | 'succeeded' | 'failed-safe-to-retry';

export function mayExecuteExternalOperation(previous: OperationState | undefined): boolean {
  return previous === undefined || previous === 'failed-safe-to-retry';
}

export function requiresReconciliation(previous: OperationState | undefined): boolean {
  return previous === 'reserved' || previous === 'unknown-outcome';
}
