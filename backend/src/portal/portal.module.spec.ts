import { MODULE_METADATA } from '@nestjs/common/constants';

import { PadesAdapter } from '../external/signature/pades.adapter';
import { PdfABuilderService } from '../report-service/payslip/pdf-a-builder.service';
import { PayslipRenderService } from '../report-service/payslip/payslip-render.service';
import { ReportServiceModule } from '../report-service/report-service.module';
import { YearlyIncomeBatchService } from '../report-service/yearly-income/yearly-income-batch.service';
import { YearlyIncomeRenderService } from '../report-service/yearly-income/yearly-income-render.service';
import { PortalModule } from './portal.module';

describe('PortalModule', () => {
  it('imports ReportServiceModule instead of re-providing report rendering services', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      PortalModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PortalModule,
    ) as unknown[];
    const reportExports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ReportServiceModule,
    ) as unknown[];

    expect(imports).toContain(ReportServiceModule);
    expect(providers).not.toEqual(
      expect.arrayContaining([
        PadesAdapter,
        PdfABuilderService,
        PayslipRenderService,
        YearlyIncomeRenderService,
        YearlyIncomeBatchService,
      ]),
    );
    expect(reportExports).toEqual(
      expect.arrayContaining([
        PadesAdapter,
        PdfABuilderService,
        PayslipRenderService,
        YearlyIncomeRenderService,
        YearlyIncomeBatchService,
      ]),
    );
  });
});
