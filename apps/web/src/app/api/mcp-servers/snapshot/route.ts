import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { decrypt } from "@/lib/encryption";
import { getDefaultServers } from "@/lib/mcp-defaults";
import McpServer from "@/models/mcp-server";
import { requireAuth } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

interface ServerSnapshot {
  id: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "apiKey";
  credentials: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const ids = searchParams.getAll("ids[]");

  if (ids.length === 0) {
    return Response.json({ error: "ids[] required" }, { status: 400 });
  }

  try {
    const results: ServerSnapshot[] = [];

    // Separate default server IDs from MongoDB ObjectIds
    const defaults = getDefaultServers();
    const defaultIds: string[] = [];
    const mongoIds: string[] = [];

    for (const id of ids) {
      if (defaults.some((s) => s.id === id)) {
        defaultIds.push(id);
      } else {
        mongoIds.push(id);
      }
    }

    // Resolve default servers
    for (const id of defaultIds) {
      const server = defaults.find((s) => s.id === id);
      if (server) {
        results.push({
          id: server.id,
          name: server.name,
          url: server.url,
          authType: server.authType,
          credentials: server.credentials,
        });
      }
    }

    // Resolve MongoDB servers
    if (mongoIds.length > 0) {
      const validIds = mongoIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id),
      );

      if (validIds.length > 0) {
        await connectDB();

        if (mongoose.connection.readyState !== 1) {
          return Response.json(
            { error: "Database not available" },
            { status: 503 },
          );
        }

        const docs = await McpServer.find({
          _id: { $in: validIds },
          tenantName: auth.tenantName,
        }).lean();

        for (const doc of docs) {
          const decrypted =
            doc.credentials != null ? decrypt(doc.credentials) : null;

          results.push({
            id: doc._id.toString(),
            name: doc.name,
            url: doc.url,
            authType: doc.authType,
            credentials: decrypted,
          });
        }
      }
    }

    return Response.json({ servers: results });
  } catch (error) {
    console.error("[MCP] Failed to build server snapshot:", error);
    return Response.json(
      { error: "Failed to build server snapshot" },
      { status: 500 },
    );
  }
}
