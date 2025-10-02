import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import { ElementLocator } from "../core/element-locator.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";
import { cleanupBrowser } from "../utils/browser.js";

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
          .string()
          .optional()
          .describe(
            "Selector type supported by playwright: css, xpath, aria, data (optional)"
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

  registerWith(server: any): void {
    const info = this.getRegistrationInfo();
    server.registerTool(
      info.name,
      {
        title: info.title,
        description: info.description,
        inputSchema: info.inputSchema,
      },
      info.handler
    );
  }
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
      selector: string;
      timeout?: number;
      visible?: boolean;
      url?: string;
    };

    // Create a dedicated browser instance for this tool call to ensure isolation
    const browserInstance = await chromium.launch({
      headless: false, // Run in headed mode for visibility
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    const locatorInstance = getLocator();

    try {
      // Create a new page for this request
      const page = await browserInstance.newPage();

      try {
        // Navigate to specified URL or default to about:blank with 10 second timeout
        const targetUrl = typedArgs.url || "about:blank";
        console.log(
          `ElementLocator Tool: Navigating to URL: ${targetUrl.substring(
            0,
            100
          )}...`
        );

        // Parse data URL for setContent
        if (targetUrl && targetUrl.startsWith("data:text/html,")) {
          const encodedHtml = targetUrl.substring("data:text/html,".length);
          const htmlContent = decodeURIComponent(encodedHtml);
          console.log(
            "ElementLocator Tool: Using setContent with decoded HTML"
          );
          await page.setContent(htmlContent, { timeout: 10000 });
        } else if (targetUrl && targetUrl.startsWith("data:")) {
          console.log(`ElementLocator Tool: Using goto with data URL`);
          await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });
        } else if (targetUrl && targetUrl !== "about:blank") {
          console.log("ElementLocator Tool: Using goto with regular URL");
          await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });
        } else {
          console.log("ElementLocator Tool: Staying on about:blank");
        }

        console.log(`ElementLocator Tool: Current page URL: ${page.url()}`);

        // Attempt to locate the element using Playwright's native locator
        const element = await locatorInstance.locateElement(page, {
          selector: typedArgs.selector,
          timeout: typedArgs.timeout ?? 10000,
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
                  message: `Element located successfully using Playwright selector`,
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
                  message: `Element not found using Playwright selector`,
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
