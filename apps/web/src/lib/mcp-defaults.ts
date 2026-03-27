export interface McpServerDefault {
  id: string;
  name: string;
  slug: string;
  url: string;
  authType: "bearer";
  credentials: string | null;
  isDefault: true;
  createdAt: null;
  updatedAt: null;
}

export function getDefaultServers(): McpServerDefault[] {
  const defaults: McpServerDefault[] = [];

  if (process.env.MCP_TYPEBOT_URL) {
    defaults.push({
      id: "default-typebot",
      name: "Eddie",
      slug: "typebot",
      url: process.env.MCP_TYPEBOT_URL,
      authType: "bearer",
      credentials: process.env.MCP_TYPEBOT_BEARER_TOKEN ?? null,
      isDefault: true,
      createdAt: null,
      updatedAt: null,
    });
  }

  if (process.env.MCP_CLOUDHUMANS_URL) {
    defaults.push({
      id: "default-cloudhumans",
      name: "CloudHumans",
      slug: "cloudhumans",
      url: process.env.MCP_CLOUDHUMANS_URL,
      authType: "bearer",
      credentials: process.env.MCP_CLOUDHUMANS_BEARER_TOKEN ?? null,
      isDefault: true,
      createdAt: null,
      updatedAt: null,
    });
  }

  return defaults;
}
