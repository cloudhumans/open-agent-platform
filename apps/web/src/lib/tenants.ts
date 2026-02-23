import { Tenant } from "@/types/tenant";

type RawTenant = Partial<Omit<Tenant, "key">>;

export function normalizeTenant(raw: RawTenant): Tenant | null {
  const id = typeof raw.id === "string" ? raw.id : "";

  if (!id || !raw.tenantName) {
    return null;
  }

  return {
    key: `${id}:${raw.tenantName}`,
    id,
    tenantName: raw.tenantName,
    cloudchatInstances: raw.cloudchatInstances ?? [],
    connectorProjectIds: raw.connectorProjectIds ?? [],
    claudiaProjectIds: raw.claudiaProjectIds ?? [],
    eddieWorkspaces: raw.eddieWorkspaces ?? [],
  };
}
