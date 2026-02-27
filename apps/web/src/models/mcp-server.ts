import mongoose, { Schema, Document } from "mongoose";

export interface IMcpServer extends Document {
  name: string;
  url: string;
  authType: "none" | "bearer" | "apiKey";
  credentials: string | null;
  enabled: boolean;
  tenantName: string;
  createdAt: Date;
  updatedAt: Date;
}

const McpServerSchema = new Schema<IMcpServer>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    authType: {
      type: String,
      enum: ["none", "bearer", "apiKey"],
      required: true,
    },
    credentials: { type: String, default: null },
    enabled: { type: Boolean, default: true },
    tenantName: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "mcp",
  },
);

McpServerSchema.index({ tenantName: 1, name: 1 });

const McpServer =
  (mongoose.models.McpServer as mongoose.Model<IMcpServer>) ||
  mongoose.model<IMcpServer>("McpServer", McpServerSchema);

export default McpServer;
