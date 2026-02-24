import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import McpServer from "@/models/mcp-server";
import { getDefaultServers } from "@/lib/mcp-defaults";
import { encrypt, decrypt, maskCredential } from "@/lib/encryption";

const CreateMcpServerSchema = z
  .object({
    name: z.string().min(1).max(100),
    url: z.string().url(),
    authType: z.enum(["none", "bearer", "apiKey"]),
    credentials: z.string().min(1).nullable().optional(),
    enabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.authType === "bearer" || data.authType === "apiKey") {
      if (!data.credentials) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["credentials"],
          message: `credentials is required when authType is "${data.authType}"`,
        });
      }
    }
    if (data.authType === "none") {
      if (data.credentials != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["credentials"],
          message: "credentials must be null or omitted when authType is \"none\"",
        });
      }
    }
  });

export async function GET() {
  const defaults = getDefaultServers().map((server) => ({
    ...server,
    credentials: maskCredential(server.credentials),
  }));

  const userServers: Array<{
    id: string;
    name: string;
    url: string;
    authType: "none" | "bearer" | "apiKey";
    credentials: string | null;
    enabled: boolean;
    isDefault: false;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  try {
    await connectDB();
    const docs = await McpServer.find({}).lean();

    for (const doc of docs) {
      userServers.push({
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        name: doc.name,
        url: doc.url,
        authType: doc.authType,
        credentials:
          doc.credentials != null
            ? maskCredential(decrypt(doc.credentials))
            : null,
        enabled: doc.enabled,
        isDefault: false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    }
  } catch (error) {
    console.warn(
      "[MCP] MongoDB unavailable, returning defaults only:",
      error,
    );
  }

  return Response.json({ servers: [...defaults, ...userServers] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateMcpServerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten() },
        { status: 422 },
      );
    }

    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      return Response.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const encryptedCreds = parsed.data.credentials
      ? encrypt(parsed.data.credentials)
      : null;

    const doc = await McpServer.create({
      ...parsed.data,
      credentials: encryptedCreds,
    });

    return Response.json(
      {
        id: doc._id.toString(),
        name: doc.name,
        url: doc.url,
        authType: doc.authType,
        credentials:
          doc.credentials != null
            ? maskCredential(decrypt(doc.credentials))
            : null,
        enabled: doc.enabled,
        isDefault: false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[MCP] Failed to create server:", error);
    return Response.json(
      { error: "Failed to create server" },
      { status: 500 },
    );
  }
}
