"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { McpServerRow } from "./mcp-server-row";
import { McpServerFormDialog } from "./mcp-server-form-dialog";
import type { McpServer } from "../../hooks/use-mcp-servers";

interface McpServerListProps {
  servers: McpServer[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  renderActions?: (server: McpServer) => React.ReactNode;
  onAdd?: (body: Record<string, unknown>) => Promise<void>;
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
          <McpServerFormDialog
            onSave={onAdd}
            trigger={
              <Button
                variant="outline"
                size="sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Server
              </Button>
            }
          />
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
