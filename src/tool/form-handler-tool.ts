import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import { FormUtils } from "../core/form-handler.js";
import { createToolCoordinator } from "../core/tool-coordinator.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";
import { getBrowserLaunchOptions } from "../utils/browser.js";

// Implementation of the Form Handler Tool following the MCP Tool interface
class FormHandlerTool implements McpTool {
  getRegistrationInfo(): McpToolInfo {
    return {
      name: "form_handler",
      title: "Form Handler Tool",
      description:
        "Comprehensive form handling for web automation including field population, submission, validation, and file uploads",
      inputSchema: {
        action: z
          .enum([
            "fill_form",
            "detect_fields",
            "submit_form",
            "get_validation_errors",
            "reset_form",
            "upload_file",
          ])
          .describe(
            "Form action to perform: fill_form, detect_fields, submit_form, get_validation_errors, reset_form, or upload_file"
          ),
        formSelector: z
          .string()
          .optional()
          .describe("CSS selector for the form element (default: 'form')"),
        data: z
          .record(z.any())
          .optional()
          .describe(
            "Data object for fill_form action containing field names and values. Uses keystroke-by-keystroke typing simulation for real user interaction on text inputs, passwords, and textareas (50ms delay between keystrokes). Use placeholder text or field identifiers as keys for React forms."
          ),
        submitButton: z
          .string()
          .optional()
          .describe(
            "CSS selector for submit button (used by submit_form action)"
          ),
        fileSelector: z
          .string()
          .optional()
          .describe("CSS selector for file input (used by upload_file action)"),
        filePath: z
          .string()
          .optional()
          .describe("File path for upload (used by upload_file action)"),
        url: z
          .string()
          .optional()
          .describe("URL to load before performing form action (optional)"),
        html: z
          .string()
          .optional()
          .describe("HTML content to set for testing (optional)"),
      },
      handler: formHandlerFunction,
    };
  }

  // ❌ registerWith removed - registration now handled by tool-registry.ts
}

// Export the tool instance for registration
export const formHandlerTool = new FormHandlerTool();

/**
 * Handler function for form handler tools following MCP SDK registerTool signature
 */
async function formHandlerFunction(args: Record<string, any>, extra: any) {
  const typedArgs = args as {
    action:
      | "fill_form"
      | "detect_fields"
      | "submit_form"
      | "get_validation_errors"
      | "reset_form"
      | "upload_file";
    formSelector?: string;
    data?: Record<string, any>;
    submitButton?: string;
    fileSelector?: string;
    filePath?: string;
    url?: string;
    html?: string;
  };

  try {
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

        // Create coordinated tool instances with PageStateManager
        const coordinator = createToolCoordinator(page);
        const formOps = coordinator.createFormOperations();

        // Execute the requested form action using core FormUtils and coordinated FormOperations
        const formSelector = typedArgs.formSelector || "#test-form";

        let result: any;

        switch (typedArgs.action) {
          case "fill_form":
            // Validate required parameters before proceeding
            if (!typedArgs.data || Object.keys(typedArgs.data).length === 0) {
              coordinator.cleanup();
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "fill_form",
                      success: false,
                      formSelector,
                      error:
                        "data parameter is required for fill_form action and must contain field data",
                      missingFields: ["data"],
                    }),
                  } as any,
                ],
              };
            }

            // Use coordinated FormOperations with PageStateManager for validation and filling
            const validation = await formOps.validateRequiredFields(
              formSelector,
              typedArgs.data
            );
            if (!validation.valid) {
              coordinator.cleanup();
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "fill_form",
                      success: false,
                      formSelector,
                      error: validation.missingFields?.length
                        ? `Missing required fields: ${validation.missingFields.join(
                            ", "
                          )}`
                        : "Form not found or validation failed",
                      missingFields: validation.missingFields || [],
                      requiredFields: validation.requiredFields || [],
                    }),
                  } as any,
                ],
              };
            }

            // Fill form with typing simulation
            await formOps.waitForForm(formSelector);
            const fillResult = await formOps.fillFormWithTyping(
              formSelector,
              typedArgs.data
            );

            result = {
              action: "fill_form",
              success: fillResult.errors.length === 0,
              formSelector,
              filledFields: fillResult.filledFields,
              errors: fillResult.errors,
            };
            coordinator.cleanup();
            break;

          case "detect_fields":
            const fields = (await page.evaluate(
              `(${FormUtils.detectFields.toString()})(${JSON.stringify(
                formSelector
              )})`
            )) as import("../core/form-handler.js").FormField[];
            result = {
              action: "detect_fields",
              success: true,
              formSelector,
              fields,
            };
            break;

          case "submit_form":
            const submitResult = (await page.evaluate(
              `(${FormUtils.submitForm.toString()})(${JSON.stringify(
                formSelector
              )})`
            )) as { success: boolean; error?: string };
            result = {
              action: "submit_form",
              success: submitResult.success,
              formSelector,
              error: submitResult.error,
            };
            // Wait for submission to stabilize using coordinated FormOperations
            await formOps.waitForSubmission();
            break;

          case "get_validation_errors":
            const errors = (await page.evaluate(
              `(${FormUtils.getValidationErrors.toString()})(${JSON.stringify(
                formSelector
              )})`
            )) as string[];
            result = {
              action: "get_validation_errors",
              success: true,
              formSelector,
              errors,
              valid: errors.length === 0,
            };
            break;

          case "reset_form":
            const resetResult = (await page.evaluate(
              `(${FormUtils.resetForm.toString()})(${JSON.stringify(
                formSelector
              )})`
            )) as { success: boolean; error?: string };
            result = {
              action: "reset_form",
              success: resetResult.success,
              formSelector,
              error: resetResult.error,
            };
            break;

          case "upload_file":
            if (!typedArgs.fileSelector || !typedArgs.filePath) {
              throw new Error(
                "fileSelector and filePath parameters required for upload_file action"
              );
            }
            // Use coordinated FormOperations with PageStateManager for file upload
            await formOps.uploadFile(
              typedArgs.fileSelector,
              typedArgs.filePath
            );
            result = {
              action: "upload_file",
              success: true,
              fileSelector: typedArgs.fileSelector,
              filePath: typedArgs.filePath,
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

    // Provide detailed error context for better debugging
    const errorDetails = {
      action: typedArgs?.action || "unknown",
      formSelector: typedArgs?.formSelector || "default",
      url: typedArgs?.url || "none",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      additionalContext: {
        data: typedArgs?.data ? Object.keys(typedArgs.data) : [],
        availableActions: [
          "fill_form",
          "detect_fields",
          "submit_form",
          "get_validation_errors",
          "reset_form",
          "upload_file",
        ],
        commonIssues: {
          fill_form: [
            "Use placeholder text as field keys for React forms (e.g. 'Enter your username')",
            "Ensure form selector targets the correct form element",
            "Check that fields exist and are visible on the page",
          ],
          submit_form: [
            "Form selector must target a <form> element",
            "Ensure submit button exists within the form",
            "Check for JavaScript form validation preventing submission",
          ],
        },
      },
    };

    // Wrap unexpected errors in MCP error format with detailed context
    throw new McpError(
      ErrorCode.InternalError,
      `Form handler error: ${JSON.stringify(errorDetails, null, 2)}`
    );
  }
}
