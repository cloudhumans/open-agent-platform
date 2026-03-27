import { NextRequest } from "next/server";

const MOCK_BACKOFFICE = process.env.MOCK_BACKOFFICE === "true";

const MOCK_TENANTS = [
  {
    tenantName: "printi",
    cloudChatAccounts: [],
    connectorProjects: ["printi", "printicomercial", "printisuporte"],
    claudiaProjects: [
      "printi",
      "printicomercial",
      "printisuporte",
      "evento_scrapper_printi_produtos",
      "printicomercialdemo",
    ],
    eddieWorkspaces: [
      { _id: "clyhj8lqr001kyz4mj0yd0ra8", name: "printi", instance: "INSTANCE_1" },
      { _id: "cm2nesnan001mt1wq31w0bdyw", name: "printicomercial", instance: "INSTANCE_1" },
      { _id: "cm1z20599000024dxdzectwvl", name: "printisuporte", instance: "INSTANCE_1" },
      { _id: "cmig9ueqo2ts1th9db9hsqo4w", name: "printicomercialdemo", instance: "INSTANCE_1" },
    ],
  },
  {
    tenantName: "get-agentic-done",
    cloudChatAccounts: [],
    connectorProjects: [],
    claudiaProjects: ["gad"],
    eddieWorkspaces: [
      { _id: "cmn7qkaj10ld2q0xhoy3qef3h", name: "gad", instance: "INSTANCE_1" },
    ],
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
