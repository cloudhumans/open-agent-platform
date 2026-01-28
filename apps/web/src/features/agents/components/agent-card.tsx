"use client";

import { useState } from "react";
import {
  Bot,
  Brain,
  Cloud,
  Edit,
  MessageSquare,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent } from "@/types/agent";
import { EditAgentDialog } from "./create-edit-agent-dialogs/edit-agent-dialog";
import _ from "lodash";
import NextLink from "next/link";
import { Badge } from "@/components/ui/badge";
import { getDeployments } from "@/lib/environment/deployments";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isUserCreatedDefaultAssistant } from "@/lib/agent-utils";
import { cn } from "@/lib/utils";

function SupportedConfigBadge({
  type,
}: {
  type: "rag" | "tools" | "supervisor";
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {type === "rag" && (
            <Badge variant="brand">
              <Brain />
              RAG
            </Badge>
          )}
          {type === "tools" && (
            <Badge variant="info">
              <Wrench />
              MCP Tools
            </Badge>
          )}
          {type === "supervisor" && (
            <Badge variant="brand">
              <User />
              Supervisor
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>This agent supports {type}.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AgentCardProps {
  agent: Agent;
  showDeployment?: boolean;
}

export function AgentCard({ agent, showDeployment }: AgentCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deployments = getDeployments();
  const selectedDeployment = deployments.find(
    (d) => d.id === agent.deploymentId,
  );

  const isDefaultAgent = isUserCreatedDefaultAssistant(agent);

  let displayName = agent.name;
  let displayDescription = agent.metadata?.description;
  let isTemplate = false;

  let templateType: "supervisor" | "tools" | null = null;

  if (isDefaultAgent) {
    if (agent.supportedConfigs?.includes("supervisor")) {
      displayName = "Claudia";
      displayDescription = "The brain behind the Cloud Humans AI";
      isTemplate = true;
      templateType = "supervisor";
    } else if (agent.supportedConfigs?.includes("tools")) {
      displayName = "Tools Agent";
      displayDescription = "The specialist capable of executing tasks";
      isTemplate = true;
      templateType = "tools";
    }
  }

  return (
    <>
      <Card
        key={agent.assistant_id}
        className={cn("overflow-hidden relative bg-slate-50 dark:bg-black flex flex-col h-full min-h-[220px]", isTemplate && "border-slate-300 border-dashed")}
        style={isTemplate ? {
          backgroundImage: `url(${templateType === "supervisor" ? "/images/claudia-bg-light.png" : "/images/tools-bg-light.png"})`,
          backgroundSize: "cover",
          backgroundPosition: "right center",
        } : undefined}
      >
        <CardHeader className="space-y-2 pb-2 relative z-10">
          <div className="flex items-start justify-between">
            <CardTitle className="flex w-full flex-wrap items-center gap-2">
              <p className={cn(isTemplate && "font-light")}>{displayName}</p>
              {showDeployment && selectedDeployment && (
                <div className="flex flex-wrap items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={cn(isTemplate && "bg-white/50 backdrop-blur-sm font-light")}>
                          <Cloud />
                          {selectedDeployment.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        The deployment the graph & agent belongs to.
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={cn(isTemplate && "bg-white/50 backdrop-blur-sm font-light")}>
                          <Bot />
                          {agent.graph_id}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        The graph the agent belongs to.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-col items-start justify-start gap-2 mt-2">
            {displayDescription &&
            typeof displayDescription === "string" ? (
              <p className={cn("text-muted-foreground text-sm", isTemplate && "font-light")}>
                {displayDescription}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {agent.supportedConfigs?.map((config) => (
                <SupportedConfigBadge
                  key={`${agent.assistant_id}-${config}`}
                  type={config}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardFooter className="mt-auto flex w-full justify-between pt-2 relative z-10">
          {!isDefaultAgent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <NextLink
            href={`/?agentId=${agent.assistant_id}&deploymentId=${agent.deploymentId}`}
            className={cn("ml-auto", isTemplate && "hidden")}
          >
            <Button size="sm">
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Chat
            </Button>
          </NextLink>
        </CardFooter>
      </Card>
      <EditAgentDialog
        agent={agent}
        open={showEditDialog}
        onOpenChange={(c) => setShowEditDialog(c)}
      />
    </>
  );
}
