import { Tenant } from "@/types/tenant";

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
    eddieWorkspaces: raw.eddieWorkspaces ?? []
  };
}

export function loadTenantsFromEnv(): Tenant[] {
  const jsonTenants: RawTenant[] = [];

  const normalizedFromJson = jsonTenants
    .map(normalizeTenant)
    .filter((tenant): tenant is Tenant => !!tenant);

  if (normalizedFromJson.length) {
    return normalizedFromJson;
  }

  const rawEnv = TENANTS_ENV_KEYS.map((key) => process.env[key]).find(
    Boolean,
  );

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

export async function fetchTenants(accessToken: string): Promise<Tenant[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKOFFICE_API_URL || "http://localhost:8001/api";
  
  if (!process.env.NEXT_PUBLIC_BACKOFFICE_API_URL) {
    console.warn("fetchTenants: NEXT_PUBLIC_BACKOFFICE_API_URL not set, using fallback http://localhost:8001/api");
  }

  try {
    const url = `${baseUrl}/tenants/all`;
    console.warn(`fetchTenants: Initiating GET request to ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    console.warn(`fetchTenants: Response status ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`fetchTenants: API Error ${response.status}`, errorText);
      throw new Error(`Failed to fetch tenants: ${response.statusText}`);
    }

    const data = (await response.json()) as RawTenant[];
    console.warn(`fetchTenants: Successfully parsed ${data.length} tenants`);
    
    return data
      .map(normalizeTenant)
      .filter((tenant): tenant is Tenant => !!tenant);
  } catch (error) {
    console.error("fetchTenants: Critical error fetching tenants", error);
    return loadTenantsFromEnv();
  }
}
