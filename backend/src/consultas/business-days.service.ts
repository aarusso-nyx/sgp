import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import { BusinessDaysQueryDto } from './consultas.dto';

interface BusinessDayOverrideRow extends QueryResultRow {
  business_date: Date | string;
  is_business_day: boolean;
  codes: string[];
  names: string[];
}

export interface BusinessDayEntry {
  date: string;
  isBusinessDay: boolean;
  source: 'default' | 'configured';
  codes: string[];
  names: string[];
}

export interface BusinessDaysRange {
  startDate: string;
  endDate: string;
  totalDays: number;
  workingDays: number;
  nonWorkingDays: number;
  dates: BusinessDayEntry[];
}

@Injectable()
export class BusinessDaysService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getWorkingDays(
    query: BusinessDaysQueryDto,
  ): Promise<BusinessDaysRange> {
    return this.resolveRange(query.startDate, query.endDate);
  }

  async countWorkingDays(startDate: string, endDate: string): Promise<number> {
    const range = await this.resolveRange(startDate, endDate);
    return range.workingDays;
  }

  async countWorkingDaysInMonth(year: number, month: number): Promise<number> {
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      throw new BadRequestException('year must be between 1900 and 2200');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(year, month, 0))
      .toISOString()
      .slice(0, 10);
    return this.countWorkingDays(startDate, endDate);
  }

  private async resolveRange(
    startDateInput: string,
    endDateInput: string,
  ): Promise<BusinessDaysRange> {
    this.ensureDatabase();
    const startDate = this.parseDate(startDateInput, 'startDate');
    const endDate = this.parseDate(endDateInput, 'endDate');
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    const totalDays = this.inclusiveDayCount(startDate, endDate);
    if (totalDays > 3_660) {
      throw new BadRequestException(
        'business-day range is limited to 3660 days',
      );
    }

    const overrides = await this.loadOverrides(
      this.formatDate(startDate),
      this.formatDate(endDate),
    );
    const dates: BusinessDayEntry[] = [];
    for (let offset = 0; offset < totalDays; offset += 1) {
      const current = new Date(startDate.getTime() + offset * 86_400_000);
      const date = this.formatDate(current);
      const override = overrides.get(date);
      const defaultBusinessDay = this.isDefaultBusinessDay(current);
      dates.push({
        date,
        isBusinessDay: override?.isBusinessDay ?? defaultBusinessDay,
        source: override ? 'configured' : 'default',
        codes: override?.codes ?? [],
        names: override?.names ?? [],
      });
    }

    const workingDays = dates.filter((entry) => entry.isBusinessDay).length;
    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      totalDays,
      workingDays,
      nonWorkingDays: totalDays - workingDays,
      dates,
    };
  }

  private async loadOverrides(
    startDate: string,
    endDate: string,
  ): Promise<
    Map<string, { isBusinessDay: boolean; codes: string[]; names: string[] }>
  > {
    const rows = await this.databaseService.query<BusinessDayOverrideRow>(
      `
      SELECT
        business_date,
        bool_and(is_business_day) AS is_business_day,
        array_agg(code ORDER BY code) AS codes,
        array_agg(name ORDER BY code) AS names
      FROM hr.business_day
      WHERE business_date BETWEEN $1::date AND $2::date
        AND status = 'ACTIVE'::"RecordStatus"
      GROUP BY business_date
      ORDER BY business_date
      `,
      [startDate, endDate],
    );

    return new Map(
      rows.map((row) => [
        this.toDate(row.business_date),
        {
          isBusinessDay: Boolean(row.is_business_day),
          codes: row.codes ?? [],
          names: row.names ?? [],
        },
      ]),
    );
  }

  private parseDate(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must use yyyy-mm-dd format`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || this.formatDate(date) !== value) {
      throw new BadRequestException(`${field} must be a valid calendar date`);
    }
    return date;
  }

  private inclusiveDayCount(startDate: Date, endDate: Date): number {
    return (
      Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
    );
  }

  private isDefaultBusinessDay(date: Date): boolean {
    const day = date.getUTCDay();
    return day !== 0 && day !== 6;
  }

  private toDate(value: Date | string): string {
    if (value instanceof Date) return this.formatDate(value);
    return String(value).slice(0, 10);
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for business-day calendar operations',
      );
    }
  }
}
