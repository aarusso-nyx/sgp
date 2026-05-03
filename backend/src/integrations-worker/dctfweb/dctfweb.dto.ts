import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export type DctfwebDeclarationKind = 'ORIGINAL' | 'RETIFICADORA';
export type DctfwebDeclarationStatus =
  | 'DRAFT'
  | 'SIGNED'
  | 'TRANSMITTED'
  | 'ACCEPTED'
  | 'REJECTED';
export type DctfwebSourceEvent = 'S5011' | 'S5012' | 'S5013' | 'R9015' | 'MIT';
export type DctfwebMitStatus = 'PENDING' | 'INCLUDED' | 'ACCEPTED' | 'REJECTED';

export class GenerateDctfwebDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsIn(['ORIGINAL', 'RETIFICADORA'])
  kind?: DctfwebDeclarationKind;

  @IsOptional()
  @IsUUID()
  originalDeclarationId?: string;
}

export class GenerateDctfwebMitDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @Matches(/^\d{14}$/)
  cnpjFilial?: string;
}

export interface DctfwebItemDto {
  id: string;
  sourceEvent: DctfwebSourceEvent;
  sourceRunId: string;
  debitCode: string;
  baseAmount: string;
  amount: string;
  mitStatus?: DctfwebMitStatus;
  mitDebitId?: string;
  cnpjFilial?: string;
}

export interface DctfwebDeclarationDto {
  id: string;
  competence: string;
  kind: DctfwebDeclarationKind;
  status: DctfwebDeclarationStatus;
  originalDeclarationId: string | null;
  payloadXmlRef: string;
  payloadXmlHash: string;
  signedXmlRef: string | null;
  signedXmlHash: string | null;
  transmittedXmlHash: string | null;
  receiptNumber: string | null;
  receiptAt: string | null;
  itemCount: number;
  totalBaseAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface DctfwebDeclarationDetailsDto extends DctfwebDeclarationDto {
  payloadXml: string;
  signedXml: string | null;
  items: DctfwebItemDto[];
}

export interface DctfwebMitDebitDto {
  mitDebitId: string;
  mitStatus: DctfwebMitStatus;
  cnpjFilial: string;
  pgdDeclarationId: string;
  pgdDebitId: string;
  taxCode: string;
  period: string;
  baseAmount: string;
  amount: string;
  dueDate: string | null;
}

export interface DctfwebMitInclusionDto {
  competence: string;
  mitStatus: DctfwebMitStatus;
  debitCount: number;
  totalBaseAmount: string;
  totalAmount: string;
  xml: string;
  xmlHash: string;
  debits: DctfwebMitDebitDto[];
}
