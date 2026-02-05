import React, {
  createContext,
  useContext,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import useMCP from "../hooks/use-mcp";
import { useAuthContext } from "./Auth";
import { useTenantContext } from "@/providers/Tenant";

type MCPContextType = ReturnType<typeof useMCP> & { loading: boolean };

const MCPContext = createContext<MCPContextType | null>(null);

export const MCPProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { session } = useAuthContext();
  const { selectedTenant } = useTenantContext();
  const mcpState = useMCP({
    name: "Tools Interface",
    version: "1.0.0",
    tenant: selectedTenant,
  });
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const tenantKey = selectedTenant?.key ?? "";

  useEffect(() => {
    if (!session?.accessToken) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    mcpState.setTools([]);
    mcpState
      .getTools()
      .then((tools) => {
        if (requestId !== requestIdRef.current) return;
        mcpState.setTools(tools);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [session?.accessToken, tenantKey]);

  return (
    <MCPContext.Provider value={{ ...mcpState, loading }}>
      {children}
    </MCPContext.Provider>
  );
};

export const useMCPContext = () => {
  const context = useContext(MCPContext);
  if (context === null) {
    throw new Error("useMCPContext must be used within a MCPProvider");
  }
  return context;
};
