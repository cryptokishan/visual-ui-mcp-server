import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import type { McpToolInfo, McpTool } from "../types/mcp.js";
import { VisualTesting } from "../core/visual-testing.js";

// Implementation of the Visual Testing Tool following the MCP Tool interface
class VisualTestingTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "visual_testing",
      title: "Visual Testing Tool",
      description:
        "Comprehensive visual testing capabilities including selective screenshots, diffing, and responsive testing",
      inputSchema: {
        action: z
          .enum([
            "capture_selective",
            "compare_screenshots",
            "test_responsive",
          ])
          .describe(
            "Visual testing action to perform: capture_selective, compare_screenshots, or test_responsive"
          ),
        type: z
          .enum(["element", "region", "full"])
          .optional()
          .describe(
            "Screenshot type for capture_selective: element (by selector), region (by coordinates), or full page"
          ),
        selector: z
          .string()
          .optional()
          .describe("CSS selector for element screenshot (used with type=element)"),
        clip: z
          .object({
            x: z.number().describe("X coordinate for region start"),
            y: z.number().describe("Y coordinate for region start"),
            width: z.number().describe("Region width"),
            height: z.number().describe("Region height"),
          })
          .optional()
          .describe("Region coordinates for region screenshot (used with type=region)"),
        format: z
          .enum(["png", "jpeg", "webp"])
          .optional()
          .describe("Screenshot format (default: png)"),
        quality: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Image quality for jpeg/webp formats (0-100)"),
        responsive: z
          .enum(["mobile", "tablet", "desktop"])
          .optional()
          .describe("Responsive breakpoint for testing"),
        breakpoints: z
          .array(z.string())
          .optional()
          .describe("Breakpoints for responsive testing (default: ['mobile', 'tablet', 'desktop'])"),
        screenshot1: z
          .string()
          .optional()
          .describe("Base64-encoded screenshot buffer for comparison"),
        screenshot2: z
          .string()
          .optional()
          .describe("Base64-encoded screenshot buffer for comparison"),
        url: z
          .string()
          .optional()
          .describe("URL to load before performing visual testing action (optional)"),
        html: z
          .string()
          .optional()
          .describe("HTML content to set for testing (optional)"),
      },
      handler: visualTestingHandlerFunction,
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
export const visualTestingTool = new VisualTestingTool();

/**
 * Handler function for visual testing tools following MCP SDK registerTool signature
 */
async function visualTestingHandlerFunction(args: Record<string, any>, extra: any) {
  try {
    const typedArgs = args as {
      action: "capture_selective" | "compare_screenshots" | "test_responsive";
      type?: "element" | "region" | "full";
      selector?: string;
      clip?: { x: number; y: number; width: number; height: number };
      format?: "png" | "jpeg" | "webp";
      quality?: number;
      responsive?: "mobile" | "tablet" | "desktop";
      breakpoints?: string[];
      screenshot1?: string;
      screenshot2?: string;
      url?: string;
      html?: string;
    };

    // Create a dedicated browser instance for this tool call to ensure isolation
    const browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    try {
      // Create a new page for this request
      const page = await browserInstance.newPage();

      try {
        // Initialize the visual testing instance
        const visualTester = new VisualTesting(page);

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

        // Execute the requested visual testing action
        let result: any;

        switch (typedArgs.action) {
          case "capture_selective":
            // Validate required parameters based on type
            if (typedArgs.type === "element" && !typedArgs.selector) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "capture_selective",
                      success: false,
                      error: "selector parameter is required for element type screenshots",
                      type: typedArgs.type,
                    }),
                  } as any,
                ],
              };
            }

            if (typedArgs.type === "region" && !typedArgs.clip) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "capture_selective",
                      success: false,
                      error: "clip parameter is required for region type screenshots",
                      type: typedArgs.type,
                    }),
                  } as any,
                ],
              };
            }

            const options = {
              type: typedArgs.type || "full",
              selector: typedArgs.selector,
              clip: typedArgs.clip,
              format: typedArgs.format,
              quality: typedArgs.quality,
              responsive: typedArgs.responsive,
            };

            try {
              const screenshotBuffer = await visualTester.captureSelective(options);
              const base64Screenshot = screenshotBuffer.toString("base64");

              result = {
                action: "capture_selective",
                success: true,
                type: options.type,
                format: options.format || "png",
                size: screenshotBuffer.length,
                base64: base64Screenshot,
                responsive: options.responsive,
              };
            } catch (error) {
              result = {
                action: "capture_selective",
                success: false,
                error: error instanceof Error ? error.message : String(error),
                type: typedArgs.type,
              };
            }
            break;

          case "compare_screenshots":
            if (!typedArgs.screenshot1 || !typedArgs.screenshot2) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "compare_screenshots",
                      success: false,
                      error: "Both screenshot1 and screenshot2 base64 strings are required for comparison",
                    }),
                  } as any,
                ],
              };
            }

            try {
              const buffer1 = Buffer.from(typedArgs.screenshot1, "base64");
              const buffer2 = Buffer.from(typedArgs.screenshot2, "base64");

              const diffResult = await visualTester.compareScreenshots(buffer1, buffer2);

              result = {
                action: "compare_screenshots",
                success: true,
                isDifferent: diffResult.isDifferent,
                score: diffResult.score,
                pixelDifferenceCount: diffResult.pixelDifferenceCount,
                totalPixels: diffResult.totalPixels,
                changesBoundingBoxes: diffResult.changesBoundingBoxes,
                hasDiffImage: diffResult.diffImage.length > 0,
                diffImageBase64: diffResult.diffImage.length > 0 ?
                  diffResult.diffImage.toString("base64") : null,
              };
            } catch (error) {
              result = {
                action: "compare_screenshots",
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
            break;

          case "test_responsive":
            const breakpoints = typedArgs.breakpoints || ["mobile", "tablet", "desktop"];

            try {
              const responsiveResults = await visualTester.testResponsive(breakpoints);

              const responsiveScreenshots: Record<string, string> = {};
              for (const [breakpoint, buffer] of Object.entries(responsiveResults)) {
                responsiveScreenshots[breakpoint] = (buffer as Buffer).toString("base64");
              }

              result = {
                action: "test_responsive",
                success: true,
                breakpoints,
                screenshots: responsiveScreenshots,
              };
            } catch (error) {
              result = {
                action: "test_responsive",
                success: false,
                error: error instanceof Error ? error.message : String(error),
                breakpoints,
              };
            }
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
      `Visual testing error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
