import mongoose from "mongoose";

declare global {
  var __mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
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

  if (!global.__mongoose) {
    global.__mongoose = { conn: null, promise: null };
  }

  if (!global.__mongoose.promise) {
    global.__mongoose.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  global.__mongoose.conn = await global.__mongoose.promise;
}
