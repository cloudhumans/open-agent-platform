// MCP server slug utilities — must stay in sync with
// claudia-agentic/src/packages/src/react_agent/mcp_tools.ts (toServerSlug)

export function toServerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
