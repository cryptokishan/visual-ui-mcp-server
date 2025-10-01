import { expect, test } from "@playwright/test";
import { sendMCPRequest } from "./mcp-test-setup";
test.describe("MCP Visual Testing Tools Integration", () => {
    test("should handle visual testing functionality via MCP protocol", async () => {
        // Use the globally available MCP server
        const server = global.mcpServer;
        expect(server).toBeDefined();
        // Test launch_browser
        const browserResponse = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `file://${process.cwd()}/test/test-element-locator.html`,
                headless: true,
            },
        });
        expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
        // Test take_element_screenshot
        const elementScreenshotResponse = await sendMCPRequest(server, "tools/call", {
            name: "take_element_screenshot",
            arguments: {
                selector: "#test-button",
                name: "test-button-screenshot",
                format: "png",
                padding: 10,
            },
        });
        expect(elementScreenshotResponse.result?.content?.[0]?.text).toBeDefined();
        // Test take_responsive_screenshots
        const responsiveScreenshotsResponse = await sendMCPRequest(server, "tools/call", {
            name: "take_responsive_screenshots",
            arguments: {
                breakpoints: [320, 768, 1024],
                selector: "h1",
                fullPage: false,
            },
        });
        expect(responsiveScreenshotsResponse.result?.content?.[0]?.text).toBeDefined();
        // Test detect_visual_regression (create baseline first)
        const baselineResponse = await sendMCPRequest(server, "tools/call", {
            name: "detect_visual_regression",
            arguments: {
                name: "mcp-test-baseline",
                threshold: 0.1,
                includeAA: false,
            },
        });
        expect(baselineResponse.result?.content?.[0]?.text).toBeDefined();
        // Test detect_visual_regression again (should detect no regression)
        const regressionResponse = await sendMCPRequest(server, "tools/call", {
            name: "detect_visual_regression",
            arguments: {
                name: "mcp-test-baseline",
                threshold: 0.1,
                includeAA: false,
            },
        });
        expect(regressionResponse.result?.content?.[0]?.text).toBeDefined();
        // Test update_baseline
        const updateBaselineResponse = await sendMCPRequest(server, "tools/call", {
            name: "update_baseline",
            arguments: {
                testName: "mcp-test-baseline-updated",
            },
        });
        expect(updateBaselineResponse.result?.content?.[0]?.text).toBeDefined();
        // Test close_browser
        const closeResponse = await sendMCPRequest(server, "tools/call", {
            name: "close_browser",
        });
        expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
    });
});
