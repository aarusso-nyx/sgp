import { RequestContextStore } from '../../common/request-context/request-context.store';
import { PisPasepService } from './pis-pasep.service';

describe('PisPasepService', () => {
  it('recomputes annual base through payment.recompute_pis_pasep_base idempotently', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        employee_id: '22222222-2222-4222-8222-222222222222',
        registration: 'MAT-1',
        employee_name: 'Servidor CLT',
        cpf: '12345678901',
        year_base: 2026,
        program: 'PIS',
        monthly_base: {
          '01': '1000.00',
          '02': '0.00',
          '03': '0.00',
          '04': '0.00',
          '05': '0.00',
          '06': '0.00',
          '07': '0.00',
          '08': '0.00',
          '09': '0.00',
          '10': '0.00',
          '11': '0.00',
          '12': '250.50',
        },
        total_base: '1250.50',
        updated_at: '2026-05-02T00:00:00.000Z',
      },
    ]);
    const service = new PisPasepService({ configured: true, query } as never);

    const result = await RequestContextStore.run(
      {
        tenantId: '11111111-1111-4111-8111-111111111111',
        permissions: ['payroll.payroll.read', 'payroll.payroll.write'],
      },
      () => service.recomputeYear('22222222-2222-4222-8222-222222222222', 2026),
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('payment.recompute_pis_pasep_base'),
      [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        2026,
      ],
    );
    expect(result.program).toBe('PIS');
    expect(result.monthlyBase['12']).toBe('250.50');
    expect(result.totalBase).toBe('1250.50');
  });
});
