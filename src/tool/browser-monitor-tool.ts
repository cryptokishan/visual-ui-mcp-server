/**
 * MCP Tool wrapper for Browser Monitor functionality
 * Provides tools for console, network, error monitoring and performance metrics
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import { getBrowserLaunchOptions } from "../utils/browser.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";
import { BrowserMonitor } from "../core/browser-monitor.js";
import { MonitoringOptions } from "../types/browser-monitor.js";

// Keep track of active monitors per browser page
const activeMonitors = new Map<string, BrowserMonitor>();

export class BrowserMonitorTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "browser_monitor",
      title: "Browser Monitor Tool",
      description:
        "Comprehensive browser monitoring for console logs, network requests, JavaScript errors, and performance metrics",
      inputSchema: {
        action: z.enum([
          "start_monitoring",
          "stop_monitoring",
          "get_console_logs",
          "get_network_requests",
          "get_javascript_errors",
          "capture_performance_metrics",
          "get_page_html",
        ]).describe("Monitoring action to perform"),
        url: z.string().optional().describe("URL to load before performing monitoring action (optional)"),
        html: z.string().optional().describe("HTML content to set for testing monitoring (optional)"),
        includeConsole: z.boolean().optional().describe("Whether to monitor console logs (default: true)"),
        includeNetwork: z.boolean().optional().describe("Whether to monitor network requests (default: true)"),
        includeErrors: z.boolean().optional().describe("Whether to monitor JavaScript errors (default: true)"),
        includePerformance: z.boolean().optional().describe("Whether to monitor performance metrics (default: true)"),
        consoleFilter: z.object({
          types: z.array(z.enum(["log", "info", "warn", "error", "debug"])).optional(),
          textPattern: z.string().optional(),
        }).optional(),
        networkFilter: z.object({
          urlPattern: z.string().optional(),
          methods: z.array(z.string()).optional(),
          statuses: z.array(z.number()).optional(),
        }).optional(),
        maxEntries: z.number().optional().describe("Maximum number of entries to keep per category (default: 1000)"),
        type: z.string().optional().describe("Filter by console message type for get_console_logs"),
        textPattern: z.string().optional().describe("Filter by text pattern for get_console_logs"),
        method: z.string().optional().describe("Filter by HTTP method for get_network_requests"),
        status: z.number().optional().describe("Filter by HTTP status for get_network_requests"),
        urlPattern: z.string().optional().describe("Filter by URL pattern for get_network_requests"),
      },
      handler: browserMonitorFunction,
    };
  }

  // ❌ registerWith removed - registration now handled by tool-registry.ts
}

// Export the tool instance for registration
export const browserMonitorTool = new BrowserMonitorTool();


/**
 * Handler function for browser monitor tools
 */
