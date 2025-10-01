import { expect, test } from "@playwright/test";
import { sendMCPRequest, getMCPTools, validateToolsAvailability } from "./mcp-test-setup";
test.describe("MCP Browser Monitoring Tools", () => {
    test("MCP browser monitoring tools work end-to-end", async () => {
        // Use the globally available MCP server
        const server = global.mcpServer;
        expect(server).toBeDefined();
        // Test tools/list
        const tools = await getMCPTools(server);
        expect(tools.length).toBeGreaterThan(0);
        const monitoringTools = [
            "start_browser_monitoring",
            "stop_browser_monitoring",
            "get_filtered_console_logs",
            "get_filtered_network_requests",
            "get_javascript_errors",
            "capture_performance_metrics",
        ];
        validateToolsAvailability(tools, monitoringTools);
        // Test launch_browser
        const browserResponse = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: "data:text/html,<html><body><h1>Test Page</h1><script>console.log('Test message'); setTimeout(() => console.error('Delayed error'), 100);</script></body></html>",
                headless: true,
            },
        });
        expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
        // Test start_browser_monitoring
        const startMonitoringResponse = await sendMCPRequest(server, "tools/call", {
            name: "start_browser_monitoring",
            arguments: {
                consoleFilter: { level: "error" },
                networkFilter: { method: "GET" },
                maxEntries: 100,
            },
        });
        expect(startMonitoringResponse.result?.content?.[0]?.text).toBeDefined();
        // Test get_filtered_console_logs
        const consoleLogsResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_filtered_console_logs",
            arguments: { level: "error" },
        });
        expect(consoleLogsResponse.result?.content?.[0]?.text).toBeDefined();
        // Test get_filtered_network_requests
        const networkRequestsResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_filtered_network_requests",
            arguments: { method: "GET" },
        });
        expect(networkRequestsResponse.result?.content?.[0]?.text).toBeDefined();
        // Test get_javascript_errors
        const jsErrorsResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_javascript_errors",
        });
        expect(jsErrorsResponse.result?.content?.[0]?.text).toBeDefined();
        // Test capture_performance_metrics
        const performanceResponse = await sendMCPRequest(server, "tools/call", {
            name: "capture_performance_metrics",
        });
        expect(performanceResponse.result?.content?.[0]?.text).toBeDefined();
        // Test stop_browser_monitoring
        const stopMonitoringResponse = await sendMCPRequest(server, "tools/call", {
            name: "stop_browser_monitoring",
        });
        expect(stopMonitoringResponse.result?.content?.[0]?.text).toBeDefined();
        // Test close_browser
        const closeResponse = await sendMCPRequest(server, "tools/call", {
            name: "close_browser",
        });
        expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
    });
});
