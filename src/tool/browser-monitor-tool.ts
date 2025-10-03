/**
 * MCP Tool wrapper for Browser Monitor functionality
 * Provides tools for console, network, error monitoring and performance metrics
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
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
export const browserMonitorTool = new BrowserMonitorTool();


/**
 * Handler function for browser monitor tools
 */
async function browserMonitorFunction(args: Record<string, any>, extra: any) {
  try {
    const typedArgs = args as {
      action: "start_monitoring" | "stop_monitoring" | "get_console_logs" | "get_network_requests" | "get_javascript_errors" | "capture_performance_metrics";
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
          case "start_monitoring": {
            const options: MonitoringOptions = {
              includeConsole: typedArgs.includeConsole !== false,
              includeNetwork: typedArgs.includeNetwork !== false,
              includeErrors: typedArgs.includeErrors !== false,
              includePerformance: typedArgs.includePerformance !== false,
              consoleFilter: typedArgs.consoleFilter,
              networkFilter: typedArgs.networkFilter,
              maxEntries: typedArgs.maxEntries || 1000,
            };

            const monitor = new BrowserMonitor(page, options);
            monitor.startMonitoring();

            // Store in global map for this browser instance
            const browserKey = `browser_${browserInstance.version()}_${page.url()}`;
            activeMonitors.set(browserKey, monitor);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  action: "start_monitoring",
                  success: true,
                  message: "Browser monitoring started successfully",
                  summary: monitor.getSummary(),
                }),
              } as any],
            };
          }

          case "stop_monitoring": {
            // For simplicity, get first active monitor from this browser instance
            const browserKey = `browser_${browserInstance.version()}_${page.url()}`;
            let monitor = activeMonitors.get(browserKey);

            if (!monitor) {
              // Try to find any active monitor
              for (const [key, mon] of activeMonitors.entries()) {
                if (mon.isMonitoringActive()) {
                  monitor = mon;
                  break;
                }
              }
            }

            if (!monitor) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    action: "stop_monitoring",
                    success: false,
                    error: "No active monitoring session found",
                  }),
                } as any],
              };
            }

            const results = monitor.stopMonitoring();
            activeMonitors.delete(browserKey);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  action: "stop_monitoring",
                  success: true,
                  message: "Browser monitoring stopped successfully",
                  results,
                }),
              } as any],
            };
          }

          case "get_console_logs": {
            const browserKey = `browser_${browserInstance.version()}_${page.url()}`;
            let monitor = activeMonitors.get(browserKey);

            if (!monitor) {
              for (const [key, mon] of activeMonitors.entries()) {
                if (mon.isMonitoringActive()) {
                  monitor = mon;
                  break;
                }
              }
            }

            if (!monitor) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    action: "get_console_logs",
                    success: false,
                    error: "No active monitoring session found",
                  }),
                } as any],
              };
            }

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
                  consoleLogs: logs,
                  summary: {
                    type: typedArgs.type || "all",
                    textPattern: typedArgs.textPattern || null,
                    count: logs.length,
                  },
                }),
              } as any],
            };
          }

          case "get_network_requests": {
            const browserKey = `browser_${browserInstance.version()}_${page.url()}`;
            let monitor = activeMonitors.get(browserKey);

            if (!monitor) {
              for (const [key, mon] of activeMonitors.entries()) {
                if (mon.isMonitoringActive()) {
                  monitor = mon;
                  break;
                }
              }
            }

            if (!monitor) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    action: "get_network_requests",
                    success: false,
                    error: "No active monitoring session found",
                  }),
                } as any],
              };
            }

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
            const browserKey = `browser_${browserInstance.version()}_${page.url()}`;
            let monitor = activeMonitors.get(browserKey);

            if (!monitor) {
              for (const [key, mon] of activeMonitors.entries()) {
                if (mon.isMonitoringActive()) {
                  monitor = mon;
                  break;
                }
              }
            }

            if (!monitor) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    action: "get_javascript_errors",
                    success: false,
                    error: "No active monitoring session found",
                  }),
                } as any],
              };
            }

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
            const browserKey = `browser_${browserInstance.version()}_${page.url()}`;
            let monitor = activeMonitors.get(browserKey);

            if (!monitor) {
              for (const [key, mon] of activeMonitors.entries()) {
                if (mon.isMonitoringActive()) {
                  monitor = mon;
                  break;
                }
              }
            }

            if (!monitor) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    action: "capture_performance_metrics",
                    success: false,
                    error: "No active monitoring session found",
                  }),
                } as any],
              };
            }

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
