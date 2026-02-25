"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useMcpServers,
  McpServer,
} from "@/features/settings/hooks/use-mcp-servers";
import { useMcpServerTools, Tool } from "./use-mcp-server-tools";
import { ChevronDown } from "lucide-react";
import { useEffect } from "react";

// -------------------------------------------------------------------------
// ServerToolPreview
// Fetches and renders the tool list for a single selected server.
// -------------------------------------------------------------------------

interface ServerToolPreviewProps {
  server: McpServer;
  onUnreachable: (id: string) => void;
}

function ServerToolPreview({ server, onUnreachable }: ServerToolPreviewProps) {
  const { tools, loading, error } = useMcpServerTools(server.id);

  useEffect(() => {
    if (error) {
      onUnreachable(server.id);
    }
  }, [error, server.id, onUnreachable]);

  if (loading) {
    return (
      <p className="ml-7 text-xs text-muted-foreground">Loading tools...</p>
    );
  }

  if (error) {
    return (
      <p className="ml-7 text-xs text-destructive">Server unreachable</p>
    );
  }

  return (
    <Collapsible className="ml-7">
      <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" />
        <span>
          {tools.length} {tools.length === 1 ? "tool" : "tools"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1 space-y-1">
        {tools.map((tool: Tool) => (
          <div
            key={tool.name}
            className="py-0.5"
          >
            <p className="text-sm font-medium">{tool.name}</p>
            {tool.description && (
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            )}
          </div>
        ))}
        {tools.length === 0 && (
          <p className="text-xs text-muted-foreground">No tools available.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// -------------------------------------------------------------------------
// ServerRow
// Renders a single server as a checkbox row, with tool preview when checked.
// -------------------------------------------------------------------------

interface ServerRowProps {
  server: McpServer;
  isSelected: boolean;
  isDisabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  onUnreachable: (id: string) => void;
}

function ServerRow({
  server,
  isSelected,
  isDisabled,
  onCheckedChange,
  onUnreachable,
}: ServerRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Checkbox
          id={`mcp-server-${server.id}`}
          checked={isSelected}
          disabled={isDisabled}
          onCheckedChange={(checked) => onCheckedChange(checked === true)}
        />
        <div className="flex flex-col gap-0.5">
          <label
            htmlFor={`mcp-server-${server.id}`}
            className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {server.name}
            {server.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </label>
          <p className="text-xs text-muted-foreground">{server.url}</p>
        </div>
      </div>
      {isSelected && (
        <ServerToolPreview
          server={server}
          onUnreachable={onUnreachable}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// McpServerSelector
// Main component: checkbox list of available MCP servers with tool preview.
// -------------------------------------------------------------------------

export interface McpServerSelectorProps {
  selectedServerIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function McpServerSelector({
  selectedServerIds,
  onSelectionChange,
}: McpServerSelectorProps) {
  const { servers, loading } = useMcpServers();

  const handleCheckedChange = (serverId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedServerIds, serverId]);
    } else {
      onSelectionChange(selectedServerIds.filter((id) => id !== serverId));
    }
  };

  const handleUnreachable = (serverId: string) => {
    // Remove from selection if unreachable
    if (selectedServerIds.includes(serverId)) {
      onSelectionChange(selectedServerIds.filter((id) => id !== serverId));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
          >
            <Skeleton className="h-4 w-4 rounded-sm" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No MCP servers configured. Add servers in Settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {servers.map((server) => {
        const isSelected = selectedServerIds.includes(server.id);
        return (
          <ServerRow
            key={server.id}
            server={server}
            isSelected={isSelected}
            isDisabled={false}
            onCheckedChange={(checked) =>
              handleCheckedChange(server.id, checked)
            }
            onUnreachable={handleUnreachable}
          />
        );
      })}
    </div>
  );
}
