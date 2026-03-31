import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Sparkles } from "lucide-react";
import { useTenantContext } from "@/providers/Tenant";
import { CreateAgentDialog } from "./create-edit-agent-dialogs/create-agent-dialog";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const agentCreatorId = process.env.NEXT_PUBLIC_AGENT_CREATOR_ID;
const agentCreatorDeploymentId =
  process.env.NEXT_PUBLIC_AGENT_CREATOR_DEPLOYMENT_ID;

export function PageHeader({ title, description, action }: PageHeaderProps) {
  const [open, setOpen] = useState(false);
  const [showCreateAgentDialog, setShowCreateAgentDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const { selectedTenant } = useTenantContext();
  const router = useRouter();

  const projects = selectedTenant?.claudiaProjectIds ?? [];

  const handleConfirm = () => {
    if (!agentCreatorId || !agentCreatorDeploymentId || !selectedProject)
      return;
    setOpen(false);
    const params = new URLSearchParams({
      agentId: agentCreatorId,
      deploymentId: agentCreatorDeploymentId,
      project: selectedProject,
    });
    router.push(`/?${params.toString()}`);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setSelectedProject("");
  };

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action ||
        (agentCreatorId && agentCreatorDeploymentId ? (
          <>
            <Button onClick={() => setOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Get Agentic Done
            </Button>

            <Dialog
              open={open}
              onOpenChange={handleOpenChange}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Select a project</DialogTitle>
                  <DialogDescription>
                    Choose which project the new agentic flow will be created
                    in.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {projects.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No projects available for this tenant.
                    </p>
                  ) : (
                    <Select
                      value={selectedProject}
                      onValueChange={setSelectedProject}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem
                            key={project}
                            value={project}
                          >
                            {project}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {projects.length > 0 && (
                  <DialogFooter>
                    <Button
                      onClick={handleConfirm}
                      disabled={!selectedProject}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            <Button onClick={() => setShowCreateAgentDialog(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
            <CreateAgentDialog
              open={showCreateAgentDialog}
              onOpenChange={setShowCreateAgentDialog}
            />
          </>
        ))}
    </div>
  );
}
