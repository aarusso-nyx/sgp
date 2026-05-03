import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import Decimal from 'decimal.js';

/**
 * @deprecated DIRF validation is retained only for year-base competences before
 * 2025-01-01. Use EFD-Reinf R-4000 for facts from 2025-01-01 onward.
 */
@Injectable()
export class DirfValidatorService {
  validate(txt: string): void {
    const lines = txt.split(/\r?\n/).filter(Boolean);
    if (lines[0]?.split('|')[0] !== 'DIRF') {
      throw new UnprocessableEntityException('DIRF header record is missing');
    }
    if (lines[1]?.split('|')[0] !== 'ABERTURA') {
      throw new UnprocessableEntityException('DIRF opening record is missing');
    }
    if (lines.at(-1)?.split('|')[0] !== 'FIMDIRF') {
      throw new UnprocessableEntityException('DIRF closing record is missing');
    }

    let beneficiaryCount = 0;
    let paymentCount = 0;
    let totalAmount = new Decimal(0);
    let totalIrrf = new Decimal(0);
    let sawTotal = false;

    for (const line of lines.slice(2, -1)) {
      const fields = line.split('|');
      const kind = fields[0];
      if (kind === 'BENEF') {
        beneficiaryCount += 1;
        continue;
      }
      if (kind === 'PAGTO') {
        paymentCount += 1;
        totalAmount = totalAmount.plus(fields[3] ?? 0);
        totalIrrf = totalIrrf.plus(fields[4] ?? 0);
        continue;
      }
      if (kind === 'TOTAL') {
        sawTotal = true;
        if (
          Number(fields[1]) !== beneficiaryCount ||
          Number(fields[2]) !== paymentCount ||
          !totalAmount.eq(fields[3] ?? 0) ||
          !totalIrrf.eq(fields[4] ?? 0)
        ) {
          throw new UnprocessableEntityException(
            'DIRF total record does not match beneficiary/payment sums',
          );
        }
        continue;
      }
      throw new UnprocessableEntityException(`Unexpected DIRF record ${kind}`);
    }

    if (!sawTotal) {
      throw new UnprocessableEntityException('DIRF total record is missing');
    }
  }
}
