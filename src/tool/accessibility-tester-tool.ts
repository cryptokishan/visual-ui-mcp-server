/**
 * MCP Tool for Accessibility Testing
 * Provides comprehensive accessibility auditing, contrast checking, and keyboard navigation analysis
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import { getBrowserLaunchOptions } from "../utils/browser.js";
import { AccessibilityTester } from "../core/accessibility-tester.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";

export class AccessibilityTesterTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "accessibility_tester",
      title: "Accessibility Tester Tool",
      description:
        "Comprehensive accessibility testing with WCAG audits, color contrast analysis, and keyboard navigation testing",
      inputSchema: {
        action: z
          .enum([
            "run_accessibility_audit",
            "check_color_contrast",
            "test_keyboard_navigation",
            "generate_accessibility_report",
          ])
          .describe("Accessibility testing action to perform"),
        url: z
          .string()
          .optional()
          .describe(
            "URL to load before performing accessibility testing action (optional)"
          ),
        html: z
          .string()
          .optional()
          .describe("HTML content to set for testing (optional)"),
        standards: z
          .array(z.enum(["WCAG2A", "WCAG2AA", "Section508"]))
          .optional()
          .describe("Accessibility standards to test against"),
        includeBestPractices: z
          .boolean()
          .optional()
          .describe("Include best practice rules in the audit"),
        rules: z
          .array(z.string())
          .optional()
          .describe("Specific axe-core rules to run (overrides standards)"),
        excludeRules: z
          .array(z.string())
          .optional()
          .describe("Axe-core rules to exclude from the audit"),
        selector: z
          .string()
          .optional()
          .describe("CSS selector to limit analysis to specific elements"),
      },
      handler: accessibilityTesterFunction,
    };
  }

  // ❌ registerWith removed - registration now handled by tool-registry.ts
}

// Export the tool instance for registration
export const accessibilityTesterTool = new AccessibilityTesterTool();

/**
 * Handler function for accessibility testing tools
 */
async function accessibilityTesterFunction(
  args: Record<string, any>,
  extra: any
) {
  try {
    const typedArgs = args as {
      action:
        | "run_accessibility_audit"
        | "check_color_contrast"
        | "test_keyboard_navigation"
        | "generate_accessibility_report";
      url?: string;
      html?: string;
      standards?: ("WCAG2A" | "WCAG2AA" | "Section508")[];
      includeBestPractices?: boolean;
      rules?: string[];
      excludeRules?: string[];
      selector?: string;
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

        // Initialize accessibility tester
        const accessibilityTester = new AccessibilityTester(page);

        // Execute the requested accessibility testing action
        const action = typedArgs.action;

        switch (action) {
          case "run_accessibility_audit": {
            const options = {
              standards: typedArgs.standards || ["WCAG2AA"],
              includeBestPractices: typedArgs.includeBestPractices || false,
              rules: typedArgs.rules,
              excludeRules: typedArgs.excludeRules,
            };

            try {
              const result = await accessibilityTester.runAudit(options);

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "run_accessibility_audit",
                      success: true,
                      summary: result.summary,
                      violations: result.violations.slice(0, 10).map((v) => ({
                        ruleId: v.ruleId,
                        description: v.description,
                        impact: v.impact,
                        help: v.help,
                        nodes: v.nodes.length,
                      })),
                      url: result.url,
                      timestamp: result.timestamp,
                    }),
                  } as any,
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "run_accessibility_audit",
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    }),
                  } as any,
                ],
              };
            }
          }

          case "check_color_contrast": {
            try {
              const results = await accessibilityTester.checkColorContrast(
                typedArgs.selector
              );

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "check_color_contrast",
                      success: true,
                      totalElements: results.length,
                      passed: results.filter((r) => r.passes).length,
                      failed: results.filter((r) => !r.passes).length,
                      results: results.slice(0, 10).map((r) => ({
                        element: r.element,
                        foreground: r.foreground,
                        background: r.background,
                        ratio: r.ratio,
                        passes: r.passes,
                        required: r.isLargeText ? 3.0 : 4.5,
                      })),
                    }),
                  } as any,
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "check_color_contrast",
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    }),
                  } as any,
                ],
              };
            }
          }

          case "test_keyboard_navigation": {
            try {
              const result = await accessibilityTester.testKeyboardNavigation();

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "test_keyboard_navigation",
                      success: true,
                      summary: result.summary,
                      issues: result.issues,
                      focusableElements: result.focusableElements,
                      totalElements: result.totalElements,
                    }),
                  } as any,
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "test_keyboard_navigation",
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    }),
                  } as any,
                ],
              };
            }
          }

          case "generate_accessibility_report": {
            const options = {
              standards: typedArgs.standards || ["WCAG2AA"],
              includeBestPractices: typedArgs.includeBestPractices || false,
            };

            try {
              const report = await accessibilityTester.generateReport(options);

              // Run additional contrast check if selector provided
              let contrastResults = null;
              if (typedArgs.selector) {
                contrastResults = await accessibilityTester.checkColorContrast(
                  typedArgs.selector
                );
              }

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "generate_accessibility_report",
                      success: true,
                      report: {
                        overallScore: report.overallScore,
                        recommendations: report.recommendations,
                        auditSummary: report.pageAudit.summary,
                        contrastSummary: contrastResults
                          ? {
                              total: contrastResults.length,
                              passed: contrastResults.filter((r) => r.passes)
                                .length,
                              failed: contrastResults.filter((r) => !r.passes)
                                .length,
                            }
                          : null,
                        keyboardSummary: report.keyboardNavigation?.summary,
                        url: report.pageAudit.url,
                        timestamp: report.pageAudit.timestamp,
                      },
                    }),
                  } as any,
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "generate_accessibility_report",
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    }),
                  } as any,
                ],
              };
            }
          }

          default:
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    action: typedArgs.action,
                    success: false,
                    error: `Unknown action: ${typedArgs.action}`,
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
      `Accessibility testing error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
