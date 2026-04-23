import { NextRequest } from "next/server";
import { verifyCognitoToken } from "./cognito-server";

type AuthResult =
  | { ok: true; tenantName: string; groups: string[] }
  | { ok: false; response: Response };

/**
 * Fetch user email from Cognito using the access token.
 * Calls the Cognito GetUser API directly (no AWS SDK needed).
 */
async function getCognitoEmail(accessToken: string): Promise<string | null> {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  if (!userPoolId) return null;

  const region = userPoolId.split("_")[0];
  try {
    const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.GetUser",
      },
      body: JSON.stringify({ AccessToken: accessToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const emailAttr = (data.UserAttributes ?? []).find(
      (a: { Name: string }) => a.Name === "email",
    );
    return emailAttr?.Value ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate Cognito JWT from Authorization header and extract x-tenant-name.
 * Returns the tenantName on success, or a pre-built error Response on failure.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  // Dev-only bypass: skip Cognito JWT validation when using mock backoffice
  if (process.env.MOCK_BACKOFFICE === "true") {
    const tenantName = req.headers.get("x-tenant-name") ?? "claudia_project";
    return { ok: true, tenantName, groups: [tenantName] };
  }

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
  const payload = await verifyCognitoToken(token);
  if (!payload) {
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

  const groups: string[] = (payload as any)["cognito:groups"] ?? [];
  const customProjects: string = (payload as any)["custom:projects"] ?? "";
  const allowedProjects = customProjects
    .split(",")
    .map((p: string) => p.trim())
    .filter(Boolean);

  // Check token claims first (fast path)
  if (groups.includes(tenantName) || allowedProjects.includes(tenantName)) {
    return { ok: true, tenantName, groups };
  }

  // Fetch email from Cognito to check for @cloudhumans.com (admin bypass)
  const email = (await getCognitoEmail(token))?.toLowerCase().trim() ?? null;
  if (email?.endsWith("@cloudhumans.com")) {
    return { ok: true, tenantName, groups };
  }

  return {
    ok: false,
    response: Response.json(
      { error: "Forbidden", message: "User does not belong to this tenant" },
      { status: 403 },
    ),
  };
}
