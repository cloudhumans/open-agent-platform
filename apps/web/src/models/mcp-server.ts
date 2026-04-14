import mongoose, { Schema, Document } from "mongoose";

export interface IMcpServer extends Document {
  name: string;
  slug: string;
  url: string;
  authType: "none" | "bearer" | "apiKey";
  credentials: string | null;
  customHeaders: Map<string, string>;
  tenantName: string;
  createdAt: Date;
  updatedAt: Date;
}

const McpServerSchema = new Schema<IMcpServer>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    url: { type: String, required: true },
    authType: {
      type: String,
      enum: ["none", "bearer", "apiKey"],
      required: true,
    },
    credentials: { type: String, default: null },
    customHeaders: { type: Map, of: String, default: new Map() },
    tenantName: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "mcp",
  },
);

McpServerSchema.index({ tenantName: 1, slug: 1 }, { unique: true });

const McpServer =
  (mongoose.models.McpServer as mongoose.Model<IMcpServer>) ||
  mongoose.model<IMcpServer>("McpServer", McpServerSchema);

export default McpServer;
