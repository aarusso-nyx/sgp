import {
  ACTIVE_PAYROLL_ITEM_IDEMPOTENCY_CONSTRAINT,
  isActivePayrollItemIdempotencyConflict,
} from './payroll-idempotency';

describe('payroll idempotency helpers', () => {
  it('detects active payroll item idempotency unique violations', () => {
    expect(
      isActivePayrollItemIdempotencyConflict({
        code: '23505',
        constraint: ACTIVE_PAYROLL_ITEM_IDEMPOTENCY_CONSTRAINT,
      }),
    ).toBe(true);
  });

  it('rejects unrelated database and non-database errors', () => {
    expect(
      isActivePayrollItemIdempotencyConflict({
        code: '23505',
        constraint: 'other_unique_constraint',
      }),
    ).toBe(false);
    expect(
      isActivePayrollItemIdempotencyConflict({
        code: '23503',
        constraint: ACTIVE_PAYROLL_ITEM_IDEMPOTENCY_CONSTRAINT,
      }),
    ).toBe(false);
    expect(isActivePayrollItemIdempotencyConflict(new Error('boom'))).toBe(
      false,
    );
    expect(isActivePayrollItemIdempotencyConflict(null)).toBe(false);
  });
});
