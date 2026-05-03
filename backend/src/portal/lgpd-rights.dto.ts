import { IsIn, IsString, MaxLength } from 'class-validator';

export const LGPD_RIGHT_TYPES = [
  'CONFIRMATION',
  'ACCESS',
  'CORRECTION',
  'ANONYMIZATION_BLOCKING_DELETION',
  'PORTABILITY',
  'CONSENT_DELETION',
] as const;

export type LgpdRightType = (typeof LGPD_RIGHT_TYPES)[number];

export class CreateLgpdRightsRequestDto {
  @IsIn(LGPD_RIGHT_TYPES)
  rightType!: LgpdRightType;

  @IsString()
  @MaxLength(120)
  flowKey!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;
}
