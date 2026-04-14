"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
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
  const [customHeaders, setCustomHeaders] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [visibleHeaders, setVisibleHeaders] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const addHeader = useCallback(() => {
    setCustomHeaders((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const removeHeader = useCallback((index: number) => {
    setCustomHeaders((prev) => prev.filter((_, i) => i !== index));
    setVisibleHeaders((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  }, []);

  const toggleHeaderVisibility = useCallback((index: number) => {
    setVisibleHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const updateHeader = useCallback(
    (index: number, field: "key" | "value", val: string) => {
      setCustomHeaders((prev) =>
        prev.map((h, i) => (i === index ? { ...h, [field]: val } : h)),
      );
    },
    [],
  );

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setName(server?.name ?? "");
      setUrl(server?.url ?? "");
      setAuthType(server?.authType ?? "none");
      setCredentials(""); // CRITICAL: never pre-fill with masked value
      // Pre-fill custom headers from existing server
      const existing = server?.customHeaders ?? {};
      const entries = Object.entries(existing);
      setCustomHeaders(
        entries.length > 0
          ? entries.map(([key, value]) => ({ key, value }))
          : [],
      );
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
    // Convert custom headers array to plain object, skipping empty keys
    const headersObj: Record<string, string> = {};
    for (const h of customHeaders) {
      const k = h.key.trim();
      if (k) headersObj[k] = h.value;
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      url: url.trim(),
      customHeaders: headersObj,
    };

    if (authType === "none") {
      body.authType = "none";
      body.credentials = null;
    } else if (!isEditMode) {
      // Create mode: always send authType and credentials
      body.authType = authType;
      if (credentials !== "") {
        body.credentials = credentials;
      }
    } else {
      // Edit mode: only send auth fields when something changed
      if (credentials !== "") {
        body.authType = authType;
        body.credentials = credentials;
      } else if (authType !== server?.authType) {
        body.authType = authType;
      }
    }

    setSaving(true);
    try {
      await onSave(body);
      setOpen(false);
    } catch {
      toast.error("Failed to save MCP server", {
        description: "Please try again",
        richColors: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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

          {/* Custom Headers */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Custom Headers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHeader}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Header
              </Button>
            </div>
            {customHeaders.map((header, index) => {
              const isVisible = visibleHeaders.has(index);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={header.key}
                    onChange={(e) =>
                      updateHeader(index, "key", e.target.value)
                    }
                    placeholder="Header name"
                    className="flex-1"
                  />
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? "text" : "password"}
                      value={header.value}
                      onChange={(e) =>
                        updateHeader(index, "value", e.target.value)
                      }
                      placeholder="Value"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => toggleHeaderVisibility(index)}
                      aria-label={
                        isVisible ? "Hide header value" : "Show header value"
                      }
                      aria-pressed={isVisible}
                      tabIndex={-1}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {isVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeader(index)}
                    className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
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
