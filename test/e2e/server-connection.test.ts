import { expect, test } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager";

test.describe("Test Server Infrastructure Tests", () => {
  let serverManager: TestServerManager;

  test.beforeAll(() => {
    serverManager = TestServerManager.getInstance();
  });

  test("verifies TestServerManager can be instantiated", () => {
    expect(serverManager).toBeDefined();
    expect(serverManager).toBeInstanceOf(TestServerManager);
  });

  test("verifies TestServerManager has expected methods", () => {
    expect(serverManager.startServer).toBeDefined();
    expect(typeof serverManager.startServer).toBe("function");
    expect(typeof serverManager.stopServer).toBe("function");
    expect(typeof serverManager.isServerRunning()).toBe("boolean");
  });

  test("verifies server lifecycle methods work correctly", () => {
    // Test that isServerRunning returns boolean
    const isRunning = serverManager.isServerRunning();
    expect(typeof isRunning).toBe("boolean");

    // Test server process access when running
    if (isRunning) {
      expect(serverManager.getServerProcess()).toBeDefined();
    }
  });

  test("can create multiple TestServerManager instances (but they share state)", () => {
    const manager2 = TestServerManager.getInstance();
    expect(manager2).toBe(serverManager); // Singleton pattern
  });
});

test.describe("MCP Server Communication Verification", () => {
  test("verifies MCP client can connect to server and query tools", async () => {
    let serverManager: TestServerManager;

    try {
      // Get TestServerManager instance
      serverManager = TestServerManager.getInstance();

      // Create and get MCP client (this will spawn its own server process)
      const client = await serverManager.getMcpClient();
      expect(client).toBeDefined();

      // Query the tool list from the server
      const toolListResult = (await client.request(
        { method: "tools/list", params: {} },
        z.any() // Use permissive validation
      )) as any;

      // Verify we got a valid response
      expect(toolListResult).toBeDefined();
      expect(Array.isArray((toolListResult as any).tools)).toBe(true);

      // Verify we have at least one tool (element locator)
      expect((toolListResult as any).tools.length).toBeGreaterThan(0);

      // Find the element-locator tool
      const elementLocatorTool = (toolListResult as any).tools.find(
        (tool: any) => tool.name === "locate_element"
      );
      expect(elementLocatorTool).toBeDefined();
      expect(elementLocatorTool.name).toBe("locate_element");
      expect(elementLocatorTool.description).toContain("Locate");
      expect(elementLocatorTool.inputSchema).toBeDefined();

      // Test passed - validated MCP client connection and tool querying
    } catch (error) {
      console.error("❌ MCP client connection test failed:", error);
      throw error;
    }
  });
});
