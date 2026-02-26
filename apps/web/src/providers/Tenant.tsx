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
import { normalizeTenants } from "@/lib/tenants";
import { useAuthContext } from "./Auth";

type TenantContextValue = {
  tenants: Tenant[];
  loading: boolean;
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
  const { user, session } = useAuthContext();
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<{
    userId: string | null;
    fetchedAt: number;
    tenants: Tenant[];
  }>({ userId: null, fetchedAt: 0, tenants: [] });

  useEffect(() => {
    if (!user) {
      setAllTenants([]);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);

    const fetchTenants = async () => {
      try {
        const userId = user.id ?? null;
        const now = Date.now();
        if (
          cacheRef.current.userId === userId &&
          now - cacheRef.current.fetchedAt < TENANTS_CACHE_TTL_MS
        ) {
          setAllTenants(cacheRef.current.tenants);
          setLoading(false);
          return;
        }

        const headers: HeadersInit = {};
        if (session?.accessToken) {
          headers["Authorization"] = `Bearer ${session.accessToken}`;
        }

        const tenantsResponse = await fetch("/api/backoffice/tenants", {
          signal: abortController.signal,
          headers,
        });

        if (!tenantsResponse.ok) {
          throw new Error(
            `Failed to fetch tenants: ${tenantsResponse.statusText}`,
          );
        }

        const responseBody = await tenantsResponse.json();

        if (abortController.signal.aborted) return;

        const normalizedTenants = normalizeTenants(responseBody);

        setAllTenants(normalizedTenants);
        setLoading(false);
        cacheRef.current = {
          userId,
          fetchedAt: now,
          tenants: normalizedTenants,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load tenants from backoffice", error);
        setAllTenants([]);
        setLoading(false);
      }
    };

    fetchTenants();

    return () => {
      abortController.abort();
    };
  }, [user, session]);

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
  const selectedTenantId = selectedTenant?.tenantName ?? "";

  const value = {
    tenants,
    loading,
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
