import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class RunRescisaoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employmentLinkId!: string;

  @ApiProperty()
  @IsDateString()
  terminationDate!: string;

  @ApiProperty({
    enum: ['SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'APOSENTADORIA', 'OUTRA'],
  })
  @IsString()
  @IsIn(['SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'APOSENTADORIA', 'OUTRA'])
  cause!: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'APOSENTADORIA' | 'OUTRA';

  @ApiProperty({ enum: ['WORKED', 'INDEMNIFIED', 'NONE'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['WORKED', 'INDEMNIFIED', 'NONE'])
  priorNoticeKind?: 'WORKED' | 'INDEMNIFIED' | 'NONE';

  @ApiProperty({
    enum: ['TWO_HOURS_DAY', 'SEVEN_FINAL_DAYS', 'NONE'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['TWO_HOURS_DAY', 'SEVEN_FINAL_DAYS', 'NONE'])
  priorNoticeReductionMode?:
    | 'TWO_HOURS_DAY'
    | 'SEVEN_FINAL_DAYS'
    | 'NONE'
    | undefined;
}

export class ResolvePriorNoticeDto {
  @ApiProperty()
  @IsDateString()
  terminationDate!: string;

  @ApiProperty({ enum: ['WORKED', 'INDEMNIFIED', 'NONE'] })
  @IsString()
  @IsIn(['WORKED', 'INDEMNIFIED', 'NONE'])
  kind!: 'WORKED' | 'INDEMNIFIED' | 'NONE';

  @ApiProperty({
    enum: ['TWO_HOURS_DAY', 'SEVEN_FINAL_DAYS', 'NONE'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['TWO_HOURS_DAY', 'SEVEN_FINAL_DAYS', 'NONE'])
  reductionMode?: 'TWO_HOURS_DAY' | 'SEVEN_FINAL_DAYS' | 'NONE';
}
