import { Injectable, UnprocessableEntityException } from '@nestjs/common';

export interface GpsTxtRecord {
  layout: 'GPS-IN925-2009';
  tenantId: string;
  competence: string;
  paymentCode: string;
  reason: string;
  baseAmount: string;
  amount: string;
  interestAmount: string;
  fineAmount: string;
  totalAmount: string;
  generatedAt: string;
}

@Injectable()
export class GpsTxtSerializer {
  serialize(record: GpsTxtRecord): string {
    const lines = [
      line('GPS', record.layout),
      line('CONTRIBUINTE', record.tenantId),
      line('COMPETENCIA', record.competence.slice(0, 7)),
      line('CODIGO_PAGAMENTO', record.paymentCode),
      line('MOTIVO', record.reason),
      line('BASE', record.baseAmount),
      line('VALOR_INSS', record.amount),
      line('JUROS', record.interestAmount),
      line('MULTA', record.fineAmount),
      line('TOTAL', record.totalAmount),
      line('GERADO_EM', record.generatedAt),
      line('FIMGPS'),
    ];
    return `${lines.join('\r\n')}\r\n`;
  }

  parse(txt: string): GpsTxtRecord {
    const entries = txt
      .split(/\r?\n/)
      .filter(Boolean)
      .map((entry) => entry.split('|'));
    if (entries[0]?.[0] !== 'GPS' || entries.at(-1)?.[0] !== 'FIMGPS') {
      throw new UnprocessableEntityException(
        'GPS TXT header or closing record is missing',
      );
    }
    const get = (key: string) =>
      entries.find((entry) => entry[0] === key)?.[1] ?? '';
    return {
      layout: get('GPS') as 'GPS-IN925-2009',
      tenantId: get('CONTRIBUINTE'),
      competence: `${get('COMPETENCIA')}-01`,
      paymentCode: get('CODIGO_PAGAMENTO'),
      reason: get('MOTIVO'),
      baseAmount: get('BASE'),
      amount: get('VALOR_INSS'),
      interestAmount: get('JUROS'),
      fineAmount: get('MULTA'),
      totalAmount: get('TOTAL'),
      generatedAt: get('GERADO_EM'),
    };
  }
}

function line(...fields: string[]): string {
  return `${fields.map((field) => field.replace(/[|\r\n]/g, ' ').trim()).join('|')}|`;
}
