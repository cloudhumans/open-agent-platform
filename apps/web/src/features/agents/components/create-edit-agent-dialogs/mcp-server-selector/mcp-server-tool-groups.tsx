"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useMcpServers,
  McpServer,
} from "@/features/settings/hooks/use-mcp-servers";
import { useMcpServerTools } from "./use-mcp-server-tools";
import { ChevronDown } from "lucide-react";
import _ from "lodash";

// ---------------------------------------------------------------------------
// ServerToolList
// Fetches and renders toggle rows for a single server's tools.
// ---------------------------------------------------------------------------

interface ServerToolListProps {
  server: McpServer;
  selectedTools: string[];
  onToolToggle: (serverId: string, toolName: string, checked: boolean) => void;
  searchTerm?: string;
  tenant?: string;
}

function ServerToolList({
  server,
  selectedTools,
  onToolToggle,
  searchTerm,
  tenant,
}: ServerToolListProps) {
  const { tools, loading, error } = useMcpServerTools(server.id, tenant);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-2 text-sm text-destructive">
        Server unreachable — tools cannot be loaded.
      </p>
    );
  }

  const filteredTools = searchTerm
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : tools;

  if (filteredTools.length === 0 && searchTerm) {
    return null;
  }

  if (tools.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        No tools available on this server.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {filteredTools.map((tool) => {
        const checked = selectedTools.includes(tool.name);
        const id = `mcp-tool-${server.id}-${tool.name}`;
        return (
          <div
            key={tool.name}
            className="w-full space-y-2 border-b-[1px] py-4"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor={id} className="text-sm font-medium">
                {_.startCase(tool.name)}
              </Label>
              <Switch
                id={id}
                checked={checked}
                onCheckedChange={(val: boolean) =>
                  onToolToggle(server.id, tool.name, val)
                }
              />
            </div>
            {tool.description && (
              <p className="text-xs whitespace-pre-line text-gray-500">
                {tool.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// McpServerToolGroups
// Renders collapsible groups of MCP server tools with per-tool toggles.
// ---------------------------------------------------------------------------

export interface McpServerToolGroupsProps {
  selectedToolsByServer: Record<string, string[]>;
  onSelectionChange: (selection: Record<string, string[]>) => void;
  searchTerm?: string;
  tenant?: string;
}

export function McpServerToolGroups({
  selectedToolsByServer,
  onSelectionChange,
  searchTerm,
  tenant,
}: McpServerToolGroupsProps) {
  const { servers, loading } = useMcpServers();

  const handleToolToggle = (
    serverId: string,
    toolName: string,
    checked: boolean,
  ) => {
    const current = selectedToolsByServer[serverId] ?? [];
    const updated = checked
      ? Array.from(new Set([...current, toolName]))
      : current.filter((t) => t !== toolName);

    onSelectionChange({
      ...selectedToolsByServer,
      [serverId]: updated,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-[50%]" />
          </div>
        ))}
      </div>
    );
  }

  if (servers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {servers.map((server: McpServer) => {
        const selectedTools = selectedToolsByServer[server.id] ?? [];
        const selectedCount = selectedTools.length;

        return (
          <ServerGroup
            key={server.id}
            server={server}
            selectedTools={selectedTools}
            selectedCount={selectedCount}
            onToolToggle={handleToolToggle}
            searchTerm={searchTerm}
            tenant={tenant}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServerGroup
// A single collapsible server group — separated so tool fetching only happens
// when the group is present (always), but rendering is controlled by collapsible.
// ---------------------------------------------------------------------------

interface ServerGroupProps {
  server: McpServer;
  selectedTools: string[];
  selectedCount: number;
  onToolToggle: (serverId: string, toolName: string, checked: boolean) => void;
  searchTerm?: string;
  tenant?: string;
}

function ServerGroup({
  server,
  selectedTools,
  selectedCount,
  onToolToggle,
  searchTerm,
  tenant,
}: ServerGroupProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/50 transition-colors [&[data-state=open]>svg.chevron]:rotate-180">
        <ChevronDown className="chevron size-4 shrink-0 transition-transform" />
        <span className="text-sm font-semibold">{server.name}</span>
        {selectedCount > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {selectedCount} selected
          </Badge>
        )}
        {server.isDefault && (
          <Badge variant="outline" className={selectedCount > 0 ? "" : "ml-auto"}>
            Default
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6">
        <ServerToolList
          server={server}
          selectedTools={selectedTools}
          onToolToggle={onToolToggle}
          searchTerm={searchTerm}
          tenant={tenant}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
