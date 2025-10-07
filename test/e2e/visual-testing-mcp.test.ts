import { test, expect } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

test.describe("Visual Testing MCP Tool Tests", () => {
  const testPageHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Visual Testing MCP Test Page</title>
    <style>
        .container { width: 800px; margin: 20px auto; }
        .header { background: #f0f0f0; padding: 20px; margin-bottom: 20px; }
        .content { background: #ffffff; padding: 20px; border: 1px solid #ccc; }
        .button { background: blue; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        .special-element { background: red; color: white; padding: 10px; margin: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Header</h1>
        </div>
        <div class="content">
            <p>This is test content for visual testing.</p>
            <button class="button">Click Me</button>
        </div>
        <div class="special-element" id="special">
            Special Element for Testing
        </div>
    </div>
</body>
</html>`;

  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP server registers visual testing tool", async () => {
    const client = await serverManager.getMcpClient();

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      z.any()
    );

    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);

    // Check that visual testing tool is registered
    expect(toolNames).toContain("visual_testing");
  });

  test("successfully captures full page screenshot via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "full",
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("capture_selective");
    expect(content.success).toBe(true);
    expect(content.type).toBe("full");
    expect(content.format).toBe("png");
    expect(content.base64).toBeDefined();
    expect(typeof content.base64).toBe("string");
    expect(content.size).toBeGreaterThan(0);
  });

  test("successfully captures element screenshot via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "element",
            selector: ".special-element",
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("capture_selective");
    expect(content.success).toBe(true);
    expect(content.type).toBe("element");
    expect(content.base64).toBeDefined();
    expect(content.size).toBeGreaterThan(0);
  });

  test("successfully captures region screenshot via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "region",
            clip: { x: 0, y: 0, width: 200, height: 100 },
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("capture_selective");
    expect(content.success).toBe(true);
    expect(content.type).toBe("region");
    expect(content.base64).toBeDefined();
    expect(content.size).toBeGreaterThan(0);
  });

  test("handles missing selector for element screenshots", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "element",
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("capture_selective");
    expect(content.success).toBe(false);
    expect(content.error).toContain("selector parameter is required");
    expect(content.type).toBe("element");
  });

  test("handles missing clip for region screenshots", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "region",
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("capture_selective");
    expect(content.success).toBe(false);
    expect(content.error).toContain("clip parameter is required");
    expect(content.type).toBe("region");
  });

  test("successfully compares screenshots via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    // First, capture two identical screenshots
    const screenshotResponse1 = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "full",
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    const screenshot1 = JSON.parse(screenshotResponse1.content[0].text);

    // Compare identical screenshots
    const compareResponse = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "compare_screenshots",
            screenshot1: screenshot1.base64,
            screenshot2: screenshot1.base64, // Same screenshot
          },
        },
      },
      z.any()
    );

    expect(compareResponse).toBeDefined();
    const compareContent = JSON.parse(compareResponse.content[0].text);
    expect(compareContent.action).toBe("compare_screenshots");
    expect(compareContent.success).toBe(true);
    expect(compareContent.isDifferent).toBe(false);
    expect(compareContent.score).toBe(0.0);
    expect(compareContent.pixelDifferenceCount).toBe(0);
  });

  test("handles missing screenshots for comparison", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "compare_screenshots",
            screenshot1: "base64data",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("compare_screenshots");
    expect(content.success).toBe(false);
    expect(content.error).toContain("Both screenshot1 and screenshot2");
  });

  test("successfully tests responsive breakpoints via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "test_responsive",
            breakpoints: ["mobile", "tablet", "desktop"],
            html: testPageHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("test_responsive");
    expect(content.success).toBe(true);
    expect(content.breakpoints).toEqual(["mobile", "tablet", "desktop"]);
    expect(content.screenshots).toBeDefined();
    expect(Object.keys(content.screenshots)).toHaveLength(3);
    expect(content.screenshots.mobile).toBeDefined();
    expect(content.screenshots.tablet).toBeDefined();
    expect(content.screenshots.desktop).toBeDefined();
  });

  test("handles element not found error for element screenshots", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "visual_testing",
          arguments: {
            action: "capture_selective",
            type: "element",
            selector: ".nonexistent-element",
            html: testPageHtml,
          },
        },
      },
      z.any(),
      { timeout: 5000 } // Add shorter timeout for error test
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("capture_selective");
    expect(content.success).toBe(false);
    expect(content.error).toContain("not found");
    expect(content.type).toBe("element");
  });

  test("successfully captures screenshot with different formats", async () => {
    const client = await serverManager.getMcpClient();

    const formats = ["png", "jpeg"];

    for (const format of formats) {
      const response = await client.request(
        {
          method: "tools/call",
          params: {
            name: "visual_testing",
            arguments: {
              action: "capture_selective",
              type: "full",
              format: format,
              quality: format === "jpeg" ? 80 : undefined,
              html: testPageHtml,
            },
          },
        },
        z.any()
      );

      expect(response).toBeDefined();
      const content = JSON.parse(response.content[0].text);
      expect(content.action).toBe("capture_selective");
      expect(content.success).toBe(true);
      expect(content.format).toBe(format);
      expect(content.base64).toBeDefined();
    }
  });
});
