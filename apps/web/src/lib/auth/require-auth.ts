import { NextRequest } from "next/server";
import { verifyCognitoToken } from "./cognito-server";

type AuthResult =
  | { ok: true; tenantName: string }
  | { ok: false; response: Response };

/**
 * Validate Cognito JWT from Authorization header and extract x-tenant-name.
 * Returns the tenantName on success, or a pre-built error Response on failure.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: Response.json(
        { error: "Unauthorized", message: "Bearer token required" },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.slice(7);
  const valid = await verifyCognitoToken(token);
  if (!valid) {
    return {
      ok: false,
      response: Response.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 },
      ),
    };
  }

  const tenantName = req.headers.get("x-tenant-name");
  if (!tenantName) {
    return {
      ok: false,
      response: Response.json(
        { error: "Bad Request", message: "x-tenant-name header is required" },
        { status: 400 },
      ),
    };
  }

  return { ok: true, tenantName };
}
