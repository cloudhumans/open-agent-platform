"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface McpServer {
  id: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "apiKey";
  credentials: string | null;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UseMcpServersReturn {
  servers: McpServer[];
  loading: boolean;
  error: string | null;
  addServer: (body: Omit<McpServer, "id" | "isDefault" | "createdAt" | "updatedAt">) => Promise<void>;
  updateServer: (id: string, body: Partial<Omit<McpServer, "id" | "isDefault" | "createdAt" | "updatedAt">>) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  toggleServer: (id: string, enabled: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMcpServers(): UseMcpServersReturn {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mcp-servers");
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
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const addServer = useCallback(
    async (body: Omit<McpServer, "id" | "isDefault" | "createdAt" | "updatedAt">) => {
      try {
        const res = await fetch("/api/mcp-servers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    [],
  );

  const updateServer = useCallback(
    async (id: string, body: Partial<Omit<McpServer, "id" | "isDefault" | "createdAt" | "updatedAt">>) => {
      try {
        const res = await fetch(`/api/mcp-servers/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
    [],
  );

  const deleteServer = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mcp-servers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setServers((prev) => prev.filter((s) => s.id !== id));
      toast.success("Server deleted");
    } catch (err) {
      console.error("[useMcpServers] Failed to delete:", err);
      toast.error("Failed to delete server");
    }
  }, []);

  const toggleServer = useCallback(async (id: string, enabled: boolean) => {
    // Optimistic update
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
    try {
      const res = await fetch(`/api/mcp-servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Rollback on failure
      console.error("[useMcpServers] Failed to toggle:", err);
      setServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s)),
      );
      toast.error("Failed to update server");
    }
  }, []);

  return {
    servers,
    loading,
    error,
    addServer,
    updateServer,
    deleteServer,
    toggleServer,
    refetch: fetchServers,
  };
}