async function browserMonitorFunction(args: Record<string, any>, extra: any) {
  try {
    const typedArgs = args as {
      action: "start_monitoring" | "stop_monitoring" | "get_console_logs" | "get_network_requests" | "get_javascript_errors" | "capture_performance_metrics" | "get_page_html";
      url?: string;
      html?: string;
      includeConsole?: boolean;
      includeNetwork?: boolean;
      includeErrors?: boolean;
      includePerformance?: boolean;
      consoleFilter?: {
        types?: ("log" | "info" | "warn" | "error" | "debug")[];
        textPattern?: string;
      };
      networkFilter?: {
        urlPattern?: string;
        methods?: string[];
        statuses?: number[];
      };
      maxEntries?: number;
      type?: string;
      textPattern?: string;
      method?: string;
      status?: number;
      urlPattern?: string;
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

        // Execute the requested monitoring action
        const action = typedArgs.action;
        switch (action) {
          case "start_monitoring":
          case "get_console_logs":
          case "get_network_requests":
          case "get_javascript_errors":
          case "capture_performance_metrics":
          case "get_page_html": {
            // Ensure monitoring is enabled for the requested action type
            const includeConsole = typedArgs.includeConsole !== false || typedArgs.action === "get_console_logs";
            const includeNetwork = typedArgs.includeNetwork !== false || typedArgs.action === "get_network_requests";
            const includeErrors = typedArgs.includeErrors !== false || typedArgs.action === "get_javascript_errors";
            const includePerformance = typedArgs.includePerformance !== false || typedArgs.action === "capture_performance_metrics";

            const options: MonitoringOptions = {
              includeConsole: includeConsole,
              includeNetwork: includeNetwork,
              includeErrors: includeErrors,
              includePerformance: includePerformance,
              consoleFilter: typedArgs.consoleFilter,
              networkFilter: typedArgs.networkFilter,
              maxEntries: typedArgs.maxEntries || 1000,
            };

            // Create monitor and immediately start monitoring
            const monitor = new BrowserMonitor(page, options);
            monitor.startMonitoring();

            // Wait for initial page load and monitoring setup
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

            // For start_monitoring, return summary immediately
            if (typedArgs.action === "start_monitoring") {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    action: "start_monitoring",
                    success: true,
                    message: "Browser monitoring started and data collected",
                    summary: monitor.getSummary(),
                    note: "Data is captured in real-time throughout the session. Use individual get_* actions to retrieve specific data types.",
                  }),
                } as any],
              };
            }

            // For get_* actions, capture data and return immediately
            // Add a small delay to capture initial page activity
            await new Promise(resolve => setTimeout(resolve, 1000));

            switch (typedArgs.action) {
              case "get_console_logs": {
                const filter = {
                  type: typedArgs.type,
                  textPattern: typedArgs.textPattern,
                };
                const logs = monitor.getFilteredConsoleLogs(filter);

                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      action: "get_console_logs",
                      success: true,
                      consoleLogs: logs || [],
                      summary: {
                        type: typedArgs.type || "all",
                        textPattern: typedArgs.textPattern || null,
                        count: (logs || []).length,
                      },
                    }),
                  } as any],
                };
              }

              case "get_network_requests": {
                const filter = {
                  method: typedArgs.method,
                  status: typedArgs.status,
                  urlPattern: typedArgs.urlPattern,
                };
                const requests = monitor.getFilteredNetworkRequests(filter);

                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      action: "get_network_requests",
                      success: true,
                      networkRequests: requests,
                      summary: {
                        method: typedArgs.method || "all",
                        status: typedArgs.status || "all",
                        urlPattern: typedArgs.urlPattern || null,
                        count: requests.length,
                      },
                    }),
                  } as any],
                };
              }

              case "get_javascript_errors": {
                const errors = monitor.getErrors();

                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      action: "get_javascript_errors",
                      success: true,
                      javascriptErrors: errors,
                      summary: { count: errors.length },
                    }),
                  } as any],
                };
              }

              case "capture_performance_metrics": {
                const metrics = monitor.getPerformanceMetrics();

                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      action: "capture_performance_metrics",
                      success: true,
                      performanceMetrics: metrics,
                      summary: { count: metrics.length },
                    }),
                  } as any],
                };
              }

              case "get_page_html": {
                const htmlContent = await page.content(); // Get the current page HTML

                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      action: "get_page_html",
                      success: true,
                      url: page.url(),
                      htmlLength: htmlContent.length,
                      htmlSnippet: htmlContent.substring(0, 2000), // First 2000 chars for preview
                      truncated: htmlContent.length > 2000,
                      full: htmlContent.length <= 2000 ? htmlContent : "HTML is long, showing first 2000 characters - full HTML available in htmlSnippet"
                    }),
                  } as any],
                };
              }
            }
          }

          case "stop_monitoring": {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  action: "stop_monitoring",
                  success: true,
                  message: "Monitoring is now per-request based. No persistent sessions need to be stopped.",
                }),
              } as any],
            };
          }

          default:
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  action: typedArgs.action,
                  success: false,
                  error: `Unknown action: ${typedArgs.action}`,
                }),
              } as any],
            };
        }
      } finally {
        // Always close the page to free resources
        await page.close();
      }
    } finally {
      // Always close the browser instance
      if (browserInstance) {
        await browserInstance.close();
      }
    }
  } catch (error) {
    // Handle errors following MCP SDK patterns
    if (error instanceof McpError) {
      throw error;
    }

    // Wrap unexpected errors in MCP error format
    throw new McpError(
      ErrorCode.InternalError,
      `Browser monitor error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export default BrowserMonitorTool;
