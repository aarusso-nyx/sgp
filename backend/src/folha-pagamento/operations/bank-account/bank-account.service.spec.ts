import { BankAccountService } from './bank-account.service';

describe('BankAccountService R2-206 encrypted storage path', () => {
  const employeeId = '00000000-0000-4000-8000-000000000001';
  const accountId = '00000000-0000-4000-8000-000000000002';
  const bankId = '00000000-0000-4000-8000-000000000003';

  it('writes through the base table and reads the inserted account number through the decrypt view', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: '00000000-0000-4000-8000-000000000100',
            employee_id: employeeId,
            employee_cpf: '52998224725',
            bank_id: bankId,
            bank_code: '001',
            dependent_id: null,
            dependent_cpf: null,
            payroll_credit_authorized: false,
            authorization_document_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: accountId,
            bank_code: '001',
            agency: '0001',
            agency_digit: null,
            account_number: '123456',
            account_digit: '6',
            holder_kind: 'SELF',
            holder_cpf: '52998224725',
            validation_status: 'VALID',
            validation_error_code: null,
            validated_at: '2026-05-03T10:00:00.000Z',
            updated_at: '2026-05-03T10:00:00.000Z',
          },
        ],
      });
    const service = createService(query);

    await service.create(employeeId, {
      bankCode: '001',
      agency: '0001',
      accountNumber: '123456',
      accountDigit: '6',
      holderKind: 'SELF',
      holderCpf: '52998224725',
    });

    expect(query.mock.calls[1][0]).toContain(
      'INSERT INTO hr.employee_bank_account',
    );
    expect(query.mock.calls[1][0]).toContain(
      'hr.v_employee_bank_account_pii_decrypted',
    );
    expect(query.mock.calls[1][1]).toContain('123456');
  });

  it('uses the decrypt view for revalidation reads', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: accountId,
            bank_id: bankId,
            bank_code: '001',
            agency: '0001',
            agency_digit: null,
            account_number: '123456',
            account_digit: '6',
            holder_kind: 'SELF',
            holder_cpf: '52998224725',
            validation_status: 'VALID',
            validation_error_code: null,
            validated_at: '2026-05-03T10:00:00.000Z',
            updated_at: '2026-05-03T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: accountId,
            bank_code: '001',
            agency: '0001',
            agency_digit: null,
            account_number: '123456',
            account_digit: '6',
            holder_kind: 'SELF',
            holder_cpf: '52998224725',
            validation_status: 'VALID',
            validation_error_code: null,
            validated_at: '2026-05-03T10:00:00.000Z',
            updated_at: '2026-05-03T10:00:00.000Z',
          },
        ],
      });
    const service = createService(query);

    await service.revalidate(employeeId, accountId);

    expect(query.mock.calls[0][0]).toContain(
      'hr.v_employee_bank_account_pii_decrypted',
    );
    expect(query.mock.calls[1][0]).toContain(
      'hr.v_employee_bank_account_pii_decrypted',
    );
  });
});

function createService(query: jest.Mock): BankAccountService {
  const database = {
    configured: true,
    transaction: (
      callback: (client: { query: jest.Mock }) => Promise<unknown>,
    ) => callback({ query }),
  };
  return new BankAccountService(
    database as never,
    {
      validate: jest.fn(() => ({ valid: true })),
    } as never,
  );
}
