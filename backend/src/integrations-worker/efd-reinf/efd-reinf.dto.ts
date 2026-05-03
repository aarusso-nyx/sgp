import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export type EfdReinfEventType = 'R4010' | 'R4020' | 'R4040' | 'R4080' | 'R4099';
export type EfdReinfEventKind = 'ORIGINAL' | 'RETIFICADORA';
export type EfdReinfEventStatus =
  | 'DRAFT'
  | 'SIGNED'
  | 'TRANSMITTED'
  | 'ACCEPTED'
  | 'REJECTED';
export type EfdReinfBeneficiaryKind = 'CPF' | 'CNPJ' | 'EXTERIOR';
export type EfdReinfTotalizerKind = 'R-9015';

export class EfdReinfSourceItemDto {
  @IsOptional()
  @IsUUID()
  sourceRunId?: string;

  @IsIn(['CPF', 'CNPJ', 'EXTERIOR'])
  beneficiaryKind!: EfdReinfBeneficiaryKind;

  @IsString()
  beneficiaryDocument!: string;

  @IsString()
  beneficiaryName!: string;

  @IsString()
  revenueCode!: string;

  @IsString()
  grossAmount!: string;

  @IsString()
  retainedAmount!: string;
}

export class GenerateEfdReinfDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsIn(['R4010', 'R4020', 'R4040', 'R4080', 'R4099'])
  eventType!: EfdReinfEventType;

  @IsOptional()
  @IsIn(['ORIGINAL', 'RETIFICADORA'])
  kind?: EfdReinfEventKind;

  @IsOptional()
  @IsUUID()
  originalEventId?: string;

  @IsOptional()
  @IsArray()
  items?: EfdReinfSourceItemDto[];
}

export interface EfdReinfItemDto {
  id: string;
  sourceRunId: string;
  beneficiaryKind: EfdReinfBeneficiaryKind;
  beneficiaryDocument: string;
  beneficiaryName: string;
  revenueCode: string;
  grossAmount: string;
  retainedAmount: string;
}

export interface EfdReinfEventDto {
  id: string;
  competence: string;
  eventType: EfdReinfEventType;
  kind: EfdReinfEventKind;
  status: EfdReinfEventStatus;
  originalEventId: string | null;
  payloadXmlRef: string;
  payloadXmlHash: string;
  signedXmlRef: string | null;
  signedXmlHash: string | null;
  transmittedXmlHash: string | null;
  receiptNumber: string | null;
  receiptAt: string | null;
  itemCount: number;
  totalGrossAmount: string;
  totalRetainedAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface EfdReinfEventDetailsDto extends EfdReinfEventDto {
  payloadXml: string;
  signedXml: string | null;
  items: EfdReinfItemDto[];
}
