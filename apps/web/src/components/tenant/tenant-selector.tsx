"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTenantContext } from "@/providers/Tenant";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

export function TenantSelector({ className }: { className?: string }) {
  const {
    tenants,
    selectedTenantKey,
    setSelectedTenantKey,
    selectedTenant,
  } = useTenantContext();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const sortedTenants = useMemo(
    () =>
      [...tenants].sort((a, b) =>
        a.tenantName.localeCompare(b.tenantName, undefined, {
          sensitivity: "base",
        }),
      ),
    [tenants],
  );

  const resolvedSelectedTenant = selectedTenant ?? null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!tenants.length) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 px-2 pb-2 pt-1 text-xs text-muted-foreground",
          className,
        )}
      >
        <span className="font-medium text-foreground">Tenant</span>
        <span className="text-xs">No tenants configured</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1 px-2 pb-2", className)}>
      <Label className="text-xs font-medium text-foreground">Tenant</Label>
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 w-full justify-between"
          >
            <span className="truncate">
              {isMounted && resolvedSelectedTenant?.tenantName
                ? resolvedSelectedTenant.tenantName
                : "Select tenant"}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[240px] p-0"
        >
          <Command>
            <CommandInput placeholder="Search tenants..." />
            <CommandList>
              <CommandEmpty>No tenants found.</CommandEmpty>
              {sortedTenants.map((tenant) => (
                <CommandItem
                  key={tenant.key}
                  value={tenant.tenantName}
                  onSelect={() => {
                    setSelectedTenantKey(tenant.key);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      tenant.key === selectedTenantKey
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{tenant.tenantName}</span>
                    {tenant.cloudchatInstances?.[0]?.accountName && (
                      <span className="text-xs text-muted-foreground">
                        {tenant.cloudchatInstances[0].accountName}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
