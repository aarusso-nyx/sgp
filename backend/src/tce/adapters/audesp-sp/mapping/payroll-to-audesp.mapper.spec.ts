import { PayrollToAudespMapper } from './payroll-to-audesp.mapper';

describe('PayrollToAudespMapper', () => {
  it('maps an approved payroll run to deterministic AUDESP DTO', () => {
    const mapper = new PayrollToAudespMapper({} as never);

    const dto = mapper.mapRows(
      {
        id: 'run-1',
        tenant_id: 'tenant-1',
        status: 'APPROVED',
        competence_year: 2026,
        competence_month: 4,
        organization_code: '3550308',
      },
      [
        item(
          'emp-2',
          'MAT-002',
          '222.333.444-05',
          'Professor',
          'EARNING',
          '4200.00',
        ),
        item(
          'emp-1',
          'MAT-001',
          '111.222.333-44',
          'Analista',
          'EARNING',
          '3000.00',
        ),
        item(
          'emp-1',
          'MAT-001',
          '111.222.333-44',
          'Analista',
          'DEDUCTION',
          '330.00',
        ),
      ],
    );

    expect(dto).toEqual({
      adapterId: 'audesp-sp',
      layoutCode: 'AUDESP-FOLHA',
      layoutVersion: '0.0.1',
      tenantId: 'tenant-1',
      payrollRunId: 'run-1',
      organizationCode: '3550308',
      competenceYear: 2026,
      competenceMonth: 4,
      shipmentKind: 'FOLHA_PAGAMENTO',
      generatedAt: '2026-05-02T00:00:00.000Z',
      servers: [
        {
          employeeId: 'emp-1',
          registration: 'MAT-001',
          cpf: '11122233344',
          position: 'Analista',
          earnings: '3000.00',
          deductions: '330.00',
          net: '2670.00',
        },
        {
          employeeId: 'emp-2',
          registration: 'MAT-002',
          cpf: '22233344405',
          position: 'Professor',
          earnings: '4200.00',
          deductions: '0.00',
          net: '4200.00',
        },
      ],
    });
  });
});

function item(
  employeeId: string,
  registration: string,
  cpf: string,
  positionName: string,
  entryKind: 'EARNING' | 'DEDUCTION' | 'INFORMATION' | 'BASE',
  amount: string,
) {
  return {
    employee_id: employeeId,
    registration,
    cpf,
    position_name: positionName,
    entry_kind: entryKind,
    amount,
  };
}
