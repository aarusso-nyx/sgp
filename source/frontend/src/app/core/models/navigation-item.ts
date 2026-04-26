export interface NavigationItem {
  label: string;
  route: string;
  children?: NavigationItem[];
  requiredPermissions?: string[];
}
