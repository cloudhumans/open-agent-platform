"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/providers/Auth";

/**
 * Fetches available Claudia ticket tags for a given project.
 * Returns an empty array when no project is selected or the API URL is not configured.
 */
export function useClaudiaTags(projectName: string | undefined): string[] {
  const { session } = useAuthContext();
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_CLAUDIA_API_URL;
    if (!projectName || !apiUrl) {
      setTags([]);
      return;
    }

    const controller = new AbortController();

    async function fetchTags() {
      try {
        const headers: HeadersInit = {};
        if (session?.accessToken) {
          headers["Authorization"] = `Bearer ${session.accessToken}`;
        }
        const res = await fetch(
          `${apiUrl}/ids-tag/project/${encodeURIComponent(projectName!)}/names`,
          { signal: controller.signal, headers },
        );
        if (!res.ok) return;
        const data: string[] = await res.json();
        setTags(data);
      } catch {
        // Silently ignore — network errors or aborts
      }
    }

    fetchTags();
    return () => controller.abort();
  }, [projectName, session?.accessToken]);

  return tags;
}
