export type InputSchema = {
  type: "object";
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: unknown;
};

export interface Tool {
  /**
   * The name of the tool
   */
  name: string;
  /**
   * The tool's description
   */
  description?: string;
  /**
   * The tool's input schema
   */
  inputSchema: InputSchema;
  _meta?: {
    workflowId?: string;
    [key: string]: unknown;
  };
}
