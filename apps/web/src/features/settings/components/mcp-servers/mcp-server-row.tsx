"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import type { McpServer } from "../../hooks/use-mcp-servers";

interface McpServerRowProps {
  server: McpServer;
  actions?: React.ReactNode;
}

export function McpServerRow({
  server,
  actions,
}: McpServerRowProps): React.ReactNode {
  return (
    <div className="hover:bg-muted/50 flex items-center justify-between rounded-md p-2">
      {/* Left: name + badge + URL */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{server.name}</span>
          {server.isDefault && (
            <Badge
              variant="secondary"
              className="text-xs"
            >
              Default
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground text-xs">{server.url}</span>
      </div>

      {/* Right: actions slot */}
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
