import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";

import { WaitHelper } from "@/core/wait-helper.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";
import { getBrowserLaunchOptions } from "../utils/browser.js";

// Implementation of the Wait Helper Tool following the MCP Tool interface
class WaitHelperTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "wait_helper",
      title: "Wait Helper Tool",
      description:
        "Advanced waiting mechanisms for reliable web automation including DOM changes, network idle, JavaScript execution, animations, and custom conditions",
      inputSchema: {
        action: z
          .enum([
            "wait_for_content",
            "wait_for_network_idle",
            "wait_for_js_execution",
            "wait_for_animation",
            "wait_for_custom",
            "wait_for_url_change",
            "wait_for_page_load",
          ])
          .describe("Wait action to perform"),
        selector: z
          .string()
          .optional()
          .describe("Element selector for animation waiting"),
        condition: z
          .string()
          .optional()
          .describe(
            "Condition to wait for (selector, XPath, or JS expression)"
          ),
        timeout: z
          .number()
          .optional()
          .describe("Maximum wait time in milliseconds (default: 10000)"),
        polling: z
          .union([z.number(), z.literal("raf")])
          .optional()
          .describe("Polling interval or 'raf' for requestAnimationFrame"),
        idleTime: z
          .number()
          .optional()
          .describe("Idle time for network waiting (default: 500ms)"),
        expectedUrl: z
          .union([z.string(), z.instanceof(RegExp)])
          .optional()
          .describe("Expected URL for URL change waiting"),
        networkIdle: z
          .boolean()
          .optional()
          .describe("Wait for network idle during page load"),
        jsExecution: z
          .boolean()
          .optional()
          .describe("Wait for JS execution during page load"),
        urlChange: z
          .boolean()
          .optional()
          .describe("Wait for URL change during page load"),
        url: z
          .string()
          .optional()
          .describe("URL to load before performing wait action (optional)"),
        html: z
          .string()
          .optional()
          .describe("HTML content to set for testing (optional)"),
      },
      handler: waitHelperFunction,
    };
  }

  // ❌ registerWith removed - registration now handled by tool-registry.ts
}

// Export the tool instance for registration
export const waitHelperTool = new WaitHelperTool();

/**
 * Handler function for wait helper tools following MCP SDK patterns - thin MCP wrapper
 */
