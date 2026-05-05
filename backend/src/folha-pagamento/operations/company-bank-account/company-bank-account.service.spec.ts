import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { CompanyBankAccountService } from './company-bank-account.service';

interface FakeRow {
  id: string;
  tenant_id: string;
  bank_id: string;
  bank_code: number;
  branch: string;
  branch_dv: string | null;
  account: string;
  account_dv: string;
  convenio: string;
  agency_agreement: string;
  modality: string;
  service_form_code: string;
  purpose_code_default: string | null;
  layout_version: string;
  relay_endpoint_url: string | null;
  relay_credential_secret_ref: string | null;
  relay_mode: 'mock' | 'http' | 'sftp';
  active: boolean;
}

interface FakeDatabaseService {
  configured: boolean;
  query: jest.Mock;
}

const baseRow: FakeRow = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: '00000000-0000-0000-0000-000000000010',
  bank_id: '00000000-0000-0000-0000-000000000011',
  bank_code: 1,
  branch: '1234',
  branch_dv: '5',
  account: '123456789',
  account_dv: '0',
  convenio: 'SGPBBPAGAMENTO',
  agency_agreement: '00001',
  modality: 'SALARIO',
  service_form_code: '0401',
  purpose_code_default: 'SALARIO',
  layout_version: 'CNAB240-FEBRABAN-10.11-BB',
  relay_endpoint_url: null,
  relay_credential_secret_ref: null,
  relay_mode: 'mock',
  active: true,
};

function makeDatabaseService(rows: FakeRow[]): FakeDatabaseService {
  return {
    configured: true,
    query: jest.fn().mockResolvedValue(rows),
  };
}

describe('CompanyBankAccountService', () => {
  describe('resolve', () => {
    it('returns the resolved row for a known bank + service form', async () => {
      const db = makeDatabaseService([baseRow]);
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );

      const resolved = await service.resolve({
        bankCode: '001',
        serviceFormCode: '0401',
      });

      expect(resolved).toEqual({
        id: baseRow.id,
        tenantId: baseRow.tenant_id,
        bankId: baseRow.bank_id,
        bankCode: '001',
        branch: '1234',
        branchDv: '5',
        account: '123456789',
        accountDv: '0',
        convenio: 'SGPBBPAGAMENTO',
        agencyAgreement: '00001',
        modality: 'SALARIO',
        serviceFormCode: '0401',
        purposeCodeDefault: 'SALARIO',
        layoutVersion: 'CNAB240-FEBRABAN-10.11-BB',
        relayEndpointUrl: null,
        relayCredentialSecretRef: null,
        relayMode: 'mock',
        active: true,
      });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, '0401']);
    });

    it('left-pads the bank code to 3 digits when comparing', async () => {
      const db = makeDatabaseService([baseRow]);
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );
      await service.resolve({ bankCode: '1', serviceFormCode: '0401' });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, '0401']);
    });

    it('strips non-digits from the input bank code', async () => {
      const db = makeDatabaseService([baseRow]);
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );
      await service.resolve({ bankCode: '00-1', serviceFormCode: '0401' });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, '0401']);
    });

    it('throws NotFoundException when no row matches', async () => {
      const db = makeDatabaseService([]);
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );
      await expect(
        service.resolve({ bankCode: '999', serviceFormCode: '0401' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when bank code is empty', async () => {
      const db = makeDatabaseService([baseRow]);
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );
      await expect(
        service.resolve({ bankCode: '', serviceFormCode: '0401' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ServiceUnavailableException when DB is not configured', async () => {
      const db = {
        configured: false,
        query: jest.fn(),
      } as unknown as DatabaseService;
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );
      await expect(
        service.resolve({ bankCode: '001', serviceFormCode: '0401' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('list', () => {
    it('returns all rows for the current tenant', async () => {
      const second: FakeRow = {
        ...baseRow,
        id: '00000000-0000-0000-0000-000000000002',
        bank_code: 104,
        convenio: 'SGPCAIXAFOLHA',
        modality: 'CREDITO',
        service_form_code: '0404',
        layout_version: 'CNAB240-FEBRABAN-10.11-CAIXA',
      };
      const db = makeDatabaseService([baseRow, second]);
      const service = new CompanyBankAccountService(
        db as unknown as DatabaseService,
      );

      const rows = await service.list();

      expect(rows).toHaveLength(2);
      expect(rows[0]!.bankCode).toBe('001');
      expect(rows[1]!.bankCode).toBe('104');
      expect(rows[1]!.convenio).toBe('SGPCAIXAFOLHA');
    });
  });
});
