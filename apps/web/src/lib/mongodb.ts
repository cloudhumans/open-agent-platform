import mongoose from "mongoose";

declare global {
  var __mongoose: { conn: typeof mongoose } | undefined;
}

export async function connectDB(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.warn(
      "[MCP] MONGODB_URI not set — running in defaults-only mode. User-added MCP servers will not be persisted.",
    );
    return;
  }

  if (global.__mongoose?.conn) {
    return;
  }

  const conn = await mongoose.connect(MONGODB_URI, {
    dbName: "claudia",
    bufferCommands: false,
  });

  global.__mongoose = { conn };
}
