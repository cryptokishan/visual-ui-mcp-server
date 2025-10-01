import { expect, test } from "@playwright/test";
import { sendMCPRequest, getMCPTools } from "./mcp-test-setup";
test.describe("MCP Comprehensive Protocol Tests", () => {
    test("should handle basic MCP protocol communication", async () => {
        // Use the globally available MCP server
        const server = global.mcpServer;
        expect(server).toBeDefined();
        // Test tools/list
        const tools = await getMCPTools(server);
        expect(tools.length).toBeGreaterThan(0);
        // Test get_server_state
        const stateResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_server_state",
        });
        expect(stateResponse.result?.content?.[0]?.text).toBeDefined();
        // Test get_session_info
        const sessionResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_session_info",
        });
        expect(sessionResponse.result?.content?.[0]?.text).toBeDefined();
        // Test launch_browser
        const browserResponse = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: "data:text/html,<html><body><h1>MCP Test Page</h1><p>Testing MCP protocol</p></body></html>",
                headless: true,
            },
        });
        expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
        // Test take_screenshot
        const screenshotResponse = await sendMCPRequest(server, "tools/call", {
            name: "take_screenshot",
            arguments: {
                name: "mcp_test_screenshot",
                fullPage: false,
            },
        });
        expect(screenshotResponse.result?.content?.[0]?.text).toBeDefined();
        // Test find_element
        const elementResponse = await sendMCPRequest(server, "tools/call", {
            name: "find_element",
            arguments: {
                selectors: [{ type: "css", value: "h1", priority: 1 }],
            },
        });
        expect(elementResponse.result?.content?.[0]?.text).toBeDefined();
        // Test close_browser
        const closeResponse = await sendMCPRequest(server, "tools/call", {
            name: "close_browser",
        });
        expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
    });
});
