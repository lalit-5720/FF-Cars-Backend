export interface RolePermissions {
  canAccessOverview: boolean;
  canAccessInventory: boolean;
  canManageInventory: boolean;
  canAccessSales: boolean;
  canManageSales: boolean;
  canAccessDeliveries: boolean;
  canManageDeliveries: boolean;
  canAccessLeads: boolean;
  canManageLeads: boolean;
  canAccessTestDrives: boolean;
  canManageTestDrives: boolean;
  canAccessReviews: boolean;
  canAccessReports: boolean;
  canAccessEmployees: boolean;
  canManageEmployees: boolean;
  canAccessSettings: boolean;
  canSelectBranch: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystemDefault: boolean;
  permissions: RolePermissions;
  created_at?: string;
}
