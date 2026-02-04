"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AgentsProvider } from "@/providers/Agents";
import { MCPProvider } from "@/providers/MCP";
import { RagProvider } from "@/features/rag/providers/RAG";
import { TenantProvider } from "@/providers/Tenant";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <TenantProvider>
        <MCPProvider>
          <AgentsProvider>
            <RagProvider>
              <AppSidebar />
              <SidebarInset>{children}</SidebarInset>
            </RagProvider>
          </AgentsProvider>
        </MCPProvider>
      </TenantProvider>
    </SidebarProvider>
  );
}
