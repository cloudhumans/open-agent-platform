import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListToolsResultSchema, ToolSchema, ToolAnnotationsSchema } from "@modelcontextprotocol/sdk/types.js";


export class CustomMCPClient extends Client {
  // Method override signature might differ slightly, but usually safe if compatible
  async listTools(params?: any, options?: any) {
    // 1. Create a permissive version of ToolAnnotationsSchema
    // This allows keys like "workflowId" to pass through validation
    const PermissiveAnnotationsSchema = ToolAnnotationsSchema.passthrough();

    // 2. Create a version of ToolSchema that uses the permissive annotations
    // We extend the existing schema and override the annotations field
    const PermissiveToolSchema = ToolSchema.extend({
      annotations: PermissiveAnnotationsSchema.optional(),
    }).passthrough(); // Also make the tool object itself permissive as a safety measure

    // 3. Create a version of ListToolsResultSchema that uses the permissive ToolSchema
    // ListToolsResultSchema is normally { tools: ToolSchema[], nextCursor?: string, ... }
    // We override the 'tools' property to use our new permissive schema
    // ts-ignore - Valid Zod extension even if TS complains about Zod versions
    const ExtendedListToolsResultSchema = ListToolsResultSchema.extend({
      tools: PermissiveToolSchema.array(),
    }).passthrough();
    
    // request() method typing might not perfectly align with ExtendedSchema
    // ts-ignore - The schema is valid for runtime validation
    const result = await this.request(
      { method: "tools/list", params },
      ExtendedListToolsResultSchema,
      options
    );

    // Cache the tools and their output schemas for future validation
    // Accessing private method cacheToolMetadata via string index to bypass TS check if necessary
    // ts-ignore - tools type is compatible at runtime
    this["cacheToolMetadata"](result.tools);
    return result as unknown as Promise<{ tools: any[], nextCursor?: string }>;
  }
}

