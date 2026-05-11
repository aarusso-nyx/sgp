import { Injectable } from '@nestjs/common';

import { toMoney } from '../../../common/money/money';
import { SifgePayload, SifgeRecord } from './caixa-adapter.contract';
import {
  FgtsRemittanceSummary,
  GrfSourceRow,
  GrrfSourceRowWithTenant,
  MovementDetailRow,
} from './sifge-persistence.service';

@Injectable()
export class SifgeGenerationService {
  totalsFromGrf(source: GrfSourceRow[]): {
    employeeCount: string;
    totalBase: string;
    totalAmount: string;
  } {
    const employeeCount = source.reduce(
      (total, row) => total + Number(row.employee_count),
      0,
    );
    const totalBase = source
      .reduce((total, row) => total.plus(row.base_amount), toMoney(0))
      .toFixed(2);
    const totalAmount = source
      .reduce((total, row) => total.plus(row.amount), toMoney(0))
      .toFixed(2);
    return { employeeCount: String(employeeCount), totalBase, totalAmount };
  }

  monthlyPayload(input: {
    tenantId: string;
    competence: string;
    remittance: FgtsRemittanceSummary;
    totals: {
      employeeCount: string;
      totalBase: string;
      totalAmount: string;
    };
    details: MovementDetailRow[];
  }): SifgePayload {
    return {
      header: {
        tenantId: input.tenantId,
        remittanceId: input.remittance.id,
        competence: input.competence,
        kind: 'GRF_MONTHLY',
        generatedAt: input.remittance.generatedAt ?? new Date().toISOString(),
        daeBarcode: input.remittance.daeBarcode ?? '',
      },
      totals: {
        employeeCount: Number(input.totals.employeeCount),
        totalBase: input.totals.totalBase,
        totalAmount: input.totals.totalAmount,
      },
      records: input.details.map((row) => this.detailToRecord(row)),
    };
  }

  terminationPayload(input: {
    source: GrrfSourceRowWithTenant;
    remittance: FgtsRemittanceSummary;
  }): SifgePayload {
    return {
      header: {
        tenantId: input.source.tenant_id,
        remittanceId: input.remittance.id,
        competence: this.dateText(input.source.termination_date),
        kind: 'GRRF_TERMINATION',
        generatedAt: input.remittance.generatedAt ?? new Date().toISOString(),
        daeBarcode: input.remittance.daeBarcode ?? '',
      },
      totals: {
        employeeCount: 1,
        totalBase: input.source.base_balance,
        totalAmount: input.source.fine_amount,
      },
      records: [
        {
          employeeId: input.source.employee_id,
          employmentLinkId: input.source.employment_link_id,
          payrollRunId: input.source.payroll_run_id,
          baseAmount: input.source.base_balance,
          rate: input.source.fine_rate,
          amount: input.source.fine_amount,
          movementId: input.source.movement_id,
          terminationDate: this.dateText(input.source.termination_date),
          noticeAmount: input.source.notice_amount,
        },
      ],
    };
  }

  dateText(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private detailToRecord(row: MovementDetailRow): SifgeRecord {
    return {
      employeeId: row.employee_id,
      employmentLinkId: row.employment_link_id,
      payrollRunId: row.payroll_run_id,
      baseAmount: row.base_amount,
      rate: row.rate,
      amount: row.amount,
      movementId: row.movement_id,
    };
  }
}
