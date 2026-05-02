import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export type GpsReason = 'TRANSITION' | 'RETROACTIVE' | 'MALHA_FINA';
export type GpsStatus = 'DRAFT' | 'GENERATED' | 'PAID' | 'CANCELLED';
export type GpsPaymentCodeScope = 'EMPLOYER' | 'EMPLOYEE' | 'BOTH';

export class GenerateGpsDto {
  @IsDateString()
  competence!: string;

  @IsUUID()
  paymentCodeId!: string;

  @IsIn(['TRANSITION', 'RETROACTIVE', 'MALHA_FINA'])
  reason!: GpsReason;

  @IsString()
  reasonDetail!: string;
}

export class ListGpsDto {
  @IsOptional()
  @IsIn(['TRANSITION', 'RETROACTIVE', 'MALHA_FINA'])
  reason?: GpsReason;

  @IsOptional()
  @IsIn(['DRAFT', 'GENERATED', 'PAID', 'CANCELLED'])
  status?: GpsStatus;
}

export interface GpsPaymentCodeDto {
  id: string;
  code: string;
  description: string;
  appliesTo: GpsPaymentCodeScope;
  active: boolean;
  validFrom: string;
  validTo: string | null;
}

export interface GpsRemittanceDto {
  id: string;
  competence: string;
  paymentCodeId: string;
  paymentCode: string;
  paymentCodeDescription: string;
  reason: GpsReason;
  reasonDetail: string;
  baseAmount: string;
  amount: string;
  interestAmount: string;
  fineAmount: string;
  totalAmount: string;
  status: GpsStatus;
  fileUri: string | null;
  txtHash: string;
  generatedAt: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GpsRemittanceDetailsDto extends GpsRemittanceDto {
  txtContent: string;
}
