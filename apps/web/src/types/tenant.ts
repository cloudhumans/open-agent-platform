export type TenantCloudchatInstance = {
  instance: string;
  accountId: number;
  accountName: string;
};

export type Tenant = {
  key: string;
  id: string;
  tenantName: string;
  cloudchatInstances: TenantCloudchatInstance[];
  connectorProjectIds: string[];
  claudiaProjectIds: string[];
  eddieInstance: string;
};
