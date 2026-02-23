export type TenantCloudchatInstance = {
  instance: string;
  accountId: number;
  accountName: string;
};

export type EddieWorkspace = {
  workspaceId: string;
  instance: "INSTANCE_1" | "INSTANCE_2";
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
