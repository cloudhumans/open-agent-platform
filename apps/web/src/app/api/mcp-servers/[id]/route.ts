import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import McpServer from "@/models/mcp-server";
import { encrypt, decrypt, maskCredential } from "@/lib/encryption";
import { requireAuth } from "@/lib/auth/require-auth";
import { toServerSlug } from "@/lib/mcp-slug";
import { getDefaultServers } from "@/lib/mcp-defaults";

const DEFAULT_SERVER_IDS = ["default-typebot", "default-cloudhumans"];

const MASKED_PREFIX = "\u2022\u2022\u2022\u2022\u2022\u2022";

const UpdateMcpServerSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    url: z.string().url().optional(),
    authType: z.enum(["none", "bearer", "apiKey"]).optional(),
    credentials: z.string().min(1).nullable().optional(),
    customHeaders: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.credentials != null &&
      data.credentials.startsWith(MASKED_PREFIX)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credentials"],
        message:
          "Credentials must be submitted in full — masked values are not accepted",
      });
    }
    // Only validate credentials when explicitly provided alongside an auth type that requires them
    if (
      (data.authType === "bearer" || data.authType === "apiKey") &&
      data.credentials === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credentials"],
        message: `credentials cannot be null when authType is "${data.authType}"`,
      });
    }
    if (data.authType === "none") {
      if (data.credentials != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["credentials"],
          message:
            'credentials must be null or omitted when authType is "none"',
        });
      }
    }
  });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    if (DEFAULT_SERVER_IDS.includes(id)) {
      return Response.json(
        { error: "Default servers cannot be modified" },
        { status: 403 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateMcpServerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      return Response.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
      const slug = toServerSlug(parsed.data.name);
      const defaultSlugs = getDefaultServers().map((s) => s.slug);
      if (defaultSlugs.includes(slug)) {
        return Response.json(
          { error: `Slug "${slug}" conflicts with a default server` },
          { status: 409 },
        );
      }
      updateData.slug = slug;
    }
    if (parsed.data.url !== undefined) updateData.url = parsed.data.url;
    if (parsed.data.authType !== undefined)
      updateData.authType = parsed.data.authType;

    if (parsed.data.credentials !== undefined) {
      updateData.credentials =
        parsed.data.credentials != null
          ? encrypt(parsed.data.credentials)
          : null;
    }

    if (parsed.data.customHeaders !== undefined) {
      updateData.customHeaders = parsed.data.customHeaders;
    }

    const updated = await McpServer.findOneAndUpdate(
      { _id: id, tenantName: auth.tenantName },
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }

    return Response.json(
      {
        id: (updated._id as mongoose.Types.ObjectId).toString(),
        name: updated.name,
        slug: updated.slug,
        url: updated.url,
        authType: updated.authType,
        credentials:
          updated.credentials != null
            ? maskCredential(decrypt(updated.credentials))
            : null,
        customHeaders: updated.customHeaders
          ? (updated.customHeaders instanceof Map ? Object.fromEntries(updated.customHeaders) : updated.customHeaders as Record<string, string>)
          : {},
        isDefault: false,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return Response.json(
        {
          error:
            "A server with this slug already exists (names that normalize to the same slug conflict)",
        },
        { status: 409 },
      );
    }
    console.error("[MCP] Failed to update server:", error);
    return Response.json({ error: "Failed to update server" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    if (DEFAULT_SERVER_IDS.includes(id)) {
      return Response.json(
        { error: "Default servers cannot be deleted" },
        { status: 403 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }

    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      return Response.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const deleted = await McpServer.findOneAndDelete({
      _id: id,
      tenantName: auth.tenantName,
    }).lean();

    if (!deleted) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[MCP] Failed to delete server:", error);
    return Response.json({ error: "Failed to delete server" }, { status: 500 });
  }
}
