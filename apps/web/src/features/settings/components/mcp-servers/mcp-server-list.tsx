"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { McpServerRow } from "./mcp-server-row";
import type { McpServer } from "../../hooks/use-mcp-servers";

interface McpServerListProps {
  servers: McpServer[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  renderActions?: (server: McpServer) => React.ReactNode;
  onAdd?: () => void;
}

export function McpServerList({
  servers,
  loading,
  onToggle,
  renderActions,
  onAdd,
}: McpServerListProps): React.ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Manage MCP server connections for your agents.
        </p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm"
          >
            Add Server
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md p-2"
            >
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {servers.map((server) => (
            <McpServerRow
              key={server.id}
              server={server}
              onToggle={onToggle}
              actions={renderActions?.(server)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