async function waitHelperFunction(args: Record<string, any>, extra: any) {
  try {
    const typedArgs = args as {
      action:
        | "wait_for_content"
        | "wait_for_network_idle"
        | "wait_for_js_execution"
        | "wait_for_animation"
        | "wait_for_custom"
        | "wait_for_url_change"
        | "wait_for_page_load";
      selector?: string;
      condition?: string;
      timeout?: number;
      polling?: number | "raf";
      idleTime?: number;
      expectedUrl?: string | RegExp;
      networkIdle?: boolean;
      jsExecution?: boolean;
      urlChange?: boolean;
      url?: string;
      html?: string;
    };

    // Create a dedicated browser instance for this tool call to ensure isolation
    const browserInstance = await chromium.launch(getBrowserLaunchOptions());

    try {
      // Create a new page for this request
      const page = await browserInstance.newPage();

      try {
        // Handle HTML content or URL navigation
        const targetUrl = typedArgs.url;
        const htmlContent = typedArgs.html;

        if (htmlContent) {
          await page.setContent(htmlContent, { timeout: 10000 });
        } else if (targetUrl) {
          // Parse data URL for setContent
          if (targetUrl.startsWith("data:text/html,")) {
            const encodedHtml = targetUrl.substring("data:text/html,".length);
            const decodedHtml = decodeURIComponent(encodedHtml);
            await page.setContent(decodedHtml, { timeout: 10000 });
          } else if (targetUrl.startsWith("data:")) {
            await page.goto(targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: 10000,
            });
          } else {
            await page.goto(targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: 10000,
            });
          }
        }

        // Initialize the wait helper instance - call core business logic
        const waitHelper = new WaitHelper();

        // Execute the requested wait action on real browser/page context
        let result: any;

        switch (typedArgs.action) {
          case "wait_for_content":
            if (!typedArgs.condition) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "wait_for_content",
                      success: false,
                      error:
                        "condition parameter is required for content waiting",
                    }),
                  } as any,
                ],
              };
            }

            await waitHelper.waitForContent(page, {
              condition: typedArgs.condition,
              timeout: typedArgs.timeout || 10000,
              polling: typedArgs.polling || "raf",
            });

            result = {
              action: "wait_for_content",
              success: true,
              condition: typedArgs.condition,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for condition: ${typedArgs.condition}`,
            };
            break;

          case "wait_for_network_idle":
            await waitHelper.waitForNetworkIdle(
              page,
              typedArgs.idleTime || 500
            );

            result = {
              action: "wait_for_network_idle",
              success: true,
              idleTime: typedArgs.idleTime || 500,
              message: "Successfully waited for network idle",
            };
            break;

          case "wait_for_js_execution":
            await waitHelper.waitForJSExecution(
              page,
              typedArgs.timeout || 10000
            );

            result = {
              action: "wait_for_js_execution",
              success: true,
              timeout: typedArgs.timeout || 10000,
              message:
                "Successfully waited for JavaScript execution completion",
            };
            break;

          case "wait_for_animation":
            if (!typedArgs.selector) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "wait_for_animation",
                      success: false,
                      error:
                        "selector parameter is required for animation waiting",
                    }),
                  } as any,
                ],
              };
            }

            const element = await page
              .locator(typedArgs.selector)
              .elementHandle();
            if (!element) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "wait_for_animation",
                      success: false,
                      error: `Element not found: ${typedArgs.selector}`,
                    }),
                  } as any,
                ],
              };
            }

            await waitHelper.waitForAnimation(
              element,
              typedArgs.timeout || 10000
            );

            result = {
              action: "wait_for_animation",
              success: true,
              selector: typedArgs.selector,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for animation on element: ${typedArgs.selector}`,
            };
            break;

          case "wait_for_custom":
            if (!typedArgs.condition) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "wait_for_custom",
                      success: false,
                      error:
                        "condition parameter is required for custom waiting",
                    }),
                  } as any,
                ],
              };
            }

            await waitHelper.waitForCustom(
              page,
              typedArgs.condition,
              typedArgs.timeout || 10000
            );

            result = {
              action: "wait_for_custom",
              success: true,
              condition: typedArgs.condition,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for custom condition: ${typedArgs.condition}`,
            };
            break;

          case "wait_for_url_change":
            await waitHelper.waitForUrlChange(
              page,
              typedArgs.expectedUrl,
              typedArgs.timeout || 10000
            );

            result = {
              action: "wait_for_url_change",
              success: true,
              expectedUrl: typedArgs.expectedUrl,
              timeout: typedArgs.timeout || 10000,
              message: typedArgs.expectedUrl
                ? `Successfully waited for URL change to match: ${typedArgs.expectedUrl}`
                : "Successfully waited for URL change",
            };
            break;

          case "wait_for_page_load":
            await waitHelper.waitForPageLoad(page, {
              networkIdle: typedArgs.networkIdle,
              jsExecution: typedArgs.jsExecution,
              urlChange: typedArgs.urlChange,
              timeout: typedArgs.timeout || 10000,
            });

            const optionsUsed = {
              networkIdle: typedArgs.networkIdle,
              jsExecution: typedArgs.jsExecution,
              urlChange: typedArgs.urlChange,
              timeout: typedArgs.timeout || 10000,
            };

            result = {
              action: "wait_for_page_load",
              success: true,
              options: optionsUsed,
              message:
                "Successfully waited for complete page load with multiple conditions",
            };
            break;

          default:
            throw new Error(`Unsupported action: ${typedArgs.action}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            } as any,
          ],
        };
      } finally {
        // Always close the page to free resources
        await page.close();
      }
    } finally {
      // Always close the browser instance
      await browserInstance.close();
    }
  } catch (error) {
    // Handle errors following MCP SDK patterns
    if (error instanceof McpError) {
      throw error;
    }

    // Wrap unexpected errors in MCP error format
    throw new McpError(
      ErrorCode.InternalError,
      `Wait helper error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
