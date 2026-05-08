import { SetMetadata } from '@nestjs/common';

export const AUDIT_MUTATION_METADATA = 'sgp:audit-mutation';

export interface AuditMutationMetadata {
  resourceType: string;
  tableName?: string | undefined;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'PROCESS' | 'GENERATE' | undefined;
  reasonRequired?: boolean | undefined;
}

export const AuditMutation = (metadata: AuditMutationMetadata) =>
  SetMetadata(AUDIT_MUTATION_METADATA, metadata);
