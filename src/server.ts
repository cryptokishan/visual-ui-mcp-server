/**
 * Visual UI MCP Server
 * Modular server setup with centralized tool management
 */

import { config } from "dotenv";

// Load environment variables from .env files
// .env.local takes precedence over .env for local development
config({ path: ".env" });        // Load base defaults first
config({ path: ".env.local", override: true });  // Load local overrides second (higher priority)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tool-registry.js";
import { cleanupToolResources } from "./tool/element-locator-tool.js";
import { log } from "./utils/logger.js";

// Create MCP server instance using high-level McpServer following SDK best practices
const server = new McpServer({
  name: "visual-ui-mcp-server",
  version: "3.1.0",
});

// Cleanup resources
async function cleanup(): Promise<void> {
  await cleanupToolResources();
}

// Register all tools using centralized registry
registerAllTools(server);

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
  log.info("Visual UI MCP Server started successfully");
}

main().catch((error) => {
  log.error("Failed to start server", error);
  process.exit(1);
});
