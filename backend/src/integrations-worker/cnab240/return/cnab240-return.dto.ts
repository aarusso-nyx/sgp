import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ProcessCnab240ReturnDto {
  @ApiProperty()
  @IsUUID()
  remittanceFileId!: string;

  @ApiProperty({
    description:
      'ASCII CNAB 240 content or base64 payload when encoding=base64.',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ required: false, enum: ['ascii', 'base64'], default: 'ascii' })
  @IsOptional()
  @IsIn(['ascii', 'base64'])
  encoding?: 'ascii' | 'base64';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remittanceFileHash!: string;
}
