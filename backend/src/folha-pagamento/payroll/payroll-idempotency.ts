export const ACTIVE_PAYROLL_ITEM_IDEMPOTENCY_CONSTRAINT =
  'employee_payroll_item_active_idempotency_uq';

type DatabaseConstraintError = {
  code?: unknown;
  constraint?: unknown;
};

function isDatabaseConstraintError(
  error: unknown,
): error is DatabaseConstraintError {
  return Boolean(error && typeof error === 'object');
}

export function isActivePayrollItemIdempotencyConflict(
  error: unknown,
): boolean {
  return (
    isDatabaseConstraintError(error) &&
    error.code === '23505' &&
    error.constraint === ACTIVE_PAYROLL_ITEM_IDEMPOTENCY_CONSTRAINT
  );
}
