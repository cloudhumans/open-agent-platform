import { NextRequest } from "next/server";

const HOUR_MS = 60 * 60 * 1000;
const TOKEN_CACHE_TTL_MS = 20 * HOUR_MS;

const BACKOFFICE_TOKEN_URL = process.env.BACKOFFICE_TOKEN_URL ?? "";

const BACKOFFICE_TOKEN_SCOPE = process.env.BACKOFFICE_TOKEN_SCOPE ?? "";

const BACKOFFICE_TOKEN_BASIC_AUTH =
  process.env.BACKOFFICE_TOKEN_BASIC_AUTH ?? "";

let tokenCache: {
  fetchedAt: number;
  data: { access_token?: string; expires_in?: number; token_type?: string };
} | null = null;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const now = Date.now();
  if (tokenCache && now - tokenCache.fetchedAt < TOKEN_CACHE_TTL_MS) {
    return new Response(JSON.stringify(tokenCache.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(BACKOFFICE_TOKEN_URL);

  const headers = new Headers();
  headers.set("Content-Type", "application/x-www-form-urlencoded");

  if (BACKOFFICE_TOKEN_BASIC_AUTH) {
    headers.set("Authorization", `Basic ${BACKOFFICE_TOKEN_BASIC_AUTH}`);
  } else {
    const incomingAuth = req.headers.get("authorization");
    if (incomingAuth) {
      headers.set("Authorization", incomingAuth);
    }
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: BACKOFFICE_TOKEN_SCOPE,
  }).toString();

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
      signal: req.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText || response.statusText, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ?? "text/plain",
        },
      });
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    tokenCache = {
      fetchedAt: now,
      data,
    };

    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 408 });
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        message: "Token request failed",
        error: errorMessage,
        url: url.toString(),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
