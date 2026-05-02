import {
  IsBase64,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateBancaMembroDto {
  @IsUUID()
  concursoId!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @Matches(/^[0-9]{11}$/)
  cpf!: string;

  @IsIn(['PRESIDENTE', 'MEMBRO', 'SECRETARIO'])
  role!: 'PRESIDENTE' | 'MEMBRO' | 'SECRETARIO';

  @IsIn(['ICP_A1', 'ICP_A3', 'GOVBR_OURO', 'GOVBR_PRATA'])
  certKind!: 'ICP_A1' | 'ICP_A3' | 'GOVBR_OURO' | 'GOVBR_PRATA';

  @IsOptional()
  @IsString()
  certSubjectDn?: string;

  @IsOptional()
  @IsString()
  certSerial?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateSignedDocumentDto {
  @IsUUID()
  concursoId!: string;

  @IsIn(['GABARITO', 'ATA_BANCA', 'LISTA_APROVADOS', 'OUTRO'])
  kind!: 'GABARITO' | 'ATA_BANCA' | 'LISTA_APROVADOS' | 'OUTRO';

  @IsString()
  @IsNotEmpty()
  sourceRef!: string;

  @IsIn(['XADES', 'PADES'])
  format!: 'XADES' | 'PADES';

  @IsBase64()
  payloadBase64!: string;
}

export class SignDocumentDto {
  @IsUUID()
  bancaMembroId!: string;

  @IsOptional()
  @IsBase64()
  certChainBase64?: string;

  @IsOptional()
  @IsBase64()
  tsTokenBase64?: string;
}
