import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class GenerateClassificacaoDto {
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class PublishClassificacaoDto {
  @IsUUID()
  snapshotId!: string;
}
