import { NextRequest } from "next/server";
import { proxyRequest } from "./proxy-request";
import { mockBackofficeResponse } from "./mock-data";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mock = mockBackofficeResponse(req);
  if (mock) return mock;
  return proxyRequest(req);
}

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req);
}

export async function PATCH(req: NextRequest) {
  return proxyRequest(req);
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req);
}

export async function HEAD(req: NextRequest) {
  return proxyRequest(req);
}

export async function OPTIONS(req: NextRequest) {
  return proxyRequest(req);
}
