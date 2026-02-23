"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";
import { Tenant } from "@/types/tenant";
import { normalizeTenant } from "@/lib/tenants";
import { useAuthContext } from "./Auth";

type TenantContextValue = {
  tenants: Tenant[];
  selectedTenantKey: string;
  selectedTenantId: string;
  selectedTenant: Tenant | null;
  setSelectedTenantKey: (tenantKey: string) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const STORAGE_KEY = "oap-selected-tenant-key";
const TENANTS_CACHE_TTL_MS = 5 * 60 * 1000;

function readStorageKey(storage: Storage, key: string): string | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
  } catch {
    // not JSON, use raw
  }
  return raw;
}

function getStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  return (
    readStorageKey(window.sessionStorage, STORAGE_KEY) ??
    readStorageKey(window.localStorage, STORAGE_KEY)
  );
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const cacheRef = useRef<{
    userId: string | null;
    fetchedAt: number;
    tenants: Tenant[];
  }>({ userId: null, fetchedAt: 0, tenants: [] });

  useEffect(() => {
    if (!user) {
      setAllTenants([]);
      return;
    }

    const fetchTenants = async () => {
      try {
        const userId = user.id ?? null;
        const now = Date.now();
        if (
          cacheRef.current.userId === userId &&
          now - cacheRef.current.fetchedAt < TENANTS_CACHE_TTL_MS
        ) {
          setAllTenants(cacheRef.current.tenants);
          return;
        }

        const tokenResponse = await fetch("/api/backoffice/token", {
          method: "POST",
        });

        if (!tokenResponse.ok) {
          throw new Error(
            `Failed to generate backoffice token: ${tokenResponse.statusText}`,
          );
        }

        const tokenData = (await tokenResponse.json()) as {
          access_token?: string;
        };

        if (!tokenData.access_token) {
          throw new Error("Backoffice token response missing access_token");
        }

        const tenantsResponse = await fetch("/api/backoffice/tenants", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        if (!tenantsResponse.ok) {
          throw new Error(
            `Failed to fetch tenants: ${tenantsResponse.statusText}`,
          );
        }

        const responseBody = (await tenantsResponse.json()) as unknown;
        const rawTenants = Array.isArray(responseBody) ? responseBody : [];

        const normalizedTenants = rawTenants
          .map((raw) => normalizeTenant(raw as Tenant))
          .filter((tenant): tenant is Tenant => !!tenant);

        setAllTenants(normalizedTenants);
        cacheRef.current = {
          userId,
          fetchedAt: now,
          tenants: normalizedTenants,
        };
      } catch (error) {
        console.error("Failed to load tenants from backoffice", error);
        setAllTenants([]);
      }
    };

    fetchTenants();
  }, [user]);

  const tenants = useMemo(() => {
    if (!user) return [];

    if (user.metadata?.["custom:hub_role"] === "ADMIN") {
      return allTenants;
    }

    const userTenantId = user.metadata?.["custom:tenant_id"];
    if (!userTenantId) return [];

    return allTenants.filter((tenant) => tenant.tenantName === userTenantId);
  }, [user, allTenants]);

  const [selectedTenantKey, setSelectedTenantKeyState] = useState<string>(
    () => getStoredKey() ?? "",
  );

  const setSelectedTenantKey = (key: string) => {
    setSelectedTenantKeyState(key);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, key);
      window.localStorage.setItem(STORAGE_KEY, key);
    }
  };

  useEffect(() => {
    if (!tenants.length) return;

    const currentKey = selectedTenantKey || getStoredKey();

    if (currentKey) {
      const exists = tenants.some((t) => t.key === currentKey);
      if (exists) {
        if (currentKey !== selectedTenantKey) {
          setSelectedTenantKey(currentKey);
        }
      } else {
        setSelectedTenantKey(tenants[0].key);
      }
    } else {
      setSelectedTenantKey(tenants[0].key);
    }
  }, [tenants, selectedTenantKey]);

  const selectedTenant =
    tenants.find((tenant) => tenant.key === selectedTenantKey) ?? null;
  const selectedTenantId = selectedTenant?.id ?? "";

  const value = {
    tenants,
    selectedTenantKey,
    selectedTenantId,
    selectedTenant,
    setSelectedTenantKey,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return context;
}
