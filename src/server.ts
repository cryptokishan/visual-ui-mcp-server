// src/server.ts - MCP Server setup following development guidance and best practices
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { cleanupToolResources } from "./tool/element-locator-tool.js";
import { elementLocatorTool } from "./tool/element-locator-tool.js";

// Create MCP server instance using high-level McpServer following SDK best practices
const server = new McpServer({
  name: "visual-ui-mcp-server",
  version: "3.1.0",
});

// Cleanup resources
async function cleanup(): Promise<void> {
  await cleanupToolResources();
}

// Register tools - the tool handles its own registration
elementLocatorTool.registerWith(server);

// Handle process termination gracefully
process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

// Start the server using stdio transport following SDK best practices
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Visual UI MCP Server started successfully");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
