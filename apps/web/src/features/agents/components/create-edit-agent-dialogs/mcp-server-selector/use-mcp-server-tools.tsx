"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/providers/Auth";
import { useTenantContext } from "@/providers/Tenant";

export interface Tool {
  name: string;
  description?: string;
}

interface UseMcpServerToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the tool list for a single MCP server via the server-side proxy API.
 * The proxy handles credential decryption so credentials never reach the browser.
 *
 * @param serverId - The ID of the MCP server, or null to skip fetching.
 */
export function useMcpServerTools(
  serverId: string | null,
): UseMcpServerToolsReturn {
  const { session } = useAuthContext();
  const { selectedTenantId } = useTenantContext();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCounter, setFetchCounter] = useState(0);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (serverId === null) {
      setTools([]);
      setLoading(false);
      setError(null);
      return;
    }

    let aborted = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `/api/mcp-servers/${serverId}/tools`;

        const headers: HeadersInit = {};
        if (session?.accessToken) {
          headers["Authorization"] = `Bearer ${session.accessToken}`;
        }
        if (selectedTenantId) {
          headers["x-tenant-name"] = selectedTenantId;
        }

        const res = await fetch(url, { headers });
        if (aborted) return;

        if (!res.ok) {
          setError("Unreachable");
          setTools([]);
          return;
        }

        const data = await res.json();
        if (aborted) return;

        const parsed: Tool[] = (data.tools ?? []).map(
          (t: { name: string; description?: string }) => ({
            name: t.name,
            description: t.description,
          }),
        );
        setTools(parsed);
      } catch {
        if (!aborted) {
          setError("Unreachable");
          setTools([]);
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      aborted = true;
    };
  }, [serverId, fetchCounter, session?.accessToken, selectedTenantId]);

  return { tools, loading, error, refetch };
}
