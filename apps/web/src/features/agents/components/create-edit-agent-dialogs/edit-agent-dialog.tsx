import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgents } from "@/hooks/use-agents";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { Bot, LoaderCircle, Trash } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAgentsContext } from "@/providers/Agents";
import { useTenantContext } from "@/providers/Tenant";
import { AgentFieldsForm, AgentFieldsFormLoading } from "./agent-form";
import { Agent } from "@/types/agent";
import { FormProvider, useForm } from "react-hook-form";
import { hasStaleSupervisors } from "@/lib/agent-utils";
import { StaleSupervisorsWarningDialog } from "./stale-supervisors-warning-dialog";
import { useMcpServers } from "@/features/settings/hooks/use-mcp-servers";
import { useAuthContext } from "@/providers/Auth";

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditAgentDialogContent({
  agent,
  onClose,
  onStaleSupervisors,
}: {
  agent: Agent;
  onClose: () => void;
  onStaleSupervisors: () => void;
}) {
  const { updateAgent, deleteAgent } = useAgents();
  const { agents, refreshAgents } = useAgentsContext();
  const {
    getSchemaAndUpdateConfig,

    loading,
    configurations,
    toolConfigurations,
    ragConfigurations,
    agentsConfigurations,
    hasMcpServers,
  } = useAgentConfig();
  const { selectedTenant, selectedTenantId } = useTenantContext();
  const { session } = useAuthContext();
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [selectedToolsByServer, setSelectedToolsByServer] = useState<
    Record<string, string[]>
  >({});

  // For pre-populating selected servers on edit: match existing snapshot names to current server IDs
  const {
    servers: availableServers,
    loading: serversLoading,
    error: serversError,
    refetch: refetchServers,
  } = useMcpServers();

  const form = useForm<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>({
    defaultValues: async () => {
      const values = await getSchemaAndUpdateConfig(agent);
      return {
        ...values,
      };
    },
  });

  // Pre-populate selectedToolsByServer from the existing snapshot once both the server list
  // and schema detection are ready. Match by name — the most stable identifier across
  // a stored snapshot and the current live server list. Gated by userTouchedToolsRef so
  // a post-Retry refetch re-runs init without clobbering the user's in-flight edits.
  const userTouchedToolsRef = useRef(false);

  const handleToolSelectionChange = (selection: Record<string, string[]>) => {
    userTouchedToolsRef.current = true;
    setSelectedToolsByServer(selection);
  };

  useEffect(() => {
    if (userTouchedToolsRef.current) return;
    if (!hasMcpServers) return;
    if (availableServers.length === 0) return;

    const rawSnapshot = agent.config?.configurable?.mcp_servers as unknown;
    const existingSnapshot: {
      id?: string;
      name?: string;
      slug?: string;
      tools?: string[];
    }[] = Array.isArray(rawSnapshot) ? rawSnapshot : [];
    if (existingSnapshot.length > 0) {
      // New format: mcp_servers array with slug-prefixed tool names
      const toolsByServer: Record<string, string[]> = {};
      for (const snap of existingSnapshot) {
        // Match by id first, fall back to name (for snapshots saved before id was added)
        const server =
          (snap.id && availableServers.find((s) => s.id === snap.id)) ||
          availableServers.find((s) => s.name === snap.name);
        const slug = snap.slug ?? server?.slug ?? "";
        const prefix = slug ? `${slug}__` : "";
        if (server && Array.isArray(snap.tools) && snap.tools.length > 0) {
          toolsByServer[server.id] = snap.tools.map((t) =>
            prefix && t.startsWith(prefix) ? t.slice(prefix.length) : t,
          );
        }
      }
      if (Object.keys(toolsByServer).length > 0) {
        setSelectedToolsByServer(toolsByServer);
      }
    } else if (!Array.isArray(rawSnapshot)) {
      // Legacy format (mcp_servers absent, not empty array): single mcp_config with url + unprefixed tool names
      const legacyConfig = agent.config?.configurable?.mcp_config as
        | { url?: string; tools?: string[] }
        | undefined;
      if (
        legacyConfig?.url &&
        Array.isArray(legacyConfig.tools) &&
        legacyConfig.tools.length > 0
      ) {
        const normalizeUrl = (u: string) =>
          u.endsWith("/mcp") ? u : `${u}/mcp`;
        const legacyUrl = normalizeUrl(legacyConfig.url);
        const server = availableServers.find(
          (s) => normalizeUrl(s.url) === legacyUrl,
        );
        if (server) {
          setSelectedToolsByServer({ [server.id]: legacyConfig.tools });
        }
      }
    }
  }, [
    hasMcpServers,
    availableServers,
    agent.config?.configurable?.mcp_servers,
  ]);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    config: Record<string, any>;
  }) => {
    if (!data.name || !data.description) {
      toast.warning("Name and description are required");
      return;
    }

    let mcpServersPayload: unknown[] | undefined;

    if (hasMcpServers) {
      // Only include servers that have at least 1 tool selected
      const serverIdsWithTools = Object.entries(selectedToolsByServer)
        .filter(([, tools]) => tools.length > 0)
        .map(([id]) => id);

      // Guard against silent tool wipe. Check the agent's *stored* snapshot directly
      // (not init-time refs, which never fire when availableServers is empty — the most
      // common cause of silent wipes: env/tenant misconfig, deleted/renamed servers, or
      // a transient fetch failure).
      const storedSnapshot = agent.config?.configurable?.mcp_servers as
        | { tools?: unknown[] }[]
        | undefined;
      const legacyStored = agent.config?.configurable?.mcp_config as
        | { tools?: unknown[] }
        | undefined;
      const storedHadTools =
        (Array.isArray(storedSnapshot) &&
          storedSnapshot.some(
            (s) => Array.isArray(s?.tools) && s.tools.length > 0,
          )) ||
        (Array.isArray(legacyStored?.tools) && legacyStored.tools.length > 0);

      if (
        storedHadTools &&
        !userTouchedToolsRef.current &&
        serverIdsWithTools.length === 0
      ) {
        toast.error("Could not restore the agent's MCP tools", {
          description:
            "The MCP servers on this agent aren't available in the current list (check tenant, env vars, or server deletions). Saving now would clear tools.",
        });
        return;
      }

      if (serverIdsWithTools.length > 0) {
        // Fetch server snapshots (credentials remain encrypted)
        const qs = serverIdsWithTools
          .map((id) => `ids[]=${encodeURIComponent(id)}`)
          .join("&");
        const snapshotHeaders: HeadersInit = {};
        if (session?.accessToken) {
          snapshotHeaders["Authorization"] = `Bearer ${session.accessToken}`;
        }
        if (selectedTenantId) {
          snapshotHeaders["x-tenant-name"] = selectedTenantId;
        }
        const snapshotRes = await fetch(`/api/mcp-servers/snapshot?${qs}`, {
          headers: snapshotHeaders,
        });
        if (!snapshotRes.ok) {
          toast.error("Failed to fetch MCP server configuration", {
            description: "Please try again",
          });
          return;
        }
        const snapshotData = await snapshotRes.json();
        // Augment each snapshot with its selected tools array
        const servers = (snapshotData.servers ?? []) as Record<
          string,
          unknown
        >[];
        mcpServersPayload = servers.map((snap) => {
          const snapTyped = snap as {
            id?: string;
            name?: string;
            slug?: string;
          };
          const server =
            (snapTyped.id &&
              availableServers.find((s) => s.id === snapTyped.id)) ||
            availableServers.find((s) => s.name === snapTyped.name);
          const slug = snapTyped.slug ?? "";
          return {
            ...snap,
            tools: (server ? (selectedToolsByServer[server.id] ?? []) : []).map(
              (t) => `${slug}__${t}`,
            ),
          };
        });
      } else {
        // Explicit empty array — agent has no MCP servers assigned
        mcpServersPayload = [];
      }
    }

    const configPayload: Record<string, any> = {
      ...data.config,
      tenant: selectedTenant?.tenantName,
    };

    // Only include mcp_servers if the graph schema declares it
    if (hasMcpServers) {
      configPayload.mcp_servers = mcpServersPayload;
      // Remove legacy mcp_config so the agent fully migrates to the new format
      delete configPayload.mcp_config;
    }

    const updatedAgent = await updateAgent(
      agent.assistant_id,
      agent.deploymentId,
      {
        ...data,
        config: configPayload,
      },
    );

    if (!updatedAgent) {
      toast.error("Failed to update agent", {
        description: "Please try again",
      });
      return;
    }

    toast.success("Agent updated successfully!");

    if (hasStaleSupervisors(agent, data, agents)) {
      onStaleSupervisors();
    }

    onClose();
    refreshAgents();
  };

  const handleDelete = async () => {
    setDeleteSubmitting(true);
    const deleted = await deleteAgent(agent.deploymentId, agent.assistant_id);
    setDeleteSubmitting(false);

    if (!deleted) {
      toast.error("Failed to delete agent", {
        description: "Please try again",
      });
      return;
    }

    toast.success("Agent deleted successfully!");

    onClose();
    refreshAgents();
  };

  return (
    <DialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <DialogHeader>
          <div className="flex flex-col gap-1.5">
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Edit the agent for &apos;
              <span className="font-medium">{agent.graph_id}</span>&apos; graph.
            </DialogDescription>
          </div>
        </DialogHeader>
        {loading ? (
          <AgentFieldsFormLoading />
        ) : (
          <FormProvider {...form}>
            <AgentFieldsForm
              configurations={configurations}
              toolConfigurations={toolConfigurations}
              agentId={agent.assistant_id}
              ragConfigurations={ragConfigurations}
              agentsConfigurations={agentsConfigurations}
              hasMcpServers={hasMcpServers}
              mcpServers={availableServers}
              mcpServersLoading={serversLoading}
              mcpServersError={serversError}
              onMcpServersRetry={refetchServers}
              selectedToolsByServer={selectedToolsByServer}
              onMcpToolSelectionChange={handleToolSelectionChange}
            />
          </FormProvider>
        )}
        <DialogFooter>
          <Button
            onClick={handleDelete}
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || deleteSubmitting}
            variant="destructive"
          >
            {deleteSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Trash />
            )}
            <span>{deleteSubmitting ? "Deleting..." : "Delete Agent"}</span>
          </Button>
          <Button
            type="submit"
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || serversLoading || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Bot />
            )}
            <span>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function EditAgentDialog({
  agent,
  open,
  onOpenChange,
}: EditAgentDialogProps) {
  const [openCounter, setOpenCounter] = useState(0);
  const [showStaleWarning, setShowStaleWarning] = useState(false);

  const lastOpen = useRef(open);
  useLayoutEffect(() => {
    if (lastOpen.current !== open && open) {
      setOpenCounter((c) => c + 1);
    }
    lastOpen.current = open;
  }, [open, setOpenCounter]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <EditAgentDialogContent
          key={openCounter}
          agent={agent}
          onClose={() => onOpenChange(false)}
          onStaleSupervisors={() => setShowStaleWarning(true)}
        />
      </Dialog>
      <StaleSupervisorsWarningDialog
        open={showStaleWarning}
        onOpenChange={setShowStaleWarning}
      />
    </>
  );
}
