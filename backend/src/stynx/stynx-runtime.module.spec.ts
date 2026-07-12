import { Test } from '@nestjs/testing';
import { RequestContext } from '@stynx-nyx/core';
import { StynxHealthService, StynxMetricsService } from '@stynx-nyx/health';
import { StynxLogger } from '@stynx-nyx/logging';

import { SgpStynxRuntimeModule } from './stynx-runtime.module';

describe('SgpStynxRuntimeModule', () => {
  it.each([
    'sgp-core-api',
    'sgp-portal-api',
    'sgp-payroll-engine',
    'sgp-integrations-worker',
    'sgp-report-service',
    'sgp-report-worker',
  ])('boots the shared platform composition for %s', async (serviceName) => {
    const moduleRef = await Test.createTestingModule({
      imports: [SgpStynxRuntimeModule.forRoot({ serviceName })],
    }).compile();

    expect(moduleRef.get(RequestContext)).toBeDefined();
    expect(moduleRef.get(StynxLogger)).toBeDefined();
    expect(moduleRef.get(StynxHealthService)).toBeDefined();
    expect(moduleRef.get(StynxMetricsService)).toBeDefined();

    await moduleRef.close();
  });
});
