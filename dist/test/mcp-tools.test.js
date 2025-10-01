import { expect, test } from "@playwright/test";
import { sendMCPRequest } from "./mcp-test-setup";
test.describe("MCP Tools Integration", () => {
    test("should handle enhanced element finding via MCP protocol", async () => {
        // Use the globally available MCP server
        const server = global.mcpServer;
        expect(server).toBeDefined();
        // Test launch_browser for element finding
        const browserResponse = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `file://${process.cwd()}/test/test-element-locator.html`,
                headless: true,
            },
        });
        expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
        // Test find_element with enhanced selectors
        const elementResponse = await sendMCPRequest(server, "tools/call", {
            name: "find_element",
            arguments: {
                selectors: [
                    { type: "css", value: "#test-button", priority: 0 },
                    { type: "data", value: "submit-btn", priority: 1 },
                    { type: "text", value: "Submit", priority: 2 },
                ],
                timeout: 5000,
                waitForVisible: true,
            },
        });
        expect(elementResponse.result?.content?.[0]?.text).toBeDefined();
        // Test find_element with multiple selector strategies
        const multiElementResponse = await sendMCPRequest(server, "tools/call", {
            name: "find_element",
            arguments: {
                selectors: [
                    { type: "css", value: "#nonexistent", priority: 0 },
                    { type: "aria", value: "Search field", priority: 1 },
                    { type: "xpath", value: "//input[@id='search']", priority: 2 },
                ],
                timeout: 5000,
            },
        });
        expect(multiElementResponse.result?.content?.[0]?.text).toBeDefined();
        // Test close_browser
        const closeResponse1 = await sendMCPRequest(server, "tools/call", {
            name: "close_browser",
        });
        expect(closeResponse1.result?.content?.[0]?.text).toBeDefined();
        // Test launch_browser for form handling
        const browserResponse2 = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `file://${process.cwd()}/test/test-form-handler.html`,
                headless: true,
            },
        });
        expect(browserResponse2.result?.content?.[0]?.text).toBeDefined();
        // Test fill_form
        const formResponse = await sendMCPRequest(server, "tools/call", {
            name: "fill_form",
            arguments: {
                fields: [
                    { selector: "#username", value: "mcp-test-user" },
                    { selector: "#email", value: "mcp-test@example.com" },
                    { selector: "#password", value: "mcp-password123" },
                    { selector: "#terms", value: true, type: "checkbox" },
                ],
            },
        });
        expect(formResponse.result?.content?.[0]?.text).toBeDefined();
        // Test submit_form
        const submitResponse = await sendMCPRequest(server, "tools/call", {
            name: "submit_form",
            arguments: {
                submitSelector: "#submit-btn",
                captureScreenshot: false,
            },
        });
        expect(submitResponse.result?.content?.[0]?.text).toBeDefined();
        // Test close_browser
        const closeResponse = await sendMCPRequest(mcpServer, "tools/call", {
            name: "close_browser",
        });
        expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
    });
});
