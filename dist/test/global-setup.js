import { initializeMCPConnection, startMCPServer, } from "./mcp-test-setup";
async function globalSetup() {
    console.log("🚀 Starting MCP server for all tests...");
    try {
        // Start the MCP server once for all tests
        global.mcpServer = await startMCPServer();
        // Initialize the connection
        await initializeMCPConnection(global.mcpServer);
        console.log("✅ MCP server started and initialized successfully");
    }
    catch (error) {
        console.error("❌ Failed to start MCP server:", error);
        throw error;
    }
}
export default globalSetup;
