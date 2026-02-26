export type TenantCloudchatInstance = {
  instance: string;
  accountId: number;
  accountName: string;
};

export type TenantEddieWorkspace = {
  workspaceId: string;
  instance: string;
};

export type Tenant = {
  key: string;
  tenantName: string;
  cloudchatInstances: TenantCloudchatInstance[];
  connectorProjectIds: string[];
  claudiaProjectIds: string[];
  eddieWorkspaces: TenantEddieWorkspace[];
};
