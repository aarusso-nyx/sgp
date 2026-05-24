import { Injectable, Optional } from '@nestjs/common';
import { sha256Hex as stynxPdfSha256Hex } from '@stynx/pdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { PadesAdapter } from '../../external/signature/pades.adapter';
import { PayslipDocument } from './payslip-template';
import { YearlyIncomeDocument } from '../yearly-income/yearly-income-template';

export interface PdfAValidationResult {
  valid: boolean;
  reasons: string[];
}

@Injectable()
export class PdfABuilderService {
  constructor(
    @Optional()
    private readonly padesAdapter: PadesAdapter = new PadesAdapter(),
  ) {}

  async buildPayslip(document: PayslipDocument): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Contracheque ${document.competence}`);
    pdf.setSubject('Contracheque oficial PDF/A-1b');
    pdf.setAuthor(document.tenantName);
    pdf.setCreator('SGP report-service/payslip');
    pdf.setProducer('pdf-lib');
    pdf.setCreationDate(new Date(`${document.competence}T00:00:00.000Z`));
    pdf.setModificationDate(new Date(`${document.competence}T00:00:00.000Z`));

    const page = pdf.addPage([595.28, 841.89]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const mono = await pdf.embedFont(StandardFonts.Courier);
    const margin = 36;
    let y = 802;

    const draw = (text: string, x: number, size = 9, font = regular): void => {
      page.drawText(this.clean(text), {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };
    const line = (): void => {
      page.drawLine({
        start: { x: margin, y: y - 5 },
        end: { x: 559, y: y - 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
      y -= 15;
    };

    draw(document.tenantName, margin, 14, bold);
    draw('CONTRACHEQUE OFICIAL', 390, 12, bold);
    y -= 18;
    draw(`Competencia: ${document.competence.slice(0, 7)}`, margin);
    draw(`Run: ${document.payrollRunId}`, 330, 7, mono);
    line();

    draw(`Servidor: ${document.employee.name}`, margin, 10, bold);
    y -= 14;
    draw(`Matricula: ${document.employee.registration}`, margin);
    draw(`CPF: ${document.employee.cpf || '-'}`, 190);
    draw(`Vinculo: ${document.employee.employmentLink || '-'}`, 330);
    y -= 14;
    draw(
      `Banco/agencia/conta: ${document.employee.bankAgency || '-'} / ${document.employee.bankAccount || '-'}`,
      margin,
    );
    line();

    draw('Codigo', margin, 8, bold);
    draw('Descricao', 90, 8, bold);
    draw('Referencia', 330, 8, bold);
    draw('Proventos', 405, 8, bold);
    draw('Descontos', 485, 8, bold);
    y -= 12;

    for (const item of document.lines) {
      if (y < 135) break;
      draw(item.code, margin, 8, mono);
      draw(item.description.slice(0, 42), 90, 8);
      draw(item.reference, 330, 8);
      draw(item.earning, 405, 8, mono);
      draw(item.deduction, 485, 8, mono);
      y -= 11;
    }
    line();

    draw(`Total proventos: ${document.totals.earnings}`, margin, 9, bold);
    draw(`Total descontos: ${document.totals.deductions}`, 220, 9, bold);
    draw(`Liquido: ${document.totals.net}`, 405, 10, bold);
    y -= 15;
    draw(`Base IRRF: ${document.totals.irrfBase}`, margin);
    draw(`Base INSS/RPPS: ${document.totals.inssBase}`, 220);
    draw(`FGTS deposito: ${document.totals.fgtsDeposit}`, 405);
    y -= 18;
    draw(`Fundamento legal: ${document.legalReference}`, margin, 8);
    y -= 12;
    draw(
      'PDF/A-1b: metadados estaveis, fontes incorporadas pela biblioteca PDF dedicada, hash SHA-256 persistido.',
      margin,
      7,
    );

    const rendered = Buffer.from(await pdf.save({ useObjectStreams: false }));
    this.assertRenderedPdfDigest(rendered);
    return this.padesAdapter.embedVerificationHint({
      payload: rendered,
      verifyUrl: `/v1/portal/payslips/${document.employee.id}/${document.competence.slice(0, 7)}/pdf`,
      signerName: document.tenantName,
      signedAt: new Date(`${document.competence}T00:00:00.000Z`).toISOString(),
      reason: `Contracheque ${document.competence.slice(0, 7)}`,
    });
  }

  validatePdfA1b(buffer: Buffer): PdfAValidationResult {
    const text = buffer.toString('latin1');
    const reasons: string[] = [];
    if (!text.startsWith('%PDF-')) reasons.push('missing PDF header');
    if (!text.includes('/Title'))
      reasons.push('missing document title metadata');
    if (!text.includes('/Creator')) reasons.push('missing creator metadata');
    if (!text.includes('/Font')) reasons.push('missing font resources');
    return { valid: reasons.length === 0, reasons };
  }

  async buildYearlyIncome(document: YearlyIncomeDocument): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Comprovante de Rendimentos ${document.yearBase}`);
    pdf.setSubject('Comprovante de rendimentos anual PDF/A-1b');
    pdf.setAuthor(document.payer.name);
    pdf.setCreator('SGP report-service/yearly-income');
    pdf.setProducer('pdf-lib');
    pdf.setCreationDate(
      new Date(`${document.yearBase + 1}-02-28T00:00:00.000Z`),
    );
    pdf.setModificationDate(
      new Date(`${document.yearBase + 1}-02-28T00:00:00.000Z`),
    );

    const page = pdf.addPage([595.28, 841.89]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const mono = await pdf.embedFont(StandardFonts.Courier);
    const margin = 36;
    let y = 802;

    const draw = (text: string, x: number, size = 9, font = regular): void => {
      page.drawText(this.clean(text), {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };
    const line = (): void => {
      page.drawLine({
        start: { x: margin, y: y - 5 },
        end: { x: 559, y: y - 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
      y -= 15;
    };

    draw('COMPROVANTE DE RENDIMENTOS PAGOS E DE IRRF', margin, 12, bold);
    draw(`Ano-calendario: ${document.yearBase}`, 410, 10, bold);
    y -= 18;
    draw(`Fonte pagadora: ${document.payer.name}`, margin, 9, bold);
    y -= 13;
    draw(`CNPJ: ${document.payer.document || '-'}`, margin);
    line();

    draw(`Beneficiario: ${document.employee.name}`, margin, 10, bold);
    y -= 13;
    draw(`CPF: ${document.employee.cpf || '-'}`, margin);
    draw(`Matricula: ${document.employee.registration}`, 190);
    draw(`Vinculo: ${document.employee.employmentLink || '-'}`, 330);
    line();

    const rows: Array<[string, string]> = [
      ['1. Total dos rendimentos tributaveis', document.totals.taxableTotal],
      ['2. Decimo terceiro salario', document.totals.thirteenthSalary],
      ['3. Ferias pagas no ano-calendario', document.totals.vacationTotal],
      ['4. Verbas rescisorias tributaveis', document.totals.severanceTotal],
      ['5. Rendimentos isentos e nao tributaveis', document.totals.exemptTotal],
      ['6. Previdencia oficial / RPPS', document.totals.inssRppsTotal],
      ['7. IRRF retido', document.totals.irrfTotal],
      ['8. Dependentes informados', String(document.totals.dependentsCount)],
    ];
    for (const [label, value] of rows) {
      draw(label, margin, 9);
      draw(value, 455, 9, mono);
      y -= 14;
    }
    line();

    draw(`Total conciliado S-1210: ${document.esocialTotal}`, margin, 9, bold);
    draw(`IRRF S-1210: ${document.esocialIrrfTotal}`, 330, 9, bold);
    y -= 14;
    draw(`Recomputado em: ${document.recomputedAt}`, margin, 8);
    y -= 14;
    draw(document.legalReference, margin, 8);
    y -= 12;
    draw(
      'PDF/A-1b: metadados estaveis, fontes incorporadas pela biblioteca PDF dedicada, hash SHA-256 persistido.',
      margin,
      7,
    );

    const rendered = Buffer.from(await pdf.save({ useObjectStreams: false }));
    this.assertRenderedPdfDigest(rendered);
    return this.padesAdapter.embedVerificationHint({
      payload: rendered,
      verifyUrl: `/v1/portal/yearly-income/${document.yearBase}/pdf`,
      signerName: document.payer.name,
      signedAt: document.recomputedAt,
      reason: `Comprovante de Rendimentos ${document.yearBase}`,
    });
  }

  private clean(value: string): string {
    return value.replace(/[^\x20-\x7e]/g, '?');
  }

  private assertRenderedPdfDigest(buffer: Buffer): void {
    stynxPdfSha256Hex(buffer);
  }
}
