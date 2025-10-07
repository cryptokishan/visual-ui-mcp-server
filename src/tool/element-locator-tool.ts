import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import { getBrowserLaunchOptions, cleanupBrowser } from "../utils/browser.js";
import { ElementLocator } from "../core/element-locator.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";

// Implementation of the Element Locator Tool following the MCP Tool interface
class ElementLocatorTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "locate_element",
      title: "Element Locator Tool",
      description:
        "Locate web elements using Playwright selector syntax with full support for CSS, XPath, text selectors, shadow DOM, iframes, and compound selectors",
      inputSchema: {
        type: z
          .enum(["css", "xpath", "text", "aria", "data"])
          .optional()
          .describe(
            "Selector type: css, xpath, text, aria, data. If not specified, will try all strategies with fallbacks (optional)"
          ),
        selector: z
          .string()
          .describe(
            "Playwright selector string (supports CSS selectors, XPath expressions, text selectors, compound selectors with '>>', shadow DOM with 'shadow-root-selectors', etc.)"
          ),
        html: z
          .string()
          .optional()
          .describe("HTML content to set for testing (optional)"),
        url: z
          .string()
          .optional()
          .describe("URL to load before element location (optional)"),
        timeout: z
          .number()
          .default(10000)
          .describe(
            "Timeout in milliseconds for element location (default: 10000)"
          ),
        retryCount: z
          .number()
          .default(3)
          .describe(
            "Number of retry attempts with exponential backoff (default: 3)"
          ),
        visible: z
          .boolean()
          .default(false)
          .describe(
            "Whether the element should be visible and interactable (default: false)"
          ),
      },
      handler: locateElementHandler,
    };
  }

  // ❌ registerWith removed - registration now handled by tool-registry.ts
}

// Export the tool instance for registration
export const elementLocatorTool = new ElementLocatorTool();

/**
 * Handler function for the locate_element tool following MCP SDK registerTool signature
 */
async function locateElementHandler(args: Record<string, any>, extra: any) {
  try {
    // The Zod schema validation ensures proper types are passed
    const typedArgs = args as {
      type?: "css" | "xpath" | "text" | "aria" | "data";
      selector: string;
      timeout?: number;
      retryCount?: number;
      visible?: boolean;
      url?: string;
      html?: string;
    };

    // Create a dedicated browser instance for this tool call to ensure isolation
    const browserInstance = await chromium.launch(getBrowserLaunchOptions());

    const locatorInstance = getLocator();

    try {
      // Create a new page for this request
      const page = await browserInstance.newPage();

      try {
        // Handle HTML content or URL navigation
        const targetUrl = typedArgs.url;
        const htmlContent = typedArgs.html;

        if (htmlContent) {
          console.log("ElementLocator Tool: Setting HTML content directly");
          await page.setContent(htmlContent, { timeout: 10000 });
        } else if (targetUrl) {
          console.log(
            `ElementLocator Tool: Navigating to URL: ${targetUrl.substring(
              0,
              100
            )}...`
          );

          // Parse data URL for setContent
          if (targetUrl.startsWith("data:text/html,")) {
            const encodedHtml = targetUrl.substring("data:text/html,".length);
            const decodedHtml = decodeURIComponent(encodedHtml);
            console.log(
              "ElementLocator Tool: Using setContent with decoded data URL"
            );
            await page.setContent(decodedHtml, { timeout: 10000 });
          } else if (targetUrl.startsWith("data:")) {
            console.log(`ElementLocator Tool: Using goto with data URL`);
            await page.goto(targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: 10000,
            });
          } else {
            console.log("ElementLocator Tool: Using goto with regular URL");
            await page.goto(targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: 10000,
            });
          }
        } else {
          console.log("ElementLocator Tool: Staying on about:blank");
        }

        console.log(`ElementLocator Tool: Current page URL: ${page.url()}`);

        // Attempt to locate the element using enhanced locator with fallback strategies
        const element = await locatorInstance.locate(page, {
          selector: typedArgs.selector,
          type: typedArgs.type,
          timeout: typedArgs.timeout ?? 10000,
          retryCount: typedArgs.retryCount ?? 3,
          visibilityCheck: typedArgs.visible ?? false,
        });

        if (element) {
          await element.dispose();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  selector: typedArgs.selector,
                  type: typedArgs.type || "auto-fallback",
                  message: `Element located successfully using enhanced locator with fallback strategies`,
                }),
              } as any,
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  selector: typedArgs.selector,
                  type: typedArgs.type || "auto-fallback",
                  message: `Element not found using any strategy after retries`,
                }),
              } as any,
            ],
          };
        }
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
      `Internal error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Global instances for locator (following singleton pattern for resource management)
let locator: ElementLocator | null = null;

/**
 * Initialize locator instance
 */
export function getLocator(): ElementLocator {
  if (!locator) {
    locator = new ElementLocator();
  }
  return locator;
}

/**
 * Cleanup tool-specific resources
 */
export async function cleanupToolResources(): Promise<void> {
  if (locator) {
    locator = null;
  }
  await cleanupBrowser();
}
