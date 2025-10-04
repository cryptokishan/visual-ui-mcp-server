// MCP Tool registration interface and types
export interface McpToolInfo {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: Record<string, any>, extra: any) => Promise<any>;
}

export interface McpTool {
  getRegistrationInfo(): McpToolInfo; // Required: provide MCP registration details
}
