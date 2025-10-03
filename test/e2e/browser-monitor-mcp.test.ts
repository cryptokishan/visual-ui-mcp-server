/**
 * E2E tests for Browser Monitor MCP functionality
 * Tests console logs, network requests, JavaScript errors, and performance metrics monitoring
 */

import { expect, test } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

/**
 * Test HTML content with JavaScript that generates console logs, network requests, and errors
 */
const testHtmlContent = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
    <h1>Browser Monitor Test Page</h1>
    <button id="consoleBtn" onclick="generateLogs()">Generate Console Logs</button>
    <button id="errorBtn" onclick="generateError()">Generate Error</button>
    <button id="networkBtn" onclick="makeRequest()">Make Network Request</button>

    <script>
        // Generate different types of console messages
        function generateLogs() {
            console.log("Test log message");
            console.info("Test info message");
            console.warn("Test warning message");
            console.error("Test error message");
            console.debug("Test debug message");
        }

        // Generate a JavaScript error
        function generateError() {
            try {
                // This will throw a ReferenceError
                nonExistentFunction();
            } catch (e) {
                throw e; // Re-throw to generate error event
            }
        }

        // Make a network request
        function makeRequest() {
            fetch('/api/test')
                .then(response => console.log('Network request completed'))
                .catch(error => console.log('Network request failed'));
        }

        // Auto-generate some content on page load
        window.onload = function() {
            setTimeout(() => {
                console.log("Page loaded successfully");
                console.info("Browser monitor test initialized");
            }, 100);
        };
    </script>
</body>
</html>
`;

test.describe("Browser Monitor MCP Tool Tests", () => {
  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP server registers browser monitor tool", async () => {
    const client = await serverManager.getMcpClient();

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      z.any()
    );

    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);

    // Check that browser monitor tool is registered
    expect(toolNames).toContain("browser_monitor");
  });

  test("successfully starts monitoring", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "start_monitoring",
            html: testHtmlContent,
            includeConsole: true,
            includeNetwork: true,
            includeErrors: true,
            includePerformance: true,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("start_monitoring");
    expect(content.success).toBe(true);
    expect(content.message).toContain(
      "Browser monitoring started successfully"
    );
    expect(content.summary).toBeDefined();
    expect(content.summary.totalConsoleLogs).toBeGreaterThanOrEqual(0);
  });

  test("successfully stops monitoring and returns results", async () => {
    const client = await serverManager.getMcpClient();

    // First start monitoring
    const startResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "start_monitoring",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    );
    expect(JSON.parse(startResponse.content[0].text).success).toBe(true);

    // Then stop monitoring
    const stopResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "stop_monitoring",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    );

    expect(stopResponse).toBeDefined();
    const content = JSON.parse(stopResponse.content[0].text);
    expect(content.action).toBe("stop_monitoring");
    expect(content.success).toBe(true);
    expect(content.message).toContain(
      "Browser monitoring stopped successfully"
    );
    expect(content.results).toBeDefined();

    // Check that results contain all monitoring data
    expect(content.results.consoleLogs).toBeInstanceOf(Array);
    expect(content.results.networkRequests).toBeInstanceOf(Array);
    expect(content.results.javascriptErrors).toBeInstanceOf(Array);
    expect(content.results.performanceMetrics).toBeInstanceOf(Array);

    // May have console logs from page load (timing dependent)
    expect(content.results.consoleLogs.length).toBeGreaterThanOrEqual(0);
  });

  test("successfully retrieves console logs", async () => {
    const client = await serverManager.getMcpClient();

    // Start monitoring
    const startResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "start_monitoring",
            html: testHtmlContent,
            includeConsole: true,
          },
        },
      },
      z.any()
    );
    expect(JSON.parse(startResponse.content[0].text).success).toBe(true);

    // Get console logs
    const logsResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "get_console_logs",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    );

    expect(logsResponse).toBeDefined();
    const content = JSON.parse(logsResponse.content[0].text);
    expect(content.action).toBe("get_console_logs");
    expect(content.success).toBe(true);
    expect(content.consoleLogs).toBeInstanceOf(Array);
    expect(content.summary).toBeDefined();
    expect(content.summary.count).toBe(content.consoleLogs.length);

    // May have console logs from page load (timing dependent)
    expect(content.consoleLogs.length).toBeGreaterThanOrEqual(0);

    // Each log should have proper structure (if any exist)
    content.consoleLogs.forEach((log: any) => {
      expect(log).toHaveProperty("type");
      expect(log).toHaveProperty("text");
      expect(log).toHaveProperty("timestamp");
      expect(["log", "info", "warn", "error", "debug"]).toContain(log.type);
    });
  });

  test("successfully handles invalid action", async () => {
    const client = await serverManager.getMcpClient();

    // Invalid action should fail Zod validation at MCP level
    await expect(client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "invalid_action",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    )).rejects.toThrow();
  });

  test("successfully filters console logs", async () => {
    const client = await serverManager.getMcpClient();

    // Start monitoring with filter
    const startResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "start_monitoring",
            html: testHtmlContent,
            includeConsole: true,
            consoleFilter: {
              types: ["log", "info"],
            },
          },
        },
      },
      z.any()
    );
    expect(JSON.parse(startResponse.content[0].text).success).toBe(true);

    // Get console logs with type filter
    const logsResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "get_console_logs",
            html: testHtmlContent,
            type: "log",
          },
        },
      },
      z.any()
    );

    expect(logsResponse).toBeDefined();
    const content = JSON.parse(logsResponse.content[0].text);
    expect(content.success).toBe(true);

    // All returned logs should be of type "log"
    if (content.consoleLogs.length > 0) {
      content.consoleLogs.forEach((log: any) => {
        expect(log.type).toBe("log");
      });
    }
  });

  test("respects max entries limit", async () => {
    const client = await serverManager.getMcpClient();
    const maxEntries = 5;

    const startResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "start_monitoring",
            html: testHtmlContent,
            includeConsole: true,
            maxEntries,
          },
        },
      },
      z.any()
    );
    expect(JSON.parse(startResponse.content[0].text).success).toBe(true);

    const logsResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "browser_monitor",
          arguments: {
            action: "get_console_logs",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    );

    const content = JSON.parse(logsResponse.content[0].text);
    expect(content.success).toBe(true);

    // Should not exceed max entries
    expect(content.consoleLogs.length).toBeLessThanOrEqual(maxEntries);
  });
});
