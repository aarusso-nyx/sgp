import { EmployeeContractRegimeService } from './employee-contract-regime.service';
import { EmployeeReferenceDataService } from './employee-reference-data.service';
import { EmployeeVersionService } from './employee-version.service';

describe('EmployeeContractRegimeService', () => {
  it('rejects temporary regimes without an end date', async () => {
    const database = { configured: true };
    const service = new EmployeeContractRegimeService(
      database as never,
      new EmployeeReferenceDataService(),
      new EmployeeVersionService(database as never),
    );

    await expect(
      service.changeContractRegime('emp-1', {
        contractType: 'temporary',
        effectiveOn: '2026-05-01',
      }),
    ).rejects.toThrow('Temporary contracts require endDate');
  });
});
