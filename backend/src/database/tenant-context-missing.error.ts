export class TenantContextMissingError extends Error {
  constructor() {
    super('Tenant context is required for database session context');
    this.name = 'TenantContextMissingError';
  }
}
