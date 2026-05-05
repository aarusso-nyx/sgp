export interface AuthenticatedActor {
  sub: string;
  username: string;
  tenantId: string;
  groups: string[];
  permissions: string[];
  claims?: Record<string, unknown>;
}
