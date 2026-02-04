import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@/types/tool";
import { useState } from "react";
import { useAuthContext } from "@/providers/Auth";
import { Tenant } from "@/types/tenant";

function getMCPUrlOrThrow() {
  if (!process.env.NEXT_PUBLIC_BASE_API_URL) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not defined");
  }

  const url = new URL(process.env.NEXT_PUBLIC_BASE_API_URL);
  url.pathname = `${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}oap_mcp`;
  return url;
}

/**
 * Custom hook for interacting with the Model Context Protocol (MCP).
 * Provides functions to connect to an MCP server and list available tools.
 */
export default function useMCP({
  name,
  version,
  tenant,
}: {
  name: string;
  version: string;
  tenant?: Tenant | null;
}) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [cursor, setCursor] = useState("");
  const { session } = useAuthContext();

  /**
   * Creates an MCP client and connects it to the specified server URL.
   * @param url - The URL of the MCP server.
   * @param options - Client identification options.
   * @param options.name - The name of the client.
   * @param options.version - The version of the client.
   * @returns A promise that resolves to the connected MCP client instance.
   */
  const createAndConnectMCPClient = async () => {
    const url = getMCPUrlOrThrow();
    const tenantHeaders: HeadersInit = {};
    if (tenant) {
      tenantHeaders["x-tenant"] = tenant.tenantName;
    }

    const connectionClient = new StreamableHTTPClientTransport(new URL(url), {
      requestInit:
        Object.keys(tenantHeaders).length > 0
          ? {
              headers: tenantHeaders,
            }
          : undefined,
    });
    const mcp = new Client({
      name,
      version,
    });

    await mcp.connect(connectionClient);
    return mcp;
  };

  /**
   * Connects to an MCP server and retrieves the list of available tools.
   * @param url - The URL of the MCP server.
   * @param options - Client identification options.
   * @param options.name - The name of the client.
   * @param options.version - The version of the client.
   * @returns A promise that resolves to an array of available tools.
   */
  const getTools = async (nextCursor?: string): Promise<Tool[]> => {
    if (!session?.accessToken) {
      return [];
    }
    const mcp = await createAndConnectMCPClient();
    const params = {
      cursor: nextCursor,
      ...(tenant?.tenantName ? { tenant: tenant.tenantName } : {}),
    };

    const tools = await mcp.listTools(params);
    if (tools.nextCursor) {
      setCursor(tools.nextCursor);
    } else {
      setCursor("");
    }
    return tools.tools;
  };

  /**
   * Calls a tool on the MCP server.
   * @param name - The name of the tool.
   * @param version - The version of the tool. Optional.
   * @param args - The arguments to pass to the tool.
   * @returns A promise that resolves to the response from the tool.
   */
  const callTool = async ({
    name,
    args,
    version,
  }: {
    name: string;
    args: Record<string, any>;
    version?: string;
  }) => {
    if (!session?.accessToken) {
      throw new Error("No access token found");
    }
    const mcp = await createAndConnectMCPClient();

    const response = await mcp.callTool({
      name,
      arguments: args,
    });
    return response;
  };

  return {
    getTools,
    callTool,
    createAndConnectMCPClient,
    tools,
    setTools,
    cursor,
  };
}
