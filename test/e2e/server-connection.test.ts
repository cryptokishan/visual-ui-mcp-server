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
    const isRunning = serverManager.isServerRunning();
    expect(typeof isRunning).toBe("boolean");
    expect(isRunning).toBe(true);
  });

  test("can create multiple TestServerManager instances (but they share state)", () => {
    const manager2 = TestServerManager.getInstance();
    expect(manager2).toBe(serverManager);
  });
});

test.describe("MCP Server Communication Verification", () => {
  test("verifies MCP client can connect to server and query tools", async () => {
    const serverManager = TestServerManager.getInstance();

    const client = await serverManager.getMcpClient();
    expect(client).toBeDefined();

    const toolListResult = (await client.request(
      { method: "tools/list", params: {} },
      z.any()
    )) as any;

    expect(toolListResult).toBeDefined();
    expect(Array.isArray(toolListResult.tools)).toBe(true);
    expect(toolListResult.tools.length).toBeGreaterThan(0);

    const elementLocatorTool = toolListResult.tools.find(
      (tool: any) => tool.name === "locate_element"
    );
    expect(elementLocatorTool).toBeDefined();
    expect(elementLocatorTool.name).toBe("locate_element");
    expect(elementLocatorTool.description).toContain("Locate");
    expect(elementLocatorTool.inputSchema).toBeDefined();
  });
});
