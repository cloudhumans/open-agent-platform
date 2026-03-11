"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { McpServer } from "../../hooks/use-mcp-servers";

interface McpServerRowProps {
  server: McpServer;
  onToggle: (id: string, enabled: boolean) => void;
  actions?: React.ReactNode;
}

export function McpServerRow({
  server,
  onToggle,
  actions,
}: McpServerRowProps): React.ReactNode {
  return (
    <div className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
      {/* Left: name + badge + URL */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{server.name}</span>
          {server.isDefault && (
            <Badge variant="secondary" className="text-xs">
              Default
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground text-xs">{server.url}</span>
      </div>

      {/* Right: toggle + actions slot */}
      <div className="flex items-center gap-2">
        <Switch
          checked={server.enabled}
          onCheckedChange={(checked: boolean) => onToggle(server.id, checked)}
          disabled={server.isDefault}
        />
        {actions}
      </div>
    </div>
  );
}
