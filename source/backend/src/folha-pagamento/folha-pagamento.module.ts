import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ESocialWorkerModule } from '../esocial-worker/esocial-worker.module';
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
import { BankAccountController } from './operations/bank-account/bank-account.controller';
import { BankAccountService } from './operations/bank-account/bank-account.service';
import { BankAccountValidatorService } from './operations/bank-account/bank-account-validator.service';
import { ConsignmentController } from './operations/consignment/consignment.controller';
import { ConsignmentDeductionService } from './operations/consignment/consignment-deduction.service';
import { ConsignmentLoanService } from './operations/consignment/consignment-loan.service';
import { MarginCalculatorService } from './operations/consignment/margin-calculator.service';
import { PayrollController } from './payroll/payroll.controller';
import { DecimoTerceiroService } from './payroll/decimo-terceiro.service';
import { FeriasPayrollService } from './payroll/ferias-payroll.service';
import { FolhaMensalService } from './payroll/folha-mensal.service';
import { PayrollService } from './payroll/payroll.service';
import { RescisaoService } from './rescisao/rescisao.service';
import { SimulacaoController } from './simulacao/simulacao.controller';
import { SimulacaoService } from './simulacao/simulacao.service';
import { FormulaCacheService } from '../payroll-engine/formula-cache.service';
import { FormulaCompilerService } from '../payroll-engine/formula-compiler.service';
import { PayrollEngineService } from '../payroll-engine/payroll-engine.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, ESocialWorkerModule],
  controllers: [
    PayrollController,
    PayrollAccountingController,
    RubricaController,
    ESocialController,
    PayrollOperationsController,
    PayrollGfipController,
    BankAccountController,
    ConsignmentController,
    SimulacaoController,
  ],
  providers: [
    PayrollService,
    RescisaoService,
    DecimoTerceiroService,
    FeriasPayrollService,
    FolhaMensalService,
    SimulacaoService,
    PayrollAccountingService,
    RubricaService,
    PayrollOperationsService,
    BankAccountService,
    BankAccountValidatorService,
    MarginCalculatorService,
    ConsignmentLoanService,
    ConsignmentDeductionService,
    ESocialService,
    PayrollEngineService,
    FormulaCompilerService,
    FormulaCacheService,
  ],
})
export class FolhaPagamentoModule {}
