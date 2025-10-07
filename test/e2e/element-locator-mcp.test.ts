import { test, expect } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

test.describe("Element Locator MCP Tool Tests", () => {
  const testPageUrl =
    "data:text/html," +
    encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head><title>Element Locator MCP Test Page</title></head>
      <body>
        <h1>Test Page</h1>
        <button onclick="alert('clicked')">Click me</button>
        <div class="test-class">Test element</div>
        <span data-testid="test-element">Data attribute element</span>
        <div aria-label="Aria button">Aria element</div>
        <input type="text" placeholder="Test input" />
        <div style="display: none;">Hidden element</div>
        <iframe src="data:text/html,<h2>Frame content</h2>"></iframe>
      </body>
    </html>
  `);

  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP tool protocol test - basic tool call without URL", async () => {
    const client = await serverManager.getMcpClient();

    // First, let's test if tool call works without URL (should load about:blank)
    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
          arguments: {
            selector: "body", // Most basic selector that will exist
            type: "css",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content).toHaveLength(1);

    const content = JSON.parse(response.content[0].text);
    // Should find body element even on about:blank
    expect(content.success).toBe(true);
    expect(content.selector).toBe("body");
    expect(content.message).toContain("Element located successfully");
  });

  test("MCP tool protocol test - CSS selector with URL", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
        arguments: {
          selector: "h1", // Simple CSS selector
          type: "css",
          url: testPageUrl,
        },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.selector).toBe("h1");
    expect(content.message).toContain("Element located successfully");
  });

  test("successfully locates element using XPath selector via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
        arguments: {
          selector: "//button", // XPath selector
          type: "xpath",
          url: testPageUrl,
        },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.selector).toBe("//button");
    expect(content.message).toContain("Element located successfully");
  });

  test("successfully locates element using text selector via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
        arguments: {
          selector: "Click me", // Text to find
          type: "text",
          url: testPageUrl,
        },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.selector).toBe("Click me");
    expect(content.message).toContain("Element located successfully");
  });

  test("successfully locates element using ARIA selector via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
        arguments: {
          selector: '[aria-label="Aria button"]', // CSS with ARIA attribute
          type: "css",
          url: testPageUrl,
        },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.selector).toBe('[aria-label="Aria button"]');
    expect(content.message).toContain("Element located successfully");
  });

  test("successfully locates element using data attribute selector via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
          arguments: {
            selector: '[data-testid="test-element"]', // CSS data attribute selector
            url: testPageUrl,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.selector).toBe('[data-testid="test-element"]');
    expect(content.message).toContain("Element located successfully");
  });

  test("handles non-existent elements gracefully via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
          arguments: {
            selector: ".nonexistent-element",
            type: "css",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(false);
    expect(content.selector).toBe(".nonexistent-element");
    expect(content.message).toContain("Element not found");
  });

  test("successfully locates using compound selectors via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "locate_element",
          arguments: {
            selector: "div >> text=Test element", // Compound selector using >>
            url: testPageUrl,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.selector).toBe("div >> text=Test element");
    expect(content.message).toContain("Element located successfully");
  });

  test("handles missing required parameters via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    try {
      await client.request(
        {
          method: "tools/call",
          params: {
            name: "locate_element",
            arguments: {
              // Missing required 'selector' field
            },
          },
        },
        z.any()
      );
      expect(true).toBe(false); // Force test failure if no error
    } catch (error: any) {
      // Should get validation error for missing required field
      expect(/Required|Missing/i.test(error.message)).toBe(true);
    }
  });
});
