"use client";

import React from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { McpServer } from "../../hooks/use-mcp-servers";
import { McpServerFormDialog } from "./mcp-server-form-dialog";
import { DeleteServerAlert } from "./delete-server-alert";

interface McpServerActionsProps {
  server: McpServer;
  onEdit: (id: string, body: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
}

export function McpServerActions({
  server,
  onEdit,
  onDelete,
}: McpServerActionsProps): React.ReactNode {
  return (
    <Popover>
      <PopoverTrigger
        asChild
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1"
        align="end"
      >
        <div className="flex flex-col space-y-1">
          <McpServerFormDialog
            server={server}
            onSave={(body) => onEdit(server.id, body)}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start px-2 py-1.5 text-sm"
              >
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </Button>
            }
          />
          <DeleteServerAlert
            serverName={server.name}
            onDelete={() => onDelete(server.id)}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start px-2 py-1.5 text-sm"
              >
                <Trash2 className="text-destructive mr-2 h-4 w-4" />
                <span>Delete</span>
              </Button>
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
