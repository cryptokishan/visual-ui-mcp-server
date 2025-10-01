import { stopMCPServer } from "./mcp-test-setup";
async function globalTeardown() {
    console.log("🛑 Stopping MCP server after all tests...");
    try {
        if (global.mcpServer) {
            stopMCPServer(global.mcpServer);
            console.log("✅ MCP server stopped successfully");
        }
        else {
            console.log("⚠️ No MCP server instance found to stop");
        }
    }
    catch (error) {
        console.error("❌ Error stopping MCP server:", error);
        // Don't throw here as it might mask actual test failures
    }
}
export default globalTeardown;
