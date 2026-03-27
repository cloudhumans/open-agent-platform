import type React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const agentCreatorId = process.env.NEXT_PUBLIC_AGENT_CREATOR_ID;
const agentCreatorDeploymentId =
  process.env.NEXT_PUBLIC_AGENT_CREATOR_DEPLOYMENT_ID;

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action ||
        (agentCreatorId && agentCreatorDeploymentId && (
          <Button asChild>
            <Link
              href={`/?agentId=${agentCreatorId}&deploymentId=${agentCreatorDeploymentId}`}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create Agentic Flow
            </Link>
          </Button>
        ))}
    </div>
  );
}
