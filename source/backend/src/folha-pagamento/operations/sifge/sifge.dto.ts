import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateFgtsRemittanceDto {
  @ApiProperty({ enum: ['GRF_MONTHLY', 'GRRF_TERMINATION'] })
  @IsIn(['GRF_MONTHLY', 'GRRF_TERMINATION'])
  kind!: 'GRF_MONTHLY' | 'GRRF_TERMINATION';

  @ApiProperty({ required: false, example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  competence?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  employmentLinkId?: string;

  @ApiProperty({
    required: false,
    description: 'Termination payroll run id used to locate the FGTS fine.',
  })
  @IsOptional()
  @IsUUID()
  terminationId?: string;
}
