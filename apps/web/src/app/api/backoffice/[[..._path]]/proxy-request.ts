import { NextRequest } from "next/server";
import { verifyCognitoToken } from "@/lib/auth/cognito-server";

const HOUR_MS = 60 * 60 * 1000;
const TOKEN_CACHE_TTL_MS = 20 * HOUR_MS;

const BACKOFFICE_API_URL =
  process.env.BACKOFFICE_API_URL ?? "http://localhost:8001";
const OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_URL =
  process.env.OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_URL ?? "";
const OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_SCOPE =
  process.env.OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_SCOPE ?? "";
const OAP_BACKEND_COGNITO_APP_CLIENT_BASIC_AUTH =
  process.env.OAP_BACKEND_COGNITO_APP_CLIENT_BASIC_AUTH ?? "";

let tokenCache: {
  fetchedAt: number;
  expiresAt: number;
  accessToken: string;
} | null = null;

function getTargetUrl(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/backoffice/, "") || "/";

  const targetUrlObj = new URL(BACKOFFICE_API_URL);
  const basePath = targetUrlObj.pathname.replace(/\/$/, "");
  targetUrlObj.pathname = `${basePath}${path}`;
  targetUrlObj.search = url.search;

  return targetUrlObj.toString();
}

/**
 * Verify that the incoming request is authenticated via Cognito Bearer token.
 */
async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  return verifyCognitoToken(token);
}

async function getBackofficeToken(): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  if (!OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_URL) {
    console.error("OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_URL is not configured");
    return null;
  }

  if (!OAP_BACKEND_COGNITO_APP_CLIENT_BASIC_AUTH) {
    console.error(
      "OAP_BACKEND_COGNITO_APP_CLIENT_BASIC_AUTH is not configured. " +
        "Server-to-server token retrieval requires this env var.",
    );
    return null;
  }

  const url = new URL(OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_URL);

  const headers = new Headers();
  headers.set("Content-Type", "application/x-www-form-urlencoded");
  headers.set(
    "Authorization",
    `Basic ${OAP_BACKEND_COGNITO_APP_CLIENT_BASIC_AUTH}`,
  );

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: OAP_BACKEND_COGNITO_APP_CLIENT_TOKEN_SCOPE,
  }).toString();

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      console.error(
        "Backoffice token request failed",
        response.status,
        response.statusText,
      );
      return null;
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    if (!data.access_token) {
      console.error("Backoffice token response missing access_token");
      return null;
    }

    const ttlMs =
      typeof data.expires_in === "number" && data.expires_in > 0
        ? data.expires_in * 1000
        : TOKEN_CACHE_TTL_MS;
    const safetyWindowMs = 60 * 1000;
    tokenCache = {
      fetchedAt: now,
      expiresAt: now + Math.max(ttlMs - safetyWindowMs, 0),
      accessToken: data.access_token,
    };

    return data.access_token;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    console.error("Backoffice token request error", error);
    return null;
  }
}

export async function proxyRequest(req: NextRequest): Promise<Response> {
  try {
    // Auth check: ensure the caller is authenticated
    const authenticated = await isAuthenticated(req);
    if (!authenticated) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const targetUrl = getTargetUrl(req);
    const accessToken = await getBackofficeToken();
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          message: "Failed to retrieve backoffice token",
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "host" && lowerKey !== "authorization") {
        headers.append(key, value);
      }
    });
    headers.set("Authorization", `Bearer ${accessToken}`);

    let body: BodyInit | null | undefined = undefined;

    const fetchOptions: RequestInit & { duplex?: string } = {
      method: req.method,
      headers,
      signal: req.signal,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      body = req.body;
      fetchOptions.body = body;
      fetchOptions.duplex = "half";
    }

    const response = await fetch(targetUrl, fetchOptions);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Backoffice Proxy Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorResponse: Record<string, unknown> = {
      message: "Proxy request failed",
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
