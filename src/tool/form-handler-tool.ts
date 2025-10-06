import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";
import { getBrowserLaunchOptions } from "../utils/browser.js";
import type { McpTool, McpToolInfo } from "../types/mcp.js";

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

        // Execute the requested form action using page.evaluate
        const formSelector = typedArgs.formSelector || "#test-form";
        let result: any;
        let skipBrowser = false;

        switch (typedArgs.action) {
          case "fill_form":
            // Validate required parameters before proceeding
            if (!typedArgs.data || Object.keys(typedArgs.data).length === 0) {
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

            // Check for missing required fields based on form structure
            const validationResult = await page.evaluate(
              ({ selector, data }) => {
                const form = document.querySelector(
                  selector
                ) as HTMLFormElement;
                if (!form) return { valid: false, errors: ["Form not found"], missingFields: undefined, requiredFields: undefined };

                const requiredFields: string[] = [];
                const inputs = form.querySelectorAll("input, select, textarea");

                for (const input of inputs) {
                  const element = input as any;
                  const name = element.name || element.id || "";
                  if (name && element.outerHTML.includes('required')) {
                    requiredFields.push(name);
                  }
                }

                const providedFieldNames = Object.keys(data);
                const missingRequired = requiredFields.filter(
                  (field) => !providedFieldNames.includes(field)
                );

                return {
                  valid: missingRequired.length === 0,
                  missingFields: missingRequired,
                  requiredFields,
                  foundInputs: Array.from(inputs).map((el) => {
                    const elem = el as any;
                    return {
                      name: elem.name || elem.id,
                      required: elem.hasAttribute && elem.hasAttribute("required"),
                      outerHTML: elem.outerHTML ? elem.outerHTML.substring(0, 100) : '',
                    };
                  }),
                };
              },
              { selector: formSelector, data: typedArgs.data }
            );

            if (!validationResult.valid) {
              const errorMessage = validationResult.errors && validationResult.errors.length > 0
                ? validationResult.errors.join(", ")
                : `Missing required fields: ${validationResult.missingFields ? validationResult.missingFields.join(", ") : "unknown"}`;

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      action: "fill_form",
                      success: false,
                      formSelector,
                      error: errorMessage,
                      missingFields: validationResult.missingFields || [],
                      requiredFields: validationResult.requiredFields || [],
                    }),
                  } as any,
                ],
              };
            }

            // Implement typing simulation using Playwright's locator.type() for real user interaction
            const data = typedArgs.data;
            const filledFields: string[] = [];
            const fieldErrors: string[] = [];

            const formLocator = page.locator(formSelector);

            // Wait for form to be visible
            try {
              await formLocator.waitFor({ state: 'visible', timeout: 5000 });
            } catch (error) {
              throw new Error(`Form not found or not visible: ${formSelector}`);
            }

            for (const [fieldKey, value] of Object.entries(data)) {
              try {
                let fieldLocator = formLocator.locator(`input[name="${fieldKey}"], select[name="${fieldKey}"], textarea[name="${fieldKey}"]`);

                // Check if field exists with this selector
                if (await fieldLocator.count() === 0) {
                  fieldLocator = formLocator.locator(`[placeholder*="${fieldKey}"]`);
                }

                if (await fieldLocator.count() === 0) {
                  try {
                    fieldLocator = formLocator.locator(fieldKey);
                  } catch (e) {
                    // Not a valid selector
                    fieldLocator = page.locator('').last(); // Empty locator
                  }
                }

                if (await fieldLocator.count() === 0) {
                  fieldLocator = formLocator.locator(`#${fieldKey}`);
                }

                // Check other attributes if still not found
                if (await fieldLocator.count() === 0) {
                  for (const attr of ['aria-label', 'data-testid']) {
                    fieldLocator = formLocator.locator(`[${attr}*="${fieldKey}"]`);
                    if (await fieldLocator.count() > 0) break;
                  }
                }

                // Try ID matching only if fieldKey looks like a valid identifier (no spaces, no special chars)
                if (await fieldLocator.count() === 0 && /^[a-zA-Z][\w-]*$/.test(fieldKey)) {
                  try {
                    fieldLocator = formLocator.locator(`#${fieldKey}`);
                  } catch (e) {
                    // Invalid ID selector
                  }
                }

                if (await fieldLocator.count() === 0) {
                  // Try class matching (contains class)
                  const elements = formLocator.locator('*').all();
                  let found = false;
                  for (const el of await elements) {
                    const classes = await el.getAttribute('class') || '';
                    if (classes.includes(fieldKey)) {
                      fieldLocator = el;
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    fieldLocator = page.locator('').last(); // Empty locator
                  }
                }

                // Check if we found the field
                if (await fieldLocator.count() === 0) {
                  fieldErrors.push(`Field not found: ${fieldKey}`);
                  continue;
                }

                // Determine field type to decide how to interact
                const inputType = await fieldLocator.getAttribute('type') || '';
                const tagName = await fieldLocator.evaluate(el => el.tagName.toLowerCase());

                // Handle different field types
                if (inputType === 'checkbox') {
                  if (value) {
                    await fieldLocator.check();
                  } else {
                    await fieldLocator.uncheck();
                  }
                } else if (inputType === 'radio') {
                  if (value) {
                    await fieldLocator.check();
                  }
                } else if (tagName === 'select') {
                  // For select elements, use selectOption
                  await fieldLocator.selectOption(String(value));
                } else {
                  // For text inputs, password, textarea - simulate typing
                  // Clear first, then type character by character
                  await fieldLocator.clear();
                  await fieldLocator.type(String(value), { delay: 50 }); // 50ms delay between keystrokes
                }

                filledFields.push(fieldKey);

              } catch (error) {
                fieldErrors.push(`Error filling field ${fieldKey}: ${error}`);
              }
            }

            result = {
              action: "fill_form",
              success: fieldErrors.length === 0,
              formSelector,
              filledFields,
              errors: fieldErrors,
            };
            break;

          case "detect_fields":
            const fields = await page.evaluate((selector) => {
              const form = document.querySelector(selector) as HTMLFormElement;
              if (!form) return [];

              const fields: any[] = [];
              const inputs = form.querySelectorAll("input, select, textarea");

              for (const input of inputs) {
                const element = input as
                  | HTMLInputElement
                  | HTMLSelectElement
                  | HTMLTextAreaElement;
                const field = {
                  type:
                    element.tagName.toLowerCase() === "input"
                      ? (element as HTMLInputElement).type
                      : element.tagName.toLowerCase(),
                  selector:
                    element.name ||
                    element.id ||
                    element.className ||
                    element.tagName.toLowerCase(),
                  required:
                    element.tagName.toLowerCase() === "input"
                      ? (element as HTMLInputElement).required
                      : false,
                };
                fields.push(field);
              }

              return fields;
            }, formSelector);

            result = {
              action: "detect_fields",
              success: true,
              formSelector,
              fields,
            };
            break;

          case "submit_form":
            const submitResult = await page.evaluate((selector) => {
              const form = document.querySelector(selector) as HTMLFormElement;
              if (!form) return { success: false, error: "Form not found" };

              const submitBtn = form.querySelector(
                'input[type="submit"], button[type="submit"], button'
              ) as HTMLButtonElement | HTMLInputElement;
              if (submitBtn) {
                submitBtn.click();
              } else {
                form.submit();
              }

              return { success: true };
            }, formSelector);

            result = {
              action: "submit_form",
              success: submitResult.success,
              formSelector,
              error: submitResult.error,
            };
            // Wait a bit for submission to complete
            await page
              .waitForLoadState("networkidle", { timeout: 5000 })
              .catch(() => {});
            break;

          case "get_validation_errors":
            const errors = await page.evaluate((selector) => {
              const form = document.querySelector(selector);
              if (!form) return ["Form not found"];

              const errors: string[] = [];
              const inputs = form.querySelectorAll("input, select, textarea");

              for (const input of inputs) {
                const element = input as HTMLInputElement;
                if (!element.checkValidity()) {
                  const message =
                    element.validationMessage ||
                    `${element.name || element.id || element.type} is invalid`;
                  errors.push(message);
                }
              }

              return errors;
            }, formSelector);

            result = {
              action: "get_validation_errors",
              success: true,
              formSelector,
              errors,
              valid: errors.length === 0,
            };
            break;

          case "reset_form":
            const resetResult = await page.evaluate((selector) => {
              const form = document.querySelector(selector) as HTMLFormElement;
              if (!form) return { success: false, error: "Form not found" };

              form.reset();
              return { success: true };
            }, formSelector);

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
            await page.setInputFiles(
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
        action: typedArgs?.action || 'unknown',
        formSelector: typedArgs?.formSelector || 'default',
        url: typedArgs?.url || 'none',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        additionalContext: {
          data: typedArgs?.data ? Object.keys(typedArgs.data) : [],
          availableActions: ['fill_form', 'detect_fields', 'submit_form', 'get_validation_errors', 'reset_form', 'upload_file'],
          commonIssues: {
            fill_form: [
              "Use placeholder text as field keys for React forms (e.g. 'Enter your username')",
              "Ensure form selector targets the correct form element",
              "Check that fields exist and are visible on the page"
            ],
            submit_form: [
              "Form selector must target a <form> element",
              "Ensure submit button exists within the form",
              "Check for JavaScript form validation preventing submission"
            ]
          }
        }
      };

      // Wrap unexpected errors in MCP error format with detailed context
      throw new McpError(
        ErrorCode.InternalError,
        `Form handler error: ${JSON.stringify(errorDetails, null, 2)}`
      );
    }
}
