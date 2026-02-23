import { NextRequest } from "next/server";

const BACKOFFICE_API_URL =
  process.env.BACKOFFICE_API_URL ?? "http://localhost:8001";

function getTargetUrl(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/backoffice/, "") || "/";

  const targetUrlObj = new URL(BACKOFFICE_API_URL);
  const basePath = targetUrlObj.pathname.replace(/\/$/, "");
  targetUrlObj.pathname = `${basePath}${path}`;
  targetUrlObj.search = url.search;

  return targetUrlObj.toString();
}

export async function proxyRequest(req: NextRequest): Promise<Response> {
  try {
    const targetUrl = getTargetUrl(req);

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host") {
        headers.append(key, value);
      }
    });

    let body: BodyInit | null | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = req.body;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: req.signal,
    });

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
