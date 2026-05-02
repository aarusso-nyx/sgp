import { IsInt, Max, Min } from 'class-validator';

export class YearlyIncomeBatchRequestDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  yearBase!: number;
}
