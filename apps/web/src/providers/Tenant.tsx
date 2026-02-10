"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Tenant } from "@/types/tenant";
import { loadTenantsFromEnv } from "@/lib/tenants";
import { useAuthContext } from "./Auth";

type TenantContextValue = {
  tenants: Tenant[];
  selectedTenantKey: string;
  selectedTenantId: string;
  selectedTenant: Tenant | null;
  setSelectedTenantKey: (tenantKey: string) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const allTenants = useMemo(() => loadTenantsFromEnv(), []);

  const tenants = useMemo(() => {
    if (!user) return [];

    if (user.metadata?.["custom:hub_role"] === "ADMIN") {
      return allTenants;
    }

    const userTenantId = user.metadata?.["custom:tenant_id"];
    if (!userTenantId) return [];

    return allTenants.filter((tenant) => tenant.tenantName === userTenantId);
  }, [user, allTenants]);

  // Helper: read a storage value, handling legacy JSON-encoded strings
  const readStorageKey = useCallback(
    (storage: Storage, key: string): string | null => {
      const raw = storage.getItem(key);
      if (!raw) return null;
      // Old useLocalStorage stored values via JSON.stringify, so a string "abc"
      // was stored as '"abc"'. Try to parse it; if the result is a string, use it.
      // Otherwise fall back to the raw value.
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") return parsed;
      } catch {
        // not JSON, use raw
      }
      return raw;
    },
    [],
  );

  const getStoredKey = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return (
      readStorageKey(window.sessionStorage, "oap-selected-tenant-key") ??
      readStorageKey(window.localStorage, "oap-selected-tenant-key")
    );
  }, [readStorageKey]);

  const [selectedTenantKey, setSelectedTenantKeyState] = useState<string>(
    () => {
      return getStoredKey() ?? "";
    },
  );

  const setSelectedTenantKey = useCallback((key: string) => {
    setSelectedTenantKeyState(key);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("oap-selected-tenant-key", key);
      window.localStorage.setItem("oap-selected-tenant-key", key);
    }
  }, []);

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
  }, [tenants, selectedTenantKey, setSelectedTenantKey, getStoredKey]);

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
