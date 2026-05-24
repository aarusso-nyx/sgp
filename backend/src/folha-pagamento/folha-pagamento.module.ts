import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PayrollAccountingController } from './accounting/payroll-accounting.controller';
import { PayrollAccountingService } from './accounting/payroll-accounting.service';
import { RubricaController } from './accounting/rubrica/rubrica.controller';
import { RubricaService } from './accounting/rubrica/rubrica.service';
import { ManualEntryImportController } from './import/manual-entry-import.controller';
import { ManualEntryImportService } from './import/manual-entry-import.service';
import { PensionistaImportController } from './import/pensionista-import.controller';
import { PensionistaImportParserService } from './import/pensionista-import-parser.service';
import { PensionistaImportPersistenceService } from './import/pensionista-import-persistence.service';
import { PensionistaImportService } from './import/pensionista-import.service';
import { PensionistaImportValidationService } from './import/pensionista-import-validation.service';
import { ServidorImportController } from './import/servidor-import.controller';
import { ServidorImportService } from './import/servidor-import.service';
import {
  PayrollGfipController,
  PayrollOperationsController,
} from './operations/payroll-operations.controller';
import { PayrollOperationsRemittanceService } from './operations/payroll-operations-remittance.service';
import { PayrollOperationsReportService } from './operations/payroll-operations-report.service';
import { PayrollOperationsService } from './operations/payroll-operations.service';
import { BankAccountController } from './operations/bank-account/bank-account.controller';
import { BankAccountService } from './operations/bank-account/bank-account.service';
import { BankAccountValidatorService } from './operations/bank-account/bank-account-validator.service';
import { CompanyBankAccountModule } from './operations/company-bank-account/company-bank-account.module';
import { EmployeeAlimonyController } from './operations/alimony/alimony.controller';
import { AlimonyDeductionService } from './operations/alimony/alimony-deduction.service';
import { EmployeeAlimonyService } from './operations/alimony/alimony.service';
import { ConsignmentController } from './operations/consignment/consignment.controller';
import { ConsignmentDeductionService } from './operations/consignment/consignment-deduction.service';
import { ConsignmentLoanService } from './operations/consignment/consignment-loan.service';
import { MarginCalculatorService } from './operations/consignment/margin-calculator.service';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollMonthlyController } from './payroll/payroll-monthly.controller';
import { PayrollRunExecutionController } from './payroll/payroll-run-execution.controller';
import { DecimoTerceiroService } from './payroll/decimo-terceiro.service';
import { FeriasPayrollService } from './payroll/ferias-payroll.service';
import { FolhaMensalService } from './payroll/folha-mensal.service';
import { PayrollService } from './payroll/payroll.service';
import { RescisaoService } from './rescisao/rescisao.service';
import { RescisaoCalculationService } from './rescisao/rescisao-calculation.service';
import { RescisaoTerminationService } from './rescisao/rescisao-termination.service';
import { PriorNoticeController } from './rescisao/prior-notice/prior-notice.controller';
import { PriorNoticeService } from './rescisao/prior-notice/prior-notice.service';
import { SimulacaoController } from './simulacao/simulacao.controller';
import { SimulacaoService } from './simulacao/simulacao.service';
import { PayrollEngineModule } from '../payroll-engine/payroll-engine.module';
import { StynxEsocialModule } from '../integrations/stynx-esocial';
import { FgtsModule } from './fgts/fgts.module';
import { PisPasepModule } from './pis-pasep/pis-pasep.module';
import { ReintegrationEligibilityService } from './operations/reintegration/reintegration-eligibility.service';
import { ReintegrationFinancialService } from './operations/reintegration/reintegration-financial.service';
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
    StynxEsocialModule,
    PayrollEngineModule,
    FgtsModule,
    PisPasepModule,
    SifgeModule,
    CompanyBankAccountModule,
  ],
  controllers: [
    PayrollController,
    PayrollMonthlyController,
    PayrollRunExecutionController,
    PayrollAccountingController,
    RubricaController,
    ManualEntryImportController,
    PensionistaImportController,
    ServidorImportController,
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
    RescisaoCalculationService,
    RescisaoTerminationService,
    RescisaoService,
    DecimoTerceiroService,
    FeriasPayrollService,
    FolhaMensalService,
    SimulacaoService,
    PayrollAccountingService,
    RubricaService,
    PayrollOperationsRemittanceService,
    PayrollOperationsReportService,
    PayrollOperationsService,
    BankAccountService,
    BankAccountValidatorService,
    EmployeeAlimonyService,
    AlimonyDeductionService,
    MarginCalculatorService,
    ConsignmentLoanService,
    ConsignmentDeductionService,
    ManualEntryImportService,
    PensionistaImportParserService,
    PensionistaImportPersistenceService,
    PensionistaImportService,
    PensionistaImportValidationService,
    ServidorImportService,
    ReintegrationEligibilityService,
    ReintegrationFinancialService,
    ReintegrationOrderService,
    TsvContractService,
  ],
})
export class FolhaPagamentoModule {}
