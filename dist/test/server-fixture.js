import { test as base, expect } from "@playwright/test";
import { initializeMCPConnection, startMCPServer, stopMCPServer, } from "./mcp-test-setup";
export const test = base.extend({
    mcpServer: [
        async ({}, use) => {
            console.log("🚀 Starting MCP server for tests...");
            const server = await startMCPServer();
            await initializeMCPConnection(server);
            await use(server);
            console.log("🛑 Stopping MCP server after tests...");
            stopMCPServer(server);
        },
        { scope: "test" },
    ],
});
export { expect };
