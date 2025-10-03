import { test, expect } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

test.describe("Form Handler MCP Tool Tests", () => {
  const testFormHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Form Handler MCP Test Page</title>
</head>
<body>
    <form id="test-form" action="/submit" method="POST">
        <input type="text" name="username" required>
        <input type="email" name="email" value="test@example.com">
        <input type="checkbox" name="agree" value="true">
        <select name="country">
            <option value="us">United States</option>
            <option value="ca">Canada</option>
        </select>
        <textarea name="comments" placeholder="Enter comments"></textarea>
        <button type="submit">Submit</button>
    </form>
</body>
</html>`;

  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP server registers form handler tool", async () => {
    const client = await serverManager.getMcpClient();

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      z.any()
    );

    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);

    // Check that form handler tool is registered
    expect(toolNames).toContain("form_handler");
  });

  test("successfully detects form fields via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "form_handler",
          arguments: {
            action: "detect_fields",
            formSelector: "#test-form",
            html: testFormHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("detect_fields");
    expect(content.success).toBe(true);
    expect(content.fields).toHaveLength(5);

    const usernameField = content.fields.find(
      (f: any) => f.selector === "username"
    );
    expect(usernameField.type).toBe("text");
    expect(usernameField.required).toBe(true);
  });

  test("successfully fills form fields via MCP tool", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "form_handler",
          arguments: {
            action: "fill_form",
            formSelector: "#test-form",
            data: {
              username: "testuser",
              email: "test@example.com",
              agree: "true",
              country: "us",
              comments: "This is a test comment",
            },
            html: testFormHtml,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("fill_form");
    expect(content.success).toBe(true);
    expect(content.filledFields).toContain("username");
    expect(content.filledFields).toContain("email");
  });

  test("handles missing required arguments", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "form_handler",
          arguments: {
            action: "fill_form",
            formSelector: "#test-form",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("fill_form");
    expect(content.success).toBe(false);
    expect(content.error).toContain("data parameter is required");
    expect(content.missingFields).toContain("data");
  });

  test("handles missing required form fields", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "form_handler",
          arguments: {
            action: "fill_form",
            formSelector: "#test-form",
            html: testFormHtml, // Now providing HTML content
            data: {
              email: "test@example.com", // Missing required "username"
              agree: "true",
              country: "us",
              comments: "Test comment",
            },
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("fill_form");
    expect(content.success).toBe(false);
    expect(content.error).toContain("Missing required fields");
    expect(content.missingFields).toContain("username");
    expect(content.requiredFields).toContain("username");
  });
});
