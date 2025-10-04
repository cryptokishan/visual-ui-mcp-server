/**
 * E2E tests for Accessibility Tester MCP functionality
 * Tests WCAG audits, color contrast analysis, keyboard navigation testing, and comprehensive reports
 */

import { expect, test } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

/**
 * Test HTML content with various accessibility violations and good practices
 */
const testHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head><title>Accessibility Test Page</title></head>
<body>
    <h1>Welcome to Accessibility Test</h1>

    <!-- Missing alt text violation -->
    <img src="test.jpg" />

    <!-- Low contrast text -->
    <p style="color: #888; background: #999;">Low contrast text example</p>

    <!-- Good contrast text -->
    <p style="color: #000; background: #fff;">Good contrast text example</p>

    <!-- Missing form labels -->
    <form>
        <input type="text" name="name" />
        <input type="email" name="email" />
    </form>

    <!-- Properly labeled form -->
    <form>
        <label for="name2">Name:</label>
        <input type="text" id="name2" name="name" />
        <label for="email2">Email:</label>
        <input type="email" id="email2" name="email" />
    </form>

    <!-- Buttons and links -->
    <button>Click me</button>
    <a href="#section1">Skip to content</a>

    <!-- Focusable elements -->
    <button id="focusBtn1" tabindex="0">Focusable Button 1</button>
    <button id="focusBtn2" tabindex="0">Focusable Button 2</button>

    <!-- Hidden button (should be focusable) -->
    <button id="hiddenBtn" style="display: none;" tabindex="0">Hidden Button</button>

    <script>
        // Add some accessibility issues via JavaScript
        window.onload = function() {
            // Dynamically create content without proper labeling
            const div = document.createElement('div');
            div.innerHTML = '<input type="text" aria-label="Dynamic input">';
            document.body.appendChild(div);
        };
    </script>
</body>
</html>
`;

test.describe("Accessibility Tester MCP Tool Tests", () => {
  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP server registers accessibility tester tool", async () => {
    const client = await serverManager.getMcpClient();

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      z.any()
    );

    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);

    // Check that accessibility tester tool is registered
    expect(toolNames).toContain("accessibility_tester");
  });

  test("successfully runs accessibility audit", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "run_accessibility_audit",
            html: testHtmlContent,
            standards: ["WCAG2AA"],
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("run_accessibility_audit");
    expect(content.success).toBe(true);
    expect(content.summary).toBeDefined();

    // Check summary structure
    expect(typeof content.summary.passed).toBe("number");
    expect(typeof content.summary.failed).toBe("number");
    expect(typeof content.summary.incomplete).toBe("number");
    expect(typeof content.summary.total).toBe("number");

    // May have some violations with this test content
    expect(Array.isArray(content.violations)).toBe(true);
    expect(content.url).toBeDefined();
    expect(content.timestamp).toBeDefined();
  });

  test("successfully checks color contrast", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "check_color_contrast",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("check_color_contrast");
    expect(content.success).toBe(true);

    // Verify contrast results structure
    expect(typeof content.totalElements).toBe("number");
    expect(typeof content.passed).toBe("number");
    expect(typeof content.failed).toBe("number");
    expect(Array.isArray(content.results)).toBe(true);

    // Check each result (if any)
    if (content.results.length > 0) {
      const firstResult = content.results[0];
      expect(firstResult).toHaveProperty("element");
      expect(firstResult).toHaveProperty("foreground");
      expect(firstResult).toHaveProperty("background");
      expect(typeof firstResult.ratio).toBe("number");
      expect(typeof firstResult.passes).toBe("boolean");
      expect(typeof firstResult.required).toBe("number");
    }
  });

  test("successfully tests keyboard navigation", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "test_keyboard_navigation",
            html: testHtmlContent,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("test_keyboard_navigation");
    expect(content.success).toBe(true);

    // Verify keyboard navigation results
    expect(content.summary).toBeDefined();
    expect(typeof content.summary.totalSteps).toBe("number");
    expect(typeof content.summary.focusableSteps).toBe("number");
    expect(typeof content.summary.visibleSteps).toBe("number");
    expect(typeof content.summary.issuesCount).toBe("number");

    expect(Array.isArray(content.issues)).toBe(true);
    expect(typeof content.focusableElements).toBe("number");
    expect(typeof content.totalElements).toBe("number");
  });

  test("successfully generates comprehensive accessibility report", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "generate_accessibility_report",
            html: testHtmlContent,
            standards: ["WCAG2AA"],
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("generate_accessibility_report");
    expect(content.success).toBe(true);

    // Verify report structure
    expect(typeof content.report.overallScore).toBe("number");
    expect(content.report.overallScore).toBeGreaterThanOrEqual(0);
    expect(content.report.overallScore).toBeLessThanOrEqual(100);

    expect(Array.isArray(content.report.recommendations)).toBe(true);

    // Check audit summary
    expect(content.report.auditSummary).toBeDefined();
    expect(typeof content.report.auditSummary.passed).toBe("number");
    expect(typeof content.report.auditSummary.failed).toBe("number");

    // Check keyboard summary
    expect(content.report.keyboardSummary).toBeDefined();
    expect(content.report.keyboardSummary.totalSteps).toBeDefined();

    expect(content.report.url).toBeDefined();
    expect(content.report.timestamp).toBeDefined();
  });

  test("handles audit with different standards", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "run_accessibility_audit",
            html: testHtmlContent,
            standards: ["WCAG2A", "Section508"],
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("run_accessibility_audit");
    expect(content.success).toBe(true);
    expect(content.violations).toBeDefined();
  });

  test("handles contrast check with specific selector", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "check_color_contrast",
            html: testHtmlContent,
            selector: "p",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("check_color_contrast");
    expect(content.success).toBe(true);
    expect(content.results).toBeDefined();

    // Since we used a specific selector, it should only test those elements
    if (content.results.length > 0) {
      content.results.forEach((result: any) => {
        expect(result.element.toLowerCase()).toContain("text");
      });
    }
  });

  test("includes best practices in audit", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "run_accessibility_audit",
            html: testHtmlContent,
            standards: ["WCAG2AA"],
            includeBestPractices: true,
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.action).toBe("run_accessibility_audit");
    expect(content.success).toBe(true);
  });

  test("handles invalid HTML gracefully", async () => {
    const client = await serverManager.getMcpClient();

    const invalidHtml = "<html><body><p>Unclosed paragraph";

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "run_accessibility_audit",
            html: invalidHtml,
          },
        },
      },
      z.any()
    );

    // Should still work with malformed HTML
    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
  });

  test("includes contrast summary in report when selector provided", async () => {
    const client = await serverManager.getMcpClient();

    const response = await client.request(
      {
        method: "tools/call",
        params: {
          name: "accessibility_tester",
          arguments: {
            action: "generate_accessibility_report",
            html: testHtmlContent,
            selector: "form, p",
          },
        },
      },
      z.any()
    );

    expect(response).toBeDefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.success).toBe(true);
    expect(content.report.contrastSummary).toBeDefined();

    // Should have contrast data
    const contrastSummary = content.report.contrastSummary;
    expect(typeof contrastSummary.total).toBe("number");
    expect(typeof contrastSummary.passed).toBe("number");
    expect(typeof contrastSummary.failed).toBe("number");
  });
});
