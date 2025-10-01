import { expect, test } from "@playwright/test";
import { sendMCPRequest, getMCPTools, validateToolsAvailability } from "./mcp-test-setup";
test.describe("MCP User Journey Tools", () => {
    test("MCP user journey tools work end-to-end", async () => {
        // Use the globally available MCP server
        const server = global.mcpServer;
        expect(server).toBeDefined();
        // Test tools/list
        const tools = await getMCPTools(server);
        expect(tools.length).toBeGreaterThan(0);
        const journeyTools = [
            "run_user_journey",
            "record_user_journey",
            "validate_journey_definition",
            "optimize_journey_definition",
        ];
        validateToolsAvailability(tools, journeyTools);
        // Test launch_browser
        const browserResponse = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: 'data:text/html,<html><body><h1>Journey Test Page</h1><input id="name" type="text"><button id="submit">Submit</button></body></html>',
                headless: true,
            },
        });
        expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
        // Test run_user_journey
        const journeyResponse = await sendMCPRequest(server, "tools/call", {
            name: "run_user_journey",
            arguments: {
                name: "MCP Journey Test",
                steps: [
                    {
                        id: "type_name",
                        action: "type",
                        selector: "#name",
                        value: "MCP Test User",
                        description: "Enter name in input field",
                    },
                    {
                        id: "click_submit",
                        action: "click",
                        selector: "#submit",
                        description: "Click submit button",
                    },
                    {
                        id: "take_screenshot",
                        action: "screenshot",
                        value: "mcp_journey_complete",
                        description: "Take completion screenshot",
                    },
                ],
                onStepComplete: true,
            },
        });
        expect(journeyResponse.result?.content?.[0]?.text).toBeDefined();
        // Test validate_journey_definition
        const validateResponse = await sendMCPRequest(server, "tools/call", {
            name: "validate_journey_definition",
            arguments: {
                name: "Validation Test Journey",
                description: "Testing journey validation",
                steps: [
                    {
                        id: "valid_step1",
                        action: "navigate",
                        value: "https://example.com",
                        description: "Navigate to example",
                    },
                    {
                        id: "valid_step2",
                        action: "wait",
                        selector: "h1",
                        description: "Wait for heading",
                    },
                ],
            },
        });
        expect(validateResponse.result?.content?.[0]?.text).toBeDefined();
        // Test optimize_journey_definition
        const optimizeResponse = await sendMCPRequest(server, "tools/call", {
            name: "optimize_journey_definition",
            arguments: {
                name: "Optimization Test Journey",
                steps: [
                    {
                        id: "opt_step1",
                        action: "navigate",
                        value: "https://example.com",
                        timeout: 5000,
                        description: "Navigate with short timeout",
                    },
                    {
                        id: "opt_step2",
                        action: "wait",
                        timeout: 2000,
                        description: "Wait with custom timeout",
                    },
                ],
            },
        });
        expect(optimizeResponse.result?.content?.[0]?.text).toBeDefined();
        // Test record_user_journey
        const recordResponse = await sendMCPRequest(server, "tools/call", {
            name: "record_user_journey",
            arguments: {
                name: "Recorded Journey Test",
                description: "Testing journey recording",
            },
        });
        expect(recordResponse.result?.content?.[0]?.text).toBeDefined();
        // Test close_browser
        const closeResponse = await sendMCPRequest(server, "tools/call", {
            name: "close_browser",
        });
        expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
    });
});
