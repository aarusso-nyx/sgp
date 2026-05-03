import { MODULE_METADATA } from '@nestjs/common/constants';

import { FormulaCacheService } from '../payroll-engine/formula-cache.service';
import { FormulaCompilerService } from '../payroll-engine/formula-compiler.service';
import { PayrollEngineModule } from '../payroll-engine/payroll-engine.module';
import { PayrollEngineService } from '../payroll-engine/payroll-engine.service';
import { FolhaPagamentoModule } from './folha-pagamento.module';

describe('FolhaPagamentoModule', () => {
  it('imports PayrollEngineModule instead of re-providing engine services', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      FolhaPagamentoModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      FolhaPagamentoModule,
    ) as unknown[];
    const engineExports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PayrollEngineModule,
    ) as unknown[];

    expect(imports).toContain(PayrollEngineModule);
    expect(providers).not.toEqual(
      expect.arrayContaining([
        PayrollEngineService,
        FormulaCompilerService,
        FormulaCacheService,
      ]),
    );
    expect(engineExports).toEqual(
      expect.arrayContaining([
        PayrollEngineService,
        FormulaCompilerService,
        FormulaCacheService,
      ]),
    );
  });
});
