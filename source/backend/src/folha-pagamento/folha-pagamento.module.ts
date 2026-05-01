import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PayrollAccountingController } from './accounting/payroll-accounting.controller';
import { PayrollAccountingService } from './accounting/payroll-accounting.service';
import { RubricaController } from './accounting/rubrica/rubrica.controller';
import { RubricaService } from './accounting/rubrica/rubrica.service';
import { ESocialController } from './esocial/esocial.controller';
import { ESocialService } from './esocial/esocial.service';
import {
  PayrollGfipController,
  PayrollOperationsController,
} from './operations/payroll-operations.controller';
import { PayrollOperationsService } from './operations/payroll-operations.service';
import { PayrollController } from './payroll/payroll.controller';
import { DecimoTerceiroService } from './payroll/decimo-terceiro.service';
import { FeriasPayrollService } from './payroll/ferias-payroll.service';
import { PayrollService } from './payroll/payroll.service';
import { FormulaCacheService } from '../payroll-engine/formula-cache.service';
import { FormulaCompilerService } from '../payroll-engine/formula-compiler.service';
import { PayrollEngineService } from '../payroll-engine/payroll-engine.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    PayrollController,
    PayrollAccountingController,
    RubricaController,
    ESocialController,
    PayrollOperationsController,
    PayrollGfipController,
  ],
  providers: [
    PayrollService,
    DecimoTerceiroService,
    FeriasPayrollService,
    PayrollAccountingService,
    RubricaService,
    PayrollOperationsService,
    ESocialService,
    PayrollEngineService,
    FormulaCompilerService,
    FormulaCacheService,
  ],
})
export class FolhaPagamentoModule {}
