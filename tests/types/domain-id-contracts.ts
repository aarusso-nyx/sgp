import type { OpenApiClient } from '../../frontend/src/app/core/api/generated/openapi-client.js';
import type { QueueAdapterRequestEnvelope } from '../../backend/src/common/adapters/queue-adapter.js';
import { RequestContextStore } from '../../backend/src/common/request-context/request-context.store.js';
import {
  auditEventId,
  AuditEventId,
  employeeId,
  EmployeeId,
  requestId,
  RequestId,
  tenantId,
  TenantId,
  userId,
  UserId,
  workerJobId,
  WorkerJobId,
} from '../../backend/src/common/types/branded-ids.js';

const tenant = tenantId('00000000-0000-4000-8000-000000000001');
const employee = employeeId('00000000-0000-4000-8000-000000000002');
const request = requestId('req-type-contract');
const user = userId('user-type-contract');
const auditEvent = auditEventId('audit-type-contract');
const job = workerJobId('job-type-contract');

const acceptedTenant: TenantId = tenant;
const acceptedEmployee: EmployeeId = employee;
const acceptedRequest: RequestId = request;
const acceptedUser: UserId = user;
const acceptedAudit: AuditEventId = auditEvent;
const acceptedJob: WorkerJobId = job;

void acceptedTenant;
void acceptedEmployee;
void acceptedRequest;
void acceptedUser;
void acceptedAudit;
void acceptedJob;

// @ts-expect-error employee identifiers must not satisfy tenant identifier slots.
const wrongTenant: TenantId = employee;
// @ts-expect-error tenant identifiers must not satisfy worker job identifier slots.
const wrongJob: WorkerJobId = tenant;
// @ts-expect-error raw strings require explicit boundary branding before use.
const rawTenant: TenantId = '00000000-0000-4000-8000-000000000003';

void wrongTenant;
void wrongJob;
void rawTenant;

RequestContextStore.run({ tenantId: tenant, requestId: request }, () => {
  const snapshot = RequestContextStore.get();
  const currentTenant: TenantId | undefined = snapshot?.tenantId;
  const currentRequest: RequestId | undefined = snapshot?.requestId;
  void currentTenant;
  void currentRequest;
});

RequestContextStore.run(
  {
    tenantId: '00000000-0000-4000-8000-000000000004',
    requestId: 'req-raw-boundary',
  },
  () => undefined,
);

type TransparencyPayrollParams = Parameters<
  OpenApiClient['getApiV1PublicTransparencyPayrollByTenantId']
>[0];

const generatedClientParams: TransparencyPayrollParams = { tenantId: tenant };
void generatedClientParams;

const queueEnvelope: QueueAdapterRequestEnvelope<'type-contract', { ok: true }> = {
  'request-id': request,
  'correlation-id': request,
  'idempotency-key': 'type-contract',
  'reply-to': 'type-contract.response',
  'dead-letter-topic': 'type-contract.dlq',
  'created-at': '2026-05-08T00:00:00.000Z',
  tenant_id: tenant,
  kind: 'type-contract',
  payload: { ok: true },
  attempt: 1,
  'max-attempts': 3,
};

void queueEnvelope;
