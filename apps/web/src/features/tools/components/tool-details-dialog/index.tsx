import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tool } from "@/types/tool";
import { ReactNode } from "react";
import { SchemaRenderer } from "./schema-renderer";
import _ from "lodash";
import { Workflow } from "lucide-react";
import NextLink from "next/link";

interface ToolDetailsDialogProps {
  tool: Tool;
  children: ReactNode;
}

export function ToolDetailsDialog({ tool, children }: ToolDetailsDialogProps) {
  const typebotBaseUrl = process.env.NEXT_PUBLIC_TYPEBOT_BASE_URL || "http://eddie.us-east-1.prd.cloudhumans.io";
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            <span className="text-muted-foreground font-medium">
              Tool Details -{" "}
            </span>
            {_.startCase(tool.name)}
          </DialogTitle>
          <DialogDescription>
            {tool.description || "No description provided"}
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <SchemaRenderer schema={tool.inputSchema} />
        </div>
        <DialogFooter>
          <NextLink href={`${typebotBaseUrl}/typebots/${tool.annotations?.workflowId}/edit`}>
            <Button variant="outline">
              <Workflow className="size-4" />
              View workflow
            </Button>
          </NextLink>
          <DialogClose asChild>
            <Button type="submit">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
