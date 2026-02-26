import { Tenant } from "@/types/tenant";

type ApiTenant = Omit<Tenant, "key">;

export function normalizeTenants(data: unknown): Tenant[] {
  if (!Array.isArray(data)) return [];

  return (data as ApiTenant[])
    .filter((t) => t.tenantName)
    .map((t) => ({
      ...t,
      key: t.tenantName,
    }));
}
