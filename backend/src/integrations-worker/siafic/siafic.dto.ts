import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export type SiaficSyncStage = 'EMPENHO' | 'LIQUIDACAO' | 'PAGAMENTO';
export type SiaficSyncStatus =
  | 'PENDING'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FAILED';
export type SiaficCircuitState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';

export class SyncSiaficPayrollRunDto {
  @IsUUID()
  payrollRunId!: string;

  @IsString()
  enteCode!: string;

  @IsOptional()
  @IsArray()
  @IsIn(['EMPENHO', 'LIQUIDACAO', 'PAGAMENTO'], { each: true })
  stages?: SiaficSyncStage[];
}

export interface SiaficAccountingLineDto {
  sourceLineId: string;
  accountingAccountId: string;
  accountCode: string;
  accountType: string;
  earningCode: string;
  earningDescription: string;
  amount: string;
}

export interface SiaficSyncBatchDto {
  id: string;
  payrollRunId: string;
  competence: string;
  enteCode: string;
  status: SiaficSyncStatus;
  circuitState: SiaficCircuitState;
  attempts: number;
  receiptNumber: string | null;
  lastError: string | null;
  stageStatus: Partial<Record<SiaficSyncStage, SiaficSyncStatus>>;
  itemCount: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiaficStagePayload {
  idempotencyKey: string;
  enteCode: string;
  payrollRunId: string;
  competence: string;
  stage: SiaficSyncStage;
  items: SiaficAccountingLineDto[];
}

export interface SiaficConnectorResponse {
  accepted: boolean;
  receiptNumber: string | null;
  payload: Record<string, unknown>;
}
