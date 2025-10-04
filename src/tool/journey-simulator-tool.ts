import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs-extra";
import * as path from "path";
import { chromium } from "playwright";
import { z } from "zod";
import { JourneySimulator } from "../core/journey-simulator.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";
import { getBrowserLaunchOptions } from "../utils/browser.js";

// Implementation of the Journey Simulator Tool following the MCP Tool interface
class JourneySimulatorTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "journey_simulator",
      title: "Journey Simulator Tool",
      description:
        "Comprehensive user journey simulation with multi-step execution, recording, validation, and optimization",
      inputSchema: {
        action: z
          .enum([
            "run_user_journey",
            "validate_journey_definition",
            "optimize_journey_definition",
          ])
          .describe("Journey simulator action"),
        steps: z.string().optional().describe("JSON string of journey steps"),
        name: z.string().optional().describe("Journey name"),
        url: z.string().optional().describe("URL to navigate to"),
        html: z.string().optional().describe("HTML content to set"),
        video: z
          .boolean()
          .optional()
          .describe("Enable video recording during journey execution"),
      },
      handler: journeySimulatorHandlerFunction,
    };
  }
}

// Export the tool instance for registry access
export const journeySimulatorTool = new JourneySimulatorTool();

/**
 * Handler function for journey simulator tools - thin MCP wrapper
 */
async function journeySimulatorHandlerFunction(
  args: Record<string, any>,
  extra: any
) {
  try {
    const typedArgs = args as {
      action:
        | "run_user_journey"
        | "validate_journey_definition"
        | "optimize_journey_definition";
      name?: string;
      steps?: string; // JSON string
      url?: string;
      html?: string;
      video?: boolean;
    };

    // Create a dedicated browser instance for this tool call to ensure isolation
    const browserInstance = await chromium.launch(getBrowserLaunchOptions());

    try {
      // Create browser context with video recording if enabled
      const contextOptions: any = {};

      // Set up video recording if requested
      if (typedArgs.video) {
        // Set up video recording directory
        const recordingsDir = path.join(process.cwd(), "test", "recordings");
        await fs.ensureDir(recordingsDir);

        contextOptions.recordVideo = {
          dir: recordingsDir,
          size: { width: 1280, height: 720 },
        };
        console.log("🎥 Video recording enabled for journey execution");
      }

      // Create a new context and page
      const context = await browserInstance.newContext(contextOptions);
      const page = await context.newPage();

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

        // Initialize the journey simulator instance
        const journeySimulator = new JourneySimulator(page);

        // Execute the requested journey simulator action via core methods
        let result: any;

        switch (typedArgs.action) {
          case "run_user_journey":
            if (!typedArgs.name || !typedArgs.steps) {
              await page.close();
              await context.close();
              await browserInstance.close();

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "run_user_journey",
                      success: false,
                      error:
                        "name and steps parameters are required for run_user_journey",
                    }),
                  } as any,
                ],
              };
            }
            const isHeadless = process.env.HEADLESS === "true";
            const videoEnabled = isHeadless ? false : typedArgs.video || false;
            result = await journeySimulator.runUserJourney(
              typedArgs.name,
              typedArgs.steps,
              videoEnabled
            );
            result.action = "run_user_journey";
            break;

          case "validate_journey_definition":
            if (!typedArgs.steps) {
              await page.close();
              await context.close();
              await browserInstance.close();

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "validate_journey_definition",
                      success: false,
                      error:
                        "steps parameter is required for validate_journey_definition",
                    }),
                  } as any,
                ],
              };
            }

            result = await journeySimulator.validateJourneyDefinition(
              typedArgs.steps
            );
            result.action = "validate_journey_definition";
            result.success = result.isValid;
            result.summary = result.isValid
              ? `Journey definition is valid with ${result.stepCount} steps`
              : `Journey definition has ${result.errors.length} errors`;
            break;

          case "optimize_journey_definition":
            if (!typedArgs.steps) {
              await page.close();
              await context.close();
              await browserInstance.close();

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "optimize_journey_definition",
                      success: false,
                      error:
                        "steps parameter is required for optimize_journey_definition",
                    }),
                  } as any,
                ],
              };
            }

            result = await journeySimulator.optimizeJourneyDefinition(
              typedArgs.steps
            );
            result.action = "optimize_journey_definition";
            result.success = true;
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
        if (context) await context.close();
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
      `Journey simulator error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
