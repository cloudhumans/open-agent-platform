import { Tenant } from "@/types/tenant";
import tenantsData from "@/data/tenants.json";

const TENANTS_ENV_KEYS = [
  "NEXT_PUBLIC_TENANTS_JSON",
  "NEXT_PUBLIC_TENANTS",
] as const;

type RawTenant = Partial<
  Tenant & {
    _id?: { $oid?: string } | string;
  }
>;

function normalizeTenant(raw: RawTenant): Tenant | null {
  const id =
    (typeof raw.id === "string" && raw.id) ||
    (typeof raw._id === "string" && raw._id) ||
    (typeof raw._id === "object" && raw._id?.$oid) ||
    "";

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
    eddieInstance: raw.eddieInstance ?? "",
  };
}

export function loadTenantsFromEnv(): Tenant[] {
  const jsonTenants = Array.isArray(tenantsData)
    ? tenantsData
    : ([] as RawTenant[]);

  const normalizedFromJson = jsonTenants
    .map(normalizeTenant)
    .filter((tenant): tenant is Tenant => !!tenant);

  if (normalizedFromJson.length) {
    return normalizedFromJson;
  }

  const rawEnv = TENANTS_ENV_KEYS.map((key) => process.env[key]).find(Boolean);

  if (!rawEnv) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawEnv) as RawTenant[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeTenant)
      .filter((tenant): tenant is Tenant => !!tenant);
  } catch (error) {
    console.warn("Failed to parse tenant list from environment", error);
    return [];
  }
}
