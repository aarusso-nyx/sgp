import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export type DirfArquivoKind = 'ORIGINAL' | 'RETIFICADORA';
export type DirfArquivoStatus =
  'DRAFT' | 'GENERATED' | 'VALIDATED' | 'TRANSMITTED';
export type DirfBeneficiaryKind = 'CPF' | 'CNPJ' | 'EXTERIOR';

export class GenerateDirfDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  yearBase!: number;

  @IsOptional()
  @IsIn(['ORIGINAL', 'RETIFICADORA'])
  kind?: DirfArquivoKind;

  @IsOptional()
  @IsUUID()
  originalArquivoId?: string;
}

export interface DirfPagamentoDto {
  id: string;
  code: string;
  monthYear: string;
  amount: string;
  irrf: string;
  deductions: Record<string, unknown>;
}

export interface DirfBeneficiarioDto {
  id: string;
  cpfCnpj: string;
  kind: DirfBeneficiaryKind;
  name: string;
  totals: Record<string, unknown>;
  payments: DirfPagamentoDto[];
}

export interface DirfArquivoDto {
  id: string;
  yearBase: number;
  kind: DirfArquivoKind;
  status: DirfArquivoStatus;
  originalArquivoId: string | null;
  txtRef: string;
  txtHash: string;
  layoutVersion: string;
  generatedAt: string | null;
  beneficiaryCount: number;
  paymentCount: number;
  totalAmount: string;
  totalIrrf: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirfArquivoDetailsDto extends DirfArquivoDto {
  txtContent: string;
  beneficiaries: DirfBeneficiarioDto[];
}

export interface DirfSourcePayment {
  beneficiaryKind: DirfBeneficiaryKind;
  beneficiaryDocument: string;
  beneficiaryName: string;
  revenueCode: string;
  monthYear: string;
  amount: string;
  irrf: string;
  deductions: Record<string, unknown>;
}
