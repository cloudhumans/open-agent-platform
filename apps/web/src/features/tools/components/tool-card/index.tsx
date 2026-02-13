import * as React from "react";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tool } from "@/types/tool";
import { ToolDetailsDialog } from "../tool-details-dialog";
import { Eye, FlaskConical, Workflow } from "lucide-react";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import NextLink from "next/link";
import _ from "lodash";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const typebotBaseUrl =
    process.env.NEXT_PUBLIC_TYPEBOT_BASE_URL ||
    "http://eddie.us-east-1.prd.cloudhumans.io";
  return (
    <Card className="border border-gray-200 shadow-xs">
      <CardHeader>
        <CardTitle className="truncate pb-2 text-lg font-medium">
          {_.startCase(tool.name)}
        </CardTitle>

        <CardDescription className="line-clamp-3">
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between">
        <NextLink href={`/tools/playground?tool=${tool.name}`}>
          <Button variant="outline">
            <FlaskConical className="size-4" />
            <p>Playground</p>
          </Button>
        </NextLink>
        <div className="flex items-center gap-2">
          <NextLink
            href={`${typebotBaseUrl}/typebots/${tool._meta?.workflowId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <TooltipIconButton
              variant="outline"
              tooltip="View workflow"
              className="size-9"
            >
              <Workflow className="size-4" />
            </TooltipIconButton>
          </NextLink>
          <ToolDetailsDialog tool={tool}>
            <TooltipIconButton
              tooltip="View tool details"
              variant="outline"
              className="size-9"
            >
              <Eye className="size-5" />
            </TooltipIconButton>
          </ToolDetailsDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

export function ToolCardLoading() {
  return (
    <Card className="border border-gray-200 shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-8 w-full" />
        </CardTitle>
        <CardDescription className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between gap-2">
        <Skeleton className="size-6" />
      </CardFooter>
    </Card>
  );
}
