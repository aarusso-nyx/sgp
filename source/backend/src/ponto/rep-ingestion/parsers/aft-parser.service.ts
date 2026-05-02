import { BadRequestException, Injectable } from '@nestjs/common';

import { formatInstantIso } from '../../payroll-bridge/tenant-timezone.util';
import { ParsedRepLine } from '../rep-ingestion.types';

@Injectable()
export class AftParserService {
  parse(content: string): ParsedRepLine[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new BadRequestException('AFDT content is empty');
    }

    return lines.map((line, index) => this.parseLine(line, index + 1));
  }

  private parseLine(line: string, lineNo: number): ParsedRepLine {
    const delimiter = line.includes('|') ? '|' : ';';
    const parts = line.split(delimiter).map((entry) => entry.trim());
    if (parts.length < 5) {
      throw new BadRequestException(`AFDT line ${lineNo} has too few fields`);
    }

    const [nsrText, employeeIdentifier, dateText, timeText, eventText] = parts;
    const nsr = Number(nsrText);
    if (!Number.isInteger(nsr) || nsr < 1) {
      throw new BadRequestException(`AFDT line ${lineNo} has invalid NSR`);
    }

    const recordedAt = this.parseRecordedAt(dateText, timeText, lineNo);
    const identifier = this.parseEmployeeIdentifier(employeeIdentifier);
    return {
      lineNo,
      nsr,
      rawLine: line,
      recordedAt,
      payload: {
        event: eventText || 'CLOCK',
        layout: 'AFDT',
        extra: parts.slice(5),
      },
      ...identifier,
    };
  }

  private parseRecordedAt(
    dateText: string,
    timeText: string,
    lineNo: number,
  ): string {
    const normalizedDate =
      dateText.length === 8
        ? `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`
        : dateText;
    const timestamp = `${normalizedDate}T${timeText.length === 5 ? `${timeText}:00` : timeText}-03:00`;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `AFDT line ${lineNo} has invalid timestamp`,
      );
    }
    return formatInstantIso(date);
  }

  private parseEmployeeIdentifier(
    value: string,
  ): Pick<
    ParsedRepLine,
    'employeeId' | 'employeeCpf' | 'employeeRegistration'
  > {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      return { employeeId: value };
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) return { employeeCpf: digits };
    return { employeeRegistration: value };
  }
}
