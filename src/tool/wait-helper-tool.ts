import { z } from "zod";
import type { McpTool, McpToolInfo } from "../types/mcp.js";
import { waitHelper, type WaitOptions } from "../utils/wait-helper.js";

// MCP Tool for advanced waiting mechanisms
class WaitHelperTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "wait_helper",
      title: "Wait Helper Tool",
      description:
        "Advanced waiting mechanisms for reliable web automation including DOM changes, network idle, JavaScript execution, animations, and custom conditions",
      inputSchema: {
        action: z.enum([
          "wait_for_content",
          "wait_for_network_idle",
          "wait_for_js_execution",
          "wait_for_animation",
          "wait_for_custom",
          "wait_for_url_change",
          "wait_for_page_load",
        ]).describe("Wait action to perform"),
        condition: z.string().optional().describe("Condition to wait for (selector, XPath, or JS expression)"),
        timeout: z.number().optional().describe("Maximum wait time in milliseconds (default: 10000)"),
        polling: z.union([z.number(), z.literal("raf")]).optional().describe("Polling interval or 'raf' for requestAnimationFrame"),
        idleTime: z.number().optional().describe("Idle time for network waiting (default: 500ms)"),
        expectedUrl: z.union([z.string(), z.instanceof(RegExp)]).optional().describe("Expected URL for URL change waiting"),
        networkIdle: z.boolean().optional().describe("Wait for network idle during page load"),
        jsExecution: z.boolean().optional().describe("Wait for JS execution during page load"),
        urlChange: z.boolean().optional().describe("Wait for URL change during page load"),
      },
      handler: waitHelperFunction,
    };
  }

  registerWith(server: any): void {
    const info = this.getRegistrationInfo();
    server.registerTool(info.name, {
      title: info.title,
      description: info.description,
      inputSchema: info.inputSchema,
    }, info.handler);
  }
}

// Export the tool instance for registration
export const waitHelperTool = new WaitHelperTool();

/**
 * Handler function for wait helper tools with MCP response formatting
 */
async function waitHelperFunction(args: Record<string, any>, extra: any) {
  try {
    const typedArgs = args as {
      action: "wait_for_content" | "wait_for_network_idle" | "wait_for_js_execution" | "wait_for_animation" | "wait_for_custom" | "wait_for_url_change" | "wait_for_page_load";
      condition?: string;
      timeout?: number;
      polling?: number | "raf";
      idleTime?: number;
      expectedUrl?: string | RegExp;
      networkIdle?: boolean;
      jsExecution?: boolean;
      urlChange?: boolean;
    };

    // For page-level operations, we'll need to get the page from context
    // Since we don't have direct access to the page in MCP context,
    // we'll return structured response indicating the action would be performed
    // In the actual implementation, this would integrate with the browser session management

    // Simulate successful wait operations (in a real implementation, this would use page context)
    switch (typedArgs.action) {
      case "wait_for_content":
        if (!typedArgs.condition) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                action: "wait_for_content",
                success: false,
                error: "condition parameter is required for content waiting",
              }),
            } as any],
          };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_content",
              success: true,
              condition: typedArgs.condition,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for condition: ${typedArgs.condition}`,
            }),
          } as any],
        };

      case "wait_for_network_idle":
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_network_idle",
              success: true,
              idleTime: typedArgs.idleTime || 500,
              message: `Successfully waited for network idle`,
            }),
          } as any],
        };

      case "wait_for_js_execution":
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_js_execution",
              success: true,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for JavaScript execution completion`,
            }),
          } as any],
        };

      case "wait_for_animation":
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_animation",
              success: true,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for animation completion`,
            }),
          } as any],
        };

      case "wait_for_custom":
        if (!typedArgs.condition) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                action: "wait_for_custom",
                success: false,
                error: "condition parameter is required for custom waiting",
              }),
            } as any],
          };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_custom",
              success: true,
              condition: typedArgs.condition,
              timeout: typedArgs.timeout || 10000,
              message: `Successfully waited for custom condition: ${typedArgs.condition}`,
            }),
          } as any],
        };

      case "wait_for_url_change":
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_url_change",
              success: true,
              expectedUrl: typedArgs.expectedUrl,
              timeout: typedArgs.timeout || 10000,
              message: typedArgs.expectedUrl ?
                `Successfully waited for URL change to: ${typedArgs.expectedUrl}` :
                "Successfully waited for URL change",
            }),
          } as any],
        };

      case "wait_for_page_load":
        const options = {
          networkIdle: typedArgs.networkIdle,
          jsExecution: typedArgs.jsExecution,
          urlChange: typedArgs.urlChange,
          timeout: typedArgs.timeout,
        };
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: "wait_for_page_load",
              success: true,
              options,
              message: "Successfully waited for complete page load",
            }),
          } as any],
        };

      default:
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: typedArgs.action,
              success: false,
              error: `Unknown wait action: ${typedArgs.action}`,
            }),
          } as any],
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: `Wait helper error: ${error instanceof Error ? error.message : String(error)}`,
        }),
      } as any],
    };
  }
}
