export type AuditEventEnvelope = Readonly<{
  tenant_id: string;
  actor_id?: string | undefined;
  action: string;
  target: {
    type: string;
    id?: string | undefined;
  };
  before?: unknown;
  after?: unknown;
  occurred_at: string;
  correlation_id?: string | undefined;
}>;
