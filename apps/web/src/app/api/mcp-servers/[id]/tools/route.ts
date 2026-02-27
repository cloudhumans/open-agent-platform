import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { connectDB } from "@/lib/mongodb";
import { decrypt } from "@/lib/encryption";
import { getDefaultServers } from "@/lib/mcp-defaults";
import McpServer from "@/models/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let serverUrl: string;
  let authType: "none" | "bearer" | "apiKey";
  let credentials: string | null;

  // Check if this is a default server
  const defaults = getDefaultServers();
  const defaultServer = defaults.find((s) => s.id === id);

  if (defaultServer) {
    serverUrl = defaultServer.url;
    authType = defaultServer.authType;
    credentials = defaultServer.credentials;
  } else {
    // Validate as MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }

    await connectDB();

    const doc = await McpServer.findById(id).lean();

    if (!doc) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }

    serverUrl = doc.url;
    authType = doc.authType;
    credentials = doc.credentials != null ? decrypt(doc.credentials) : null;
  }

  // Build MCP URL — ensure it ends with /mcp
  const mcpUrl = serverUrl.endsWith("/mcp")
    ? serverUrl
    : `${serverUrl}/mcp`;

  // Build auth headers
  const headers: Record<string, string> = {};
  if (authType === "bearer" && credentials) {
    headers["Authorization"] = `Bearer ${credentials}`;
  } else if (authType === "apiKey" && credentials) {
    headers["x-api-key"] = credentials;
  }

  // Forward tenant header when present
  const tenant = _req.nextUrl.searchParams.get("tenant");
  if (tenant) {
    headers["x-tenant"] = tenant;
  }

  const client = new Client({ name: "oap-tool-proxy", version: "1.0.0" });

  const TIMEOUT_MS = 30_000;
  const timeoutError = Symbol("timeout");

  try {
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
      requestInit: { headers, cache: "no-store" as RequestCache },
    });

    const result = await Promise.race([
      (async () => {
        await client.connect(transport);
        return client.listTools();
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(timeoutError), TIMEOUT_MS),
      ),
    ]);

    return Response.json({ tools: result.tools });
  } catch (err) {
    if (err === timeoutError) {
      console.error(`[mcp-tools] Timed out fetching tools from ${mcpUrl}`);
      return Response.json(
        { error: "MCP server timed out after 30 seconds" },
        { status: 504 },
      );
    }
    console.error(`[mcp-tools] Failed to fetch tools from ${mcpUrl}:`, err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch tools";
    return Response.json({ error: message }, { status: 502 });
  } finally {
    await client.close().catch(() => {});
  }
}
