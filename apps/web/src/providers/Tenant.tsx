"use client";

import React, { createContext, useContext, useMemo, useEffect } from "react";
import { Tenant } from "@/types/tenant";
import { loadTenantsFromEnv } from "@/lib/tenants";
import { useLocalStorage } from "@/hooks/use-local-storage";

type TenantContextValue = {
  tenants: Tenant[];
  selectedTenantKey: string;
  selectedTenantId: string;
  selectedTenant: Tenant | null;
  setSelectedTenantKey: (tenantKey: string) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const tenants = useMemo(() => loadTenantsFromEnv(), []);
  const [selectedTenantKey, setSelectedTenantKey] = useLocalStorage<string>(
    "oap-selected-tenant-key",
    tenants[0]?.key ?? "",
  );

  useEffect(() => {
    if (!tenants.length) {
      if (selectedTenantKey !== "") {
        setSelectedTenantKey("");
      }
      return;
    }

    const exists = tenants.some((tenant) => tenant.key === selectedTenantKey);
    if (!exists) {
      setSelectedTenantKey(tenants[0].key);
    }
  }, [tenants, selectedTenantKey, setSelectedTenantKey]);

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
