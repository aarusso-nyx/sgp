import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  DecimoKind,
  DecimoTerceiroPersistence,
} from './decimo-terceiro.persistence';
import { isActivePayrollItemIdempotencyConflict } from './payroll-idempotency';

export interface DecimoTerceiroRunResult {
  payrollRunId: string;
  kind: DecimoKind;
  year: number;
  month: number;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

@Injectable()
export class DecimoTerceiroService {
  private readonly persistence = new DecimoTerceiroPersistence();

  constructor(private readonly databaseService: DatabaseService) {}

  async runAdiantamento(
    tenantId: string,
    year: number,
  ): Promise<DecimoTerceiroRunResult> {
    return this.runDecimoTerceiro(
      tenantId,
      year,
      11,
      'DECIMO_TERCEIRO_ADIANTAMENTO',
    );
  }

  async runFechamento(
    tenantId: string,
    year: number,
  ): Promise<DecimoTerceiroRunResult> {
    return this.runDecimoTerceiro(
      tenantId,
      year,
      12,
      'DECIMO_TERCEIRO_FECHAMENTO',
    );
  }

  private async runDecimoTerceiro(
    tenantId: string,
    year: number,
    month: number,
    kind: DecimoKind,
  ): Promise<DecimoTerceiroRunResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for decimo terceiro processing',
      );
    }
    if (!tenantId) {
      throw new ConflictException('Tenant context is required');
    }

    try {
      return await this.databaseService.transaction(async (client) => {
        const catalog = await this.persistence.ensureCatalog(client, kind);
        const run = await this.persistence.ensureRun(
          client,
          catalog,
          year,
          month,
        );
        const recalculated = run.status === 'GENERATED';

        await this.persistence.prepareRunForReprocessing(
          client,
          run.id,
          run.status,
        );
        await this.persistence.softDeleteCalculatedItems(
          client,
          run.id,
          'calc09.decimo_terceiro.reprocessed',
        );

        const employees = await this.persistence.findEligibleEmployees(
          client,
          year,
        );
        for (const employee of employees) {
          const calc = await this.persistence.computeEmployeeCalculation(
            client,
            employee.employment_link_id,
            kind,
            year,
          );
          if (!calc) continue;

          await this.persistence.insertItem(client, {
            employeeId: employee.employee_id,
            payrollRunId: run.id,
            earningDeductionId: catalog.earning_id,
            year,
            month,
            quantity: calc.avos.toString(),
            referenceValue: calc.base,
            amount: calc.installment_amount,
            notes: `${kind} avos=${calc.avos} first_discount=${calc.first_installment_discount}`,
          });

          if (
            kind === 'DECIMO_TERCEIRO_FECHAMENTO' &&
            Number(calc.irrf_amount) > 0
          ) {
            await this.persistence.insertItem(client, {
              employeeId: employee.employee_id,
              payrollRunId: run.id,
              earningDeductionId: catalog.irrf_id,
              year,
              month,
              quantity: '1',
              referenceValue: calc.installment_amount,
              amount: calc.irrf_amount,
              notes: `IRRF exclusivo 13 salario base=${calc.base}`,
            });
          }

          await this.persistence.upsertFinancialRecord(client, {
            employeeId: employee.employee_id,
            payrollRunId: run.id,
            branchId: employee.branch_id,
            functionalStatusId: employee.functional_status_id,
            year,
            month,
            totalEarnings: calc.installment_amount,
            totalDeductions:
              kind === 'DECIMO_TERCEIRO_FECHAMENTO' ? calc.irrf_amount : '0.00',
            metadata: {
              origin: 'decimo_terceiro',
              kind,
              avos: calc.avos,
              base: calc.base,
              firstInstallmentDiscount: calc.first_installment_discount,
            },
          });
        }

        const totals = await this.persistence.refreshAggregates(
          client,
          run.id,
          recalculated,
        );
        await this.persistence.appendAuditEvent(
          client,
          run.id,
          kind,
          year,
          totals,
        );

        return {
          payrollRunId: run.id,
          kind,
          year,
          month,
          employeeCount: Number(totals.employee_count),
          totalEarnings: totals.total_earnings,
          totalDeductions: totals.total_deductions,
          totalNet: totals.total_net,
        };
      });
    } catch (error: unknown) {
      if (isActivePayrollItemIdempotencyConflict(error)) {
        throw new ConflictException(
          'Payroll run reprocessing conflicted with another execution',
        );
      }
      throw error;
    }
  }
}
