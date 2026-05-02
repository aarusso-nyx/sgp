export interface DomainAction {
  key: string;
  label: string;
  requiredPermission: string;
  mutates: boolean;
}
