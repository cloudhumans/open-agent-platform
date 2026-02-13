export type InputSchema = {
  type: "object";
  properties?: Record<string, any>;
  required?: string[];
};

export type AnnotationsSchema = {
  workflowId?: string;
  priority?: number;
  audience?: string[];
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

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
  annotations?: AnnotationsSchema;
}
