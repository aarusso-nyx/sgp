import { TransparencyCsvService } from './transparency-csv.service';

describe('TransparencyCsvService', () => {
  it('exports UTF-8 BOM CSV with exactly the snapshot view columns', async () => {
    const service = new TransparencyCsvService({
      list: jest.fn().mockResolvedValue({
        items: [
          {
            tenantId: 'tenant-1',
            competence: '2026-04-01',
            employeePublicId: 'pub-1',
            fullName: 'Ana Silva',
            registrationNumber: 'MAT-1',
            positionName: 'Analista',
            organizationalUnit: 'Administracao',
            grossTotal: '1000.00',
            deductionsTotal: '100.00',
            netTotal: '900.00',
            snapshotTakenAt: '2026-05-02 00:00:00+00',
          },
        ],
      }),
    } as never);

    const csv = await service.export('tenant-1', {});

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split('\n')[0].replace(/^\uFEFF/, '')).toBe(
      'tenant_id,competence,employee_public_id,full_name,registration_number,position_name,organizational_unit,gross_total,deductions_total,net_total,snapshot_taken_at',
    );
  });
});
