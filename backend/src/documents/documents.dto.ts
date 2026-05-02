import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PresignUploadRequestDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerType!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerId?: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contentType!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 1024 * 1024 * 1024 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 1024)
  sizeBytes?: number;
}

export class RegisterUploadRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  uploadSessionId!: string;
}

export class PresignedUploadDto {
  @ApiProperty({ format: 'uuid' })
  uploadSessionId!: string;

  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  bucket!: string;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty({ type: Object, additionalProperties: { type: 'string' } })
  requiredHeaders!: Record<string, string>;

  @ApiProperty()
  expiresAt!: string;
}

export class RegisteredDocumentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  ownerType!: string;

  @ApiPropertyOptional()
  ownerId!: string | null;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  contentType!: string;

  @ApiPropertyOptional()
  sizeBytes!: number | null;

  @ApiProperty()
  storageKind!: string;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty()
  createdAt!: string;
}

export class PresignedDownloadDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty()
  downloadUrl!: string;

  @ApiProperty()
  expiresAt!: string;
}
