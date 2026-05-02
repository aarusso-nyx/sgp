import { IsDateString, IsUUID } from 'class-validator';

export class PayslipBatchRequestDto {
  @IsUUID()
  payrollRunId!: string;

  @IsDateString()
  competence!: string;
}
