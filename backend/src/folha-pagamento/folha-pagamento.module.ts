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
import { EmployeeAlimonyController } from './operations/alimony/alimony.controller';
import { AlimonyDeductionService } from './operations/alimony/alimony-deduction.service';
import { EmployeeAlimonyService } from './operations/alimony/alimony.service';
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
import { PriorNoticeController } from './rescisao/prior-notice/prior-notice.controller';
import { PriorNoticeService } from './rescisao/prior-notice/prior-notice.service';
import { SimulacaoController } from './simulacao/simulacao.controller';
import { SimulacaoService } from './simulacao/simulacao.service';
import { FormulaCacheService } from '../payroll-engine/formula-cache.service';
import { FormulaCompilerService } from '../payroll-engine/formula-compiler.service';
import { PayrollEngineService } from '../payroll-engine/payroll-engine.service';
import { FgtsModule } from './fgts/fgts.module';
import { PisPasepModule } from './pis-pasep/pis-pasep.module';
import { ReintegrationOrderController } from './operations/reintegration/reintegration-order.controller';
import { ReintegrationOrderService } from './operations/reintegration/reintegration-order.service';
import { SifgeModule } from './operations/sifge/sifge.module';
import { TsvContractController } from './operations/tsv/tsv-contract.controller';
import { TsvContractService } from './operations/tsv/tsv-contract.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AuditModule,
    ESocialWorkerModule,
    FgtsModule,
    PisPasepModule,
    SifgeModule,
  ],
  controllers: [
    PayrollController,
    PayrollAccountingController,
    RubricaController,
    ESocialController,
    PayrollOperationsController,
    PayrollGfipController,
    BankAccountController,
    EmployeeAlimonyController,
    ConsignmentController,
    SimulacaoController,
    PriorNoticeController,
    ReintegrationOrderController,
    TsvContractController,
  ],
  providers: [
    PayrollService,
    PriorNoticeService,
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
    EmployeeAlimonyService,
    AlimonyDeductionService,
    MarginCalculatorService,
    ConsignmentLoanService,
    ConsignmentDeductionService,
    ESocialService,
    ReintegrationOrderService,
    TsvContractService,
    PayrollEngineService,
    FormulaCompilerService,
    FormulaCacheService,
  ],
})
export class FolhaPagamentoModule {}
