export type TenantCloudchatInstance = {
  instance: string;
  accountId: number;
  accountName: string;
};

export type EddieInstance = "INSTANCE_1" | "INSTANCE_2";

export type EddieWorkspace = {
  workspaceId: string;
  instance: EddieInstance;
};

export type Tenant = {
  key: string;
  id: string;
  tenantName: string;
  cloudchatInstances: TenantCloudchatInstance[];
  connectorProjectIds: string[];
  claudiaProjectIds: string[];
  eddieWorkspaces: EddieWorkspace[];
};
