declare const domainIdBrand: unique symbol;

export type DomainId<TName extends string> = string & {
  readonly [domainIdBrand]: TName;
};

export type TenantId = DomainId<'TenantId'>;
export type UserId = DomainId<'UserId'>;
export type EmployeeId = DomainId<'EmployeeId'>;
export type RequestId = DomainId<'RequestId'>;
export type AuditEventId = DomainId<'AuditEventId'>;
export type WorkerJobId = DomainId<'WorkerJobId'>;

export function domainId<TName extends string>(value: string): DomainId<TName> {
  return value as DomainId<TName>;
}

export const tenantId = (value: string): TenantId =>
  domainId<'TenantId'>(value);
export const userId = (value: string): UserId => domainId<'UserId'>(value);
export const employeeId = (value: string): EmployeeId =>
  domainId<'EmployeeId'>(value);
export const requestId = (value: string): RequestId =>
  domainId<'RequestId'>(value);
export const auditEventId = (value: string): AuditEventId =>
  domainId<'AuditEventId'>(value);
export const workerJobId = (value: string): WorkerJobId =>
  domainId<'WorkerJobId'>(value);
