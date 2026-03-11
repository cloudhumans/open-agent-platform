"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { McpServer } from "../../hooks/use-mcp-servers";

interface McpServerFormDialogProps {
  server?: McpServer;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  trigger: React.ReactNode;
}

export function McpServerFormDialog({
  server,
  onSave,
  trigger,
}: McpServerFormDialogProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<"none" | "bearer" | "apiKey">(
    "none",
  );
  const [credentials, setCredentials] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setName(server?.name ?? "");
      setUrl(server?.url ?? "");
      setAuthType(server?.authType ?? "none");
      setCredentials(""); // CRITICAL: never pre-fill with masked value
    }
  }, [open, server]);

  const isEditMode = Boolean(server);

  const isValid =
    name.trim().length > 0 &&
    url.trim().length > 0 &&
    (authType === "none" ||
      isEditMode || // in edit mode, empty credentials means "don't change"
      credentials.trim().length > 0);

  function handleAuthTypeChange(value: string) {
    const newType = value as "none" | "bearer" | "apiKey";
    setAuthType(newType);
    if (newType === "none") {
      setCredentials(""); // Pitfall 5: clear stale credentials
    }
  }

  async function handleSubmit() {
    const body: Record<string, unknown> = {
      name: name.trim(),
      url: url.trim(),
      authType,
    };

    if (authType === "none") {
      body.credentials = null;
    } else if (credentials !== "") {
      // Pitfall 1: only include credentials if user actually typed something
      body.credentials = credentials;
    }
    // In edit mode with empty credentials: omit credentials entirely

    setSaving(true);
    try {
      await onSave(body);
      setOpen(false);
    } catch {
      // Keep dialog open on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      {/* Render trigger as-is wrapped in a span to avoid nesting issues */}
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        style={{ display: "contents" }}
      >
        {trigger}
      </span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit MCP Server" : "Add MCP Server"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name field */}
          <div className="grid gap-2">
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Server"
            />
          </div>

          {/* URL field */}
          <div className="grid gap-2">
            <Label htmlFor="mcp-url">URL</Label>
            <Input
              id="mcp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mcp.example.com/sse"
            />
          </div>

          {/* Auth Type field */}
          <div className="grid gap-2">
            <Label htmlFor="mcp-auth-type">Auth Type</Label>
            <Select
              value={authType}
              onValueChange={handleAuthTypeChange}
            >
              <SelectTrigger id="mcp-auth-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apiKey">API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Credentials field (conditional) */}
          {authType !== "none" && (
            <div className="grid gap-2">
              <Label htmlFor="mcp-credentials">
                {authType === "bearer" ? "Bearer Token" : "API Key"}
                {isEditMode && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    (re-enter to change)
                  </span>
                )}
              </Label>
              <Input
                id="mcp-credentials"
                type="password"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder={server?.credentials ?? ""}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={saving || !isValid}
          >
            {isEditMode ? "Save Changes" : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
