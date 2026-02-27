import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAgents } from "@/hooks/use-agents";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { Bot, LoaderCircle, Trash, X } from "lucide-react";
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
import { toServerSlug, deduplicateSlugs } from "@/lib/mcp-slug";

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
  const [selectedToolsByServer, setSelectedToolsByServer] = useState<Record<string, string[]>>({});

  // For pre-populating selected servers on edit: match existing snapshot names to current server IDs
  const { servers: availableServers, loading: serversLoading } = useMcpServers();

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
  // a stored snapshot and the current live server list.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (!hasMcpServers) return;
    if (availableServers.length === 0) return;

    initializedRef.current = true;

    const rawSnapshot = (agent.config?.configurable?.mcp_servers ?? []) as unknown;
    const existingSnapshot: { id?: string; name?: string; tools?: string[] }[] = Array.isArray(rawSnapshot) ? rawSnapshot : [];
    if (existingSnapshot.length > 0) {
      // Compute slugs to strip prefixes from stored tool names
      const snapshotSlugs = deduplicateSlugs(
        existingSnapshot.map((s) => toServerSlug(s.name ?? ""))
      );
      const toolsByServer: Record<string, string[]> = {};
      for (let i = 0; i < existingSnapshot.length; i++) {
        const snap = existingSnapshot[i];
        const slug = snapshotSlugs[i];
        const prefix = `${slug}__`;
        // Match by id first, fall back to name (for snapshots saved before id was added)
        const server =
          (snap.id && availableServers.find((s) => s.id === snap.id)) ||
          availableServers.find((s) => s.name === snap.name);
        if (server && Array.isArray(snap.tools) && snap.tools.length > 0) {
          toolsByServer[server.id] = snap.tools.map((t) =>
            t.startsWith(prefix) ? t.slice(prefix.length) : t
          );
        }
      }
      if (Object.keys(toolsByServer).length > 0) {
        setSelectedToolsByServer(toolsByServer);
      }
    }
  }, [hasMcpServers, availableServers, agent.config?.configurable?.mcp_servers]);

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

      if (serverIdsWithTools.length > 0) {
        // Fetch decrypted server snapshots for selected servers
        const qs = serverIdsWithTools.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
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
        const servers = (snapshotData.servers ?? []) as Record<string, unknown>[];
        mcpServersPayload = servers.map((snap) => {
          const snapTyped = snap as { id?: string; name?: string };
          const server =
            (snapTyped.id && availableServers.find((s) => s.id === snapTyped.id)) ||
            availableServers.find((s) => s.name === snapTyped.name);
          return {
            ...snap,
            tools: server ? (selectedToolsByServer[server.id] ?? []) : [],
          };
        });

        // Prefix tool names with server slugs so claudia-agentic can filter with Set.has()
        const slugs = deduplicateSlugs(
          (mcpServersPayload as { name?: string }[]).map((s) => toServerSlug(s.name ?? ""))
        );
        mcpServersPayload = (mcpServersPayload as Record<string, unknown>[]).map((server, i) => ({
          ...server,
          tools: ((server.tools as string[]) ?? []).map((t) => `${slugs[i]}__${t}`),
        }));
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
    <AlertDialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <AlertDialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <AlertDialogTitle>Edit Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Edit the agent for &apos;
                <span className="font-medium">{agent.graph_id}</span>&apos;
                graph.
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel size="icon">
              <X className="size-4" />
            </AlertDialogCancel>
          </div>
        </AlertDialogHeader>
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
              selectedToolsByServer={selectedToolsByServer}
              onMcpToolSelectionChange={setSelectedToolsByServer}
              tenant={selectedTenant?.tenantName}
            />
          </FormProvider>
        )}
        <AlertDialogFooter>
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
            disabled={loading || form.formState.isSubmitting}
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
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
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
      <AlertDialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <EditAgentDialogContent
          key={openCounter}
          agent={agent}
          onClose={() => onOpenChange(false)}
          onStaleSupervisors={() => setShowStaleWarning(true)}
        />
      </AlertDialog>
      <StaleSupervisorsWarningDialog
        open={showStaleWarning}
        onOpenChange={setShowStaleWarning}
      />
    </>
  );
}
