export interface UserSession {
  subject: string;
  login: string;
  displayName: string;
  groups: string[];
  permissions: string[];
}
