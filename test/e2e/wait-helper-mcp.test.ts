import { test, expect } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

test.describe("Wait Helper MCP Tool Tests", () => {
  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP server registers wait helper tool", async () => {
    const client = await serverManager.getMcpClient();

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      z.any()
    );

    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);

    // Check that wait helper tool is registered
    expect(toolNames).toContain("wait_helper");
  });

  test("wait_for_content handles missing condition", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_content",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_content");
    expect(content.success).toBe(false);
    expect(content.error).toContain("condition parameter is required");
  });

  test("wait_for_content with CSS selector", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_content",
            condition: ".my-element",
            timeout: 5000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_content");
    expect(content.success).toBe(true);
    expect(content.condition).toBe(".my-element");
    expect(content.timeout).toBe(5000);
    expect(content.message).toContain("Successfully waited for condition");
  });

  test("wait_for_content with XPath expression", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_content",
            condition: "//div[@class='container']",
            timeout: 8000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_content");
    expect(content.success).toBe(true);
    expect(content.condition).toBe("//div[@class='container']");
    expect(content.timeout).toBe(8000);
  });

  test("wait_for_content with JavaScript expression", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_content",
            condition: "window.isReady",
            polling: "raf",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_content");
    expect(content.success).toBe(true);
    expect(content.condition).toBe("window.isReady");
    expect(content.message).toContain("Successfully waited for condition");
  });

  test("wait_for_network_idle", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_network_idle",
            idleTime: 1000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_network_idle");
    expect(content.success).toBe(true);
    expect(content.idleTime).toBe(1000);
    expect(content.message).toContain("Successfully waited for network idle");
  });

  test("wait_for_js_execution", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_js_execution",
            timeout: 15000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_js_execution");
    expect(content.success).toBe(true);
    expect(content.timeout).toBe(15000);
    expect(content.message).toContain(
      "Successfully waited for JavaScript execution completion"
    );
  });

  test("wait_for_animation", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_animation",
            timeout: 3000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_animation");
    expect(content.success).toBe(true);
    expect(content.timeout).toBe(3000);
    expect(content.message).toContain(
      "Successfully waited for animation completion"
    );
  });

  test("wait_for_custom handles missing expression", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_custom",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_custom");
    expect(content.success).toBe(false);
    expect(content.error).toContain("condition parameter is required");
  });

  test("wait_for_custom with expression", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_custom",
            condition: "document.body.scrollHeight > 1000",
            timeout: 10000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_custom");
    expect(content.success).toBe(true);
    expect(content.condition).toBe("document.body.scrollHeight > 1000");
    expect(content.timeout).toBe(10000);
  });

  test("wait_for_url_change", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_url_change",
            expectedUrl: "/dashboard",
            timeout: 12000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_url_change");
    expect(content.success).toBe(true);
    expect(content.expectedUrl).toBe("/dashboard");
    expect(content.timeout).toBe(12000);
    expect(content.message).toContain(
      "Successfully waited for URL change to: /dashboard"
    );
  });

  test("wait_for_url_change without expected URL", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_url_change",
            timeout: 8000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_url_change");
    expect(content.success).toBe(true);
    expect(content.expectedUrl).toBeUndefined();
    expect(content.message).toBe("Successfully waited for URL change");
  });

  test("wait_for_page_load with options", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "wait_helper",
          arguments: {
            action: "wait_for_page_load",
            networkIdle: true,
            jsExecution: true,
            urlChange: false,
            timeout: 20000,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("wait_for_page_load");
    expect(content.success).toBe(true);

    expect(content.options.networkIdle).toBe(true);
    expect(content.options.jsExecution).toBe(true);
    expect(content.options.urlChange).toBe(false);
    expect(content.options.timeout).toBe(20000);

    expect(content.message).toBe("Successfully waited for complete page load");
  });

  test("handles unknown wait action", async () => {
    const client = await serverManager.getMcpClient();

    try {
      await client.request(
        {
          method: "tools/call",
          params: {
            name: "wait_helper",
            arguments: {
              action: "unknown_action",
            },
          },
        },
        z.any()
      );
      // Should not reach here - error should be thrown
      throw new Error("Expected McpError to be thrown for invalid enum value");
    } catch (error: any) {
      // MCP SDK throws McpError for invalid enum values
      expect(error.message).toContain("Invalid arguments for tool wait_helper");
      expect(error.message).toContain("Invalid enum value");
      expect(error.message).toContain("unknown_action");
    }
  });
});
