import { LgpdLegalBasisService } from './legal-basis.service';
import { LGPD_DATA_FLOWS } from './legal-basis.registry';

describe('LgpdLegalBasisService', () => {
  it('falls back to the canonical static registry when DATABASE_URL is absent', async () => {
    const service = new LgpdLegalBasisService({
      configured: false,
      query: jest.fn(),
    } as never);

    await expect(
      service.assertPiiReadAllowed(LGPD_DATA_FLOWS.PAYROLL_PAYSLIP_PDF),
    ).resolves.toMatchObject({
      flowKey: LGPD_DATA_FLOWS.PAYROLL_PAYSLIP_PDF,
      legalBasisCode: 'LGPD_ART_7_II',
      sensitiveBasisCode: 'LGPD_ART_11_II_A',
      requiresDpia: true,
    });
  });

  it('references the DB rule table before allowing configured PII reads', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        flow_key: LGPD_DATA_FLOWS.FISCAL_YEARLY_INCOME_PDF,
        flow_name: 'Annual income and withholding certificate',
        data_category: 'MIXED',
        legal_basis_code: 'LGPD_ART_7_II',
        legal_basis_article: 'LGPD art. 7, II',
        sensitive_basis_code: 'LGPD_ART_11_II_A',
        sensitive_basis_article: 'LGPD art. 11, II, a',
        purpose: 'Generate annual income certificate.',
        data_subjects: ['public employee'],
        data_categories: ['CPF', 'income'],
        source_tables: ['fiscal.v_yearly_income'],
        read_surfaces: ['report-service/yearly-income'],
        retention_rule: '10 years',
        sharing_scope: 'internal_employee_portal',
        requires_consent: false,
        requires_dpia: true,
        decision_record_anchor: 'ADR-LGPD-002',
      },
    ]);
    const service = new LgpdLegalBasisService({
      configured: true,
      query,
    } as never);

    await expect(
      service.assertPiiReadAllowed(LGPD_DATA_FLOWS.FISCAL_YEARLY_INCOME_PDF),
    ).resolves.toMatchObject({
      sourceTables: ['fiscal.v_yearly_income'],
      readSurfaces: ['report-service/yearly-income'],
    });
    expect(query.mock.calls[0][0]).toContain('FROM lgpd.legal_basis_rule');
    expect(query.mock.calls[0][1]).toEqual([
      LGPD_DATA_FLOWS.FISCAL_YEARLY_INCOME_PDF,
    ]);
  });

  it('blocks unknown or inactive data-flow keys', async () => {
    const service = new LgpdLegalBasisService({
      configured: true,
      query: jest.fn().mockResolvedValue([]),
    } as never);

    await expect(service.assertPiiReadAllowed('unknown.flow')).rejects.toThrow(
      'Unknown LGPD data flow',
    );
    await expect(
      service.assertPiiReadAllowed(LGPD_DATA_FLOWS.PAYROLL_PAYSLIP_PDF),
    ).rejects.toThrow('LGPD legal basis is not active');
  });
});
