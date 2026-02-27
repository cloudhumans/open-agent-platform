// MCP server slug utilities — must stay in sync with
// claudia-agentic/src/packages/src/react_agent/react_agent.ts (toServerSlug, deduplicateSlugs)

export function toServerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function deduplicateSlugs(slugs: string[]): string[] {
  const counts = new Map<string, number>();
  return slugs.map((slug) => {
    const base = slug || "server";
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
}
