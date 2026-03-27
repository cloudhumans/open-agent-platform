"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/providers/Auth";
import { useTenantContext } from "@/providers/Tenant";

export interface McpServer {
  id: string;
  name: string;
  slug: string;
  url: string;
  authType: "none" | "bearer" | "apiKey";
  credentials: string | null;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UseMcpServersReturn {
  servers: McpServer[];
  loading: boolean;
  error: string | null;
  addServer: (body: Record<string, unknown>) => Promise<void>;
  updateServer: (id: string, body: Record<string, unknown>) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMcpServers(): UseMcpServersReturn {
  const { session } = useAuthContext();
  const { selectedTenantId } = useTenantContext();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }
    if (selectedTenantId) {
      headers["x-tenant-name"] = selectedTenantId;
    }
    return headers;
  }, [session?.accessToken, selectedTenantId]);

  const fetchServers = useCallback(async () => {
    if (!selectedTenantId) {
      setLoading(false);
      setServers([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mcp-servers", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServers(data.servers ?? []);
    } catch (err) {
      console.error("[useMcpServers] Failed to load:", err);
      setError("Failed to load MCP servers");
      toast.error("Failed to load MCP servers");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedTenantId]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const addServer = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/mcp-servers", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const newServer: McpServer = await res.json();
        setServers((prev) => [...prev, newServer]);
        toast.success("Server added");
      } catch (err) {
        console.error("[useMcpServers] Failed to add:", err);
        toast.error("Failed to add server");
      }
    },
    [getAuthHeaders],
  );

  const updateServer = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/mcp-servers/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated: McpServer = await res.json();
        setServers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        toast.success("Server updated");
      } catch (err) {
        console.error("[useMcpServers] Failed to update:", err);
        toast.error("Failed to update server");
      }
    },
    [getAuthHeaders],
  );

  const deleteServer = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mcp-servers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setServers((prev) => prev.filter((s) => s.id !== id));
      toast.success("Server deleted");
    } catch (err) {
      console.error("[useMcpServers] Failed to delete:", err);
      toast.error("Failed to delete server");
    }
  }, [getAuthHeaders]);

  return {
    servers,
    loading,
    error,
    addServer,
    updateServer,
    deleteServer,
    refetch: fetchServers,
  };
}
