import { createHmac, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import { formatInstantIso } from '../../payroll-bridge/tenant-timezone.util';
import { RepPStreamRecordDto } from '../../ponto.dto';
import { TimeRecordHashService } from '../../time-record/time-record-hash.service';
import { ParsedRepLine } from '../rep-ingestion.types';

@Injectable()
export class RepPStreamService {
  constructor(private readonly hashService: TimeRecordHashService) {}

  parse(
    records: RepPStreamRecordDto[] | undefined,
    signature: string | undefined,
    programHash: string | null,
  ): ParsedRepLine[] {
    if (!programHash) {
      throw new BadRequestException('REP-P program_hash is required');
    }
    if (!records?.length) {
      throw new BadRequestException('REP-P stream contains no records');
    }

    this.verifySignature(records, signature, programHash);

    return records.map((record, index) => ({
      lineNo: index + 1,
      nsr: record.nsr,
      rawLine: this.hashService.canonicalize(record),
      employeeId: record.employeeId,
      employeeRegistration: record.employeeRegistration,
      employeeCpf: record.employeeCpf,
      recordedAt: formatInstantIso(record.recordedAt),
      biometric: record.biometric,
      payload: {
        ...(record.payload ?? {}),
        biometricKind: record.biometric?.kind,
        layout: 'REP_P_JSON',
      },
    }));
  }

  sign(records: RepPStreamRecordDto[], programHash: string): string {
    return createHmac('sha256', programHash)
      .update(this.hashService.canonicalize(records))
      .digest('hex');
  }

  private verifySignature(
    records: RepPStreamRecordDto[],
    signature: string | undefined,
    programHash: string,
  ): void {
    if (!signature) {
      throw new BadRequestException('REP-P signature is required');
    }
    const expected = Buffer.from(this.sign(records, programHash), 'hex');
    const received = Buffer.from(signature, 'hex');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new BadRequestException('REP-P signature does not match payload');
    }
  }
}
