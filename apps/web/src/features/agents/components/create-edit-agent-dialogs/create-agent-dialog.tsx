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
import { Bot, LoaderCircle, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAgentsContext } from "@/providers/Agents";
import { useTenantContext } from "@/providers/Tenant";
import { AgentFieldsForm, AgentFieldsFormLoading } from "./agent-form";
import { Deployment } from "@/types/deployment";
import { Agent } from "@/types/agent";
import { getDeployments } from "@/lib/environment/deployments";
import { GraphSelect } from "./graph-select";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { FormProvider, useForm } from "react-hook-form";
import { useMcpServers } from "@/features/settings/hooks/use-mcp-servers";
import { useAuthContext } from "@/providers/Auth";

interface CreateAgentDialogProps {
  agentId?: string;
  deploymentId?: string;
  graphId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateAgentFormContent(props: {
  selectedGraph: Agent;
  selectedDeployment: Deployment;
  onClose: () => void;
}) {
  const { createAgent } = useAgents();
  const { refreshAgents } = useAgentsContext();
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
  const { servers: availableServers, loading: serversLoading } = useMcpServers();
  const [submitting, setSubmitting] = useState(false);
  // New agents start with no MCP tools selected
  const [selectedToolsByServer, setSelectedToolsByServer] = useState<Record<string, string[]>>({});

  const form = useForm<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>({
    defaultValues: async () => {
      const values = await getSchemaAndUpdateConfig(props.selectedGraph);
      return {
        name: "",
        description: "",
        config: values.config,
      };
    },
  });

  const handleSubmit = async (data: {
    name: string;
    description: string;
    config: Record<string, any>;
  }) => {
    const { name, description, config } = data;
    if (!name || !description) {
      toast.warning("Name and description are required", {
        richColors: true,
      });
      return;
    }

    let mcpServersPayload: unknown[] | undefined;

    if (hasMcpServers) {
      // Only include servers that have at least 1 tool selected
      const serverIdsWithTools = Object.entries(selectedToolsByServer)
        .filter(([, tools]) => tools.length > 0)
        .map(([id]) => id);

      if (serverIdsWithTools.length > 0) {
        // Fetch server snapshots (credentials remain encrypted)
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
            richColors: true,
          });
          return;
        }
        const snapshotData = await snapshotRes.json();
        // Augment each snapshot with its selected tools array
        const servers = (snapshotData.servers ?? []) as Record<string, unknown>[];
        mcpServersPayload = servers.map((snap) => {
          const snapTyped = snap as { id?: string; name?: string; slug?: string };
          const server =
            (snapTyped.id && availableServers.find((s) => s.id === snapTyped.id)) ||
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
        // Explicit empty array — new agent has no MCP servers
        mcpServersPayload = [];
      }
    }

    const configPayload: Record<string, any> = {
      ...config,
      tenant: selectedTenant?.tenantName,
    };

    // Only include mcp_servers if the graph schema declares it
    if (hasMcpServers) {
      configPayload.mcp_servers = mcpServersPayload;
    }

    setSubmitting(true);
    const newAgent = await createAgent(
      props.selectedDeployment.id,
      props.selectedGraph.graph_id,
      {
        name,
        description,
        config: configPayload,
      },
    );
    setSubmitting(false);

    if (!newAgent) {
      toast.error("Failed to create agent", {
        description: "Please try again",
        richColors: true,
      });
      return;
    }

    toast.success("Agent created successfully!", {
      richColors: true,
    });

    props.onClose();
    // Do not await so that the refresh is non-blocking
    refreshAgents();
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {loading ? (
        <AgentFieldsFormLoading />
      ) : (
        <FormProvider {...form}>
          <AgentFieldsForm
            agentId={props.selectedGraph.assistant_id}
            configurations={configurations}
            toolConfigurations={toolConfigurations}
            ragConfigurations={ragConfigurations}
            agentsConfigurations={agentsConfigurations}
            hasMcpServers={hasMcpServers}
            mcpServers={availableServers}
            mcpServersLoading={serversLoading}
            selectedToolsByServer={selectedToolsByServer}
            onMcpToolSelectionChange={setSelectedToolsByServer}
          />
        </FormProvider>
      )}
      <AlertDialogFooter>
        <Button
          onClick={(e) => {
            e.preventDefault();
            props.onClose();
          }}
          variant="outline"
          disabled={loading || submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex w-full items-center justify-center gap-1"
          disabled={loading || submitting}
        >
          {submitting ? <LoaderCircle className="animate-spin" /> : <Bot />}
          <span>{submitting ? "Creating..." : "Create Agent"}</span>
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

export function CreateAgentDialog({
  agentId,
  deploymentId,
  graphId,
  open,
  onOpenChange,
}: CreateAgentDialogProps) {
  const deployments = getDeployments();
  const { agents } = useAgentsContext();

  const [selectedDeployment, setSelectedDeployment] = useState<
    Deployment | undefined
  >();
  const [selectedGraph, setSelectedGraph] = useState<Agent | undefined>();

  useEffect(() => {
    if (selectedDeployment || selectedGraph) return;
    if (agentId && deploymentId && graphId) {
      // Find the deployment & default agent, then set them
      const deployment = deployments.find((d) => d.id === deploymentId);
      const defaultAgent = agents.find(
        (a) => a.assistant_id === agentId && a.deploymentId === deploymentId,
      );
      if (!deployment || !defaultAgent) {
        toast.error("Something went wrong. Please try again.", {
          richColors: true,
        });
        return;
      }

      setSelectedDeployment(deployment);
      setSelectedGraph(defaultAgent);
    }
  }, [
    agentId,
    deploymentId,
    graphId,
    agents,
    deployments,
    selectedDeployment,
    selectedGraph,
  ]);

  const [openCounter, setOpenCounter] = useState(0);

  const lastOpen = useRef(open);
  useLayoutEffect(() => {
    if (lastOpen.current !== open && open) {
      setOpenCounter((c) => c + 1);
    }
    lastOpen.current = open;
  }, [open, setOpenCounter]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <AlertDialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <AlertDialogTitle>Create Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Create a new agent for &apos;
                <span className="font-medium">{selectedGraph?.graph_id}</span>
                &apos; graph.
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel size="icon">
              <X className="size-4" />
            </AlertDialogCancel>
          </div>
        </AlertDialogHeader>

        {!agentId && !graphId && !deploymentId && (
          <div className="flex flex-col items-start justify-start gap-2">
            <p>Please select a graph to create an agent for.</p>
            <GraphSelect
              className="w-full"
              agents={agents}
              selectedGraph={selectedGraph}
              setSelectedGraph={setSelectedGraph}
              selectedDeployment={selectedDeployment}
              setSelectedDeployment={setSelectedDeployment}
            />
          </div>
        )}

        {selectedGraph && selectedDeployment ? (
          <CreateAgentFormContent
            key={`${openCounter}-${selectedGraph.assistant_id}`}
            selectedGraph={selectedGraph}
            selectedDeployment={selectedDeployment}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
