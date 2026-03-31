import { useQueryState } from "nuqs";

const AGENT_CREATOR_ID = process.env.NEXT_PUBLIC_AGENT_CREATOR_ID;

export function useIsAgentCreator() {
  const [agentId] = useQueryState("agentId");
  return agentId === AGENT_CREATOR_ID;
}
