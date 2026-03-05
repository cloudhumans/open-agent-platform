import { Tenant } from "@/types/tenant";

interface ApiTenant {
  tenantName: string;
  cloudChatAccounts?: Array<{
    instance: string;
    accountId: number;
    accountName: string;
  }>;
  connectorProjects?: string[];
  claudiaProjects?: string[];
  eddieWorkspaces?: Array<{
    workspaceId: string;
    instance: string;
  }>;
}

export function normalizeTenants(data: unknown): Tenant[] {
  if (!Array.isArray(data)) return [];

  return (data as ApiTenant[])
    .filter((t) => t.tenantName)
    .map((t) => ({
      key: t.tenantName,
      tenantName: t.tenantName,
      cloudchatInstances: t.cloudChatAccounts ?? [],
      connectorProjectIds: t.connectorProjects ?? [],
      claudiaProjectIds: t.claudiaProjects ?? [],
      eddieWorkspaces: t.eddieWorkspaces ?? [],
    }));
}
