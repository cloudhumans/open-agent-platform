import { NextRequest } from "next/server";

const MOCK_BACKOFFICE = process.env.MOCK_BACKOFFICE === "true";

const MOCK_TENANTS = [
  {
    tenantName: "default",
    cloudChatAccounts: [
      {
        instance: "local",
        accountId: 1,
        accountName: "Local Development",
      },
    ],
    connectorProjects: [],
    claudiaProjects: [],
    eddieWorkspaces: [],
  },
  {
    tenantName: "get-agentic-done",
    cloudChatAccounts: [
      {
        instance: "gad",
        accountId: 2,
        accountName: "Local Get Agentic Done",
      },
    ],
    connectorProjects: [],
    claudiaProjects: [],
    eddieWorkspaces: [],
  },
];

export function mockBackofficeResponse(req: NextRequest): Response | null {
  if (!MOCK_BACKOFFICE) return null;

  const path = new URL(req.url).pathname.replace(/^\/api\/backoffice/, "");

  if (path === "/tenants" || path === "/tenants/") {
    return Response.json(MOCK_TENANTS);
  }

  return null;
}
