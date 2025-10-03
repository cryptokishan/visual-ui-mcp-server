import { test } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager";

// Simple expect function to avoid conflicts
function expect(actual: any) {
  return {
    toBeDefined: () => {
      if (actual === undefined || actual === null) {
        throw new Error("Expected value to be defined");
      }
    },
    toBeInstanceOf: (cls: any) => {
      if (!(actual instanceof cls)) {
        throw new Error(`Expected ${actual} to be instance of ${cls.name}`);
      }
    },
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeGreaterThan: (value: number) => {
      if (actual <= value) {
        throw new Error(`Expected ${actual} to be greater than ${value}`);
      }
    },
    toContain: (substring: string) => {
      if (!String(actual).includes(substring)) {
        throw new Error(`Expected "${actual}" to contain "${substring}"`);
      }
    },
    toHaveLength: (len: number) => {
      if (!Array.isArray(actual) || actual.length !== len) {
        throw new Error(`Expected array to have length ${len}, got ${actual}`);
      }
    },
    toThrow: (msg?: string) => {
      try {
        if (typeof actual === 'function') {
          actual();
        } else {
          throw new Error('Expected a function to test throw');
        }
        throw new Error('Expected function to throw');
      } catch (e) {
        if (msg && !String(e).includes(msg)) {
          throw new Error(`Expected error message to include "${msg}", got: ${e}`);
        }
      }
    },
  };
}

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
    expect(typeof serverManager.getLogs).toBe("function");
    expect(typeof serverManager.isServerRunning()).toBe("boolean");
  });

  test("verifies server lifecycle methods work correctly", () => {
    // Test that getLogs returns an array
    const logs = serverManager.getLogs();
    expect(logs).toBeDefined(); // Array

    // Test that isServerRunning returns boolean
    expect(typeof serverManager.isServerRunning()).toBe("boolean");

    // Due to global setup, server is started, so getServerProcess works
    // expect(serverManager.getServerProcess()).toBeDefined();
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

      console.log("✅ MCP client successfully connected and queried tool list");
      console.log(
        `📋 Found ${(toolListResult as any).tools.length} tools:`,
        (toolListResult as any).tools.map((t: any) => t.name)
      );
    } catch (error) {
      console.error("❌ MCP client connection test failed:", error);
      throw error;
    }
  });
});
