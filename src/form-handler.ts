import { ElementHandle, Page } from "playwright";
import { ElementLocator } from "./element-locator.js";
import { FormHandlerError } from "./index.js";

export interface FormField {
  selector: string;
  value: string | number | boolean | File;
  type?:
    | "text"
    | "password"
    | "email"
    | "number"
    | "checkbox"
    | "radio"
    | "select"
    | "file";
  clearFirst?: boolean;
}

export interface FormSubmission {
  submitSelector?: string;
  waitForNavigation?: boolean;
  expectValidationErrors?: boolean;
  captureScreenshot?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

export class FormHandler {
  private page: Page;
  private elementLocator: ElementLocator;

  constructor(page: Page, elementLocator?: ElementLocator) {
    this.page = page;
    this.elementLocator = elementLocator || new ElementLocator(page);
  }

  /**
   * Fill a single form field
   */
  async fillField(field: FormField): Promise<void> {
    const element = await this.page.$(field.selector);
    if (!element) {
      throw new FormHandlerError(
        `Form field not found: ${field.selector}`,
        "The specified form field selector does not exist on the page. Verify the selector is correct and the page has loaded completely.",
        false
      );
    }

    const fieldType = field.type || (await this.detectFieldType(element));

    switch (fieldType) {
      case "text":
      case "password":
      case "email":
        await this.fillTextField(
          element,
          field.value as string,
          field.clearFirst
        );
        break;
      case "number":
        await this.fillTextField(
          element,
          field.value.toString(),
          field.clearFirst
        );
        break;
      case "checkbox":
        await this.setCheckbox(element, field.value as boolean);
        break;
      case "radio":
        await this.setRadioButton(element, field.value as boolean);
        break;
      case "select":
        await this.selectOption(element, field.value as string);
        break;
      case "file":
        await this.uploadFile(element, field.value as File);
        break;
      default:
        throw new FormHandlerError(
          `Unsupported form field type: ${fieldType}`,
          "The specified field type is not supported. Supported types: text, password, email, number, checkbox, radio, select, file.",
          false
        );
    }
  }

  /**
   * Fill multiple form fields
   */
  async fillForm(fields: FormField[]): Promise<void> {
    for (const field of fields) {
      try {
        await this.fillField(field);
      } catch (error) {
        throw new FormHandlerError(
          `Failed to fill form field ${field.selector}: ${
            (error as Error).message
          }`,
          "One or more form fields could not be filled. Check the field selectors and ensure the form is properly loaded.",
          false
        );
      }
    }
  }

  /**
   * Submit a form
   */
  async submitForm(submission: FormSubmission = {}): Promise<Page> {
    const submitSelector =
      submission.submitSelector ||
      'input[type="submit"], button[type="submit"], button:not([type])';

    const submitButton = await this.page.$(submitSelector);
    if (!submitButton) {
      throw new FormHandlerError(
        `Form submit button not found: ${submitSelector}`,
        "The form submit button could not be located. Verify the submit selector or ensure the form is properly loaded.",
        false
      );
    }

    if (submission.captureScreenshot) {
      await this.page.screenshot({
        path: "screenshots/form-before-submit.png",
      });
    }

    if (submission.waitForNavigation) {
      const [response] = await Promise.all([
        this.page.waitForLoadState("networkidle"),
        submitButton.click(),
      ]);
      return this.page;
    } else {
      await submitButton.click();
      return this.page;
    }
  }

  /**
   * Reset a form
   */
  async resetForm(formSelector?: string): Promise<void> {
    const selector = formSelector || "form";
    const form = await this.page.$(selector);
    if (!form) {
      throw new FormHandlerError(
        `Form not found: ${selector}`,
        "The specified form selector does not exist on the page. Verify the selector is correct and the page has loaded completely.",
        false
      );
    }

    // Try to find and click reset button first
    const resetButton = await form.$(
      'input[type="reset"], button[type="reset"]'
    );
    if (resetButton) {
      await resetButton.click();
      return;
    }

    // Fallback: clear all form fields manually
    const inputs = await form.$$("input, textarea, select");
    for (const input of inputs) {
      const type = await input.getAttribute("type");
      if (type === "checkbox" || type === "radio") {
        await input.uncheck();
      } else if (type !== "submit" && type !== "button" && type !== "reset") {
        await input.fill("");
      }
    }
  }

  /**
   * Get form data as key-value pairs
   */
  async getFormData(formSelector: string): Promise<Record<string, any>> {
    const form = await this.page.$(formSelector);
    if (!form) {
      throw new FormHandlerError(
        `Form not found: ${formSelector}`,
        "The specified form selector does not exist on the page. Verify the selector is correct and the page has loaded completely.",
        false
      );
    }

    const formData: Record<string, any> = {};

    // Get all input fields
    const inputs = await form.$$("input, textarea, select");
    for (const input of inputs) {
      const name = await input.getAttribute("name");
      const type = await input.getAttribute("type");

      if (!name) continue;

      if (type === "checkbox") {
        formData[name] = await input.isChecked();
      } else if (type === "radio") {
        if (await input.isChecked()) {
          formData[name] = (await input.getAttribute("value")) || "";
        }
      } else if (type === "file") {
        // Skip file inputs for now
        continue;
      } else {
        formData[name] = await input.inputValue();
      }
    }

    return formData;
  }

  /**
   * Validate form and return validation results
   */
  async validateForm(formSelector: string): Promise<ValidationResult> {
    const form = await this.page.$(formSelector);
    if (!form) {
      throw new FormHandlerError(
        `Form not found: ${formSelector}`,
        "The specified form selector does not exist on the page. Verify the selector is correct and the page has loaded completely.",
        false
      );
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      fieldErrors: {},
    };

    // Check for HTML5 validation
    const inputs = await form.$$("input, textarea, select");
    for (const input of inputs) {
      const name = await input.getAttribute("name");
      const required = await input.getAttribute("required");
      const value = await input.inputValue();

      if (required && !value) {
        result.isValid = false;
        result.errors.push(`${name || "Field"} is required`);
        if (name) {
          result.fieldErrors[name] = result.fieldErrors[name] || [];
          result.fieldErrors[name].push("This field is required");
        }
      }

      // Check for custom validation attributes
      const pattern = await input.getAttribute("pattern");
      if (pattern && value) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          result.isValid = false;
          result.errors.push(`${name || "Field"} format is invalid`);
          if (name) {
            result.fieldErrors[name] = result.fieldErrors[name] || [];
            result.fieldErrors[name].push("Invalid format");
          }
        }
      }
    }

    return result;
  }

  /**
   * Detect field type automatically
   */
  private async detectFieldType(element: ElementHandle): Promise<string> {
    const tagName = await element.evaluate((el) =>
      (el as Element).tagName.toLowerCase()
    );
    const type = await element.getAttribute("type");

    if (tagName === "select") {
      return "select";
    }

    if (tagName === "textarea") {
      return "text";
    }

    if (type === "checkbox") {
      return "checkbox";
    }

    if (type === "radio") {
      return "radio";
    }

    if (type === "file") {
      return "file";
    }

    // Default to text for input elements
    return "text";
  }

  /**
   * Fill text input field
   */
  private async fillTextField(
    element: ElementHandle,
    value: string,
    clearFirst = true
  ): Promise<void> {
    if (clearFirst) {
      await element.fill("");
    }
    await element.fill(value);
  }

  /**
   * Set checkbox value
   */
  private async setCheckbox(
    element: ElementHandle,
    checked: boolean
  ): Promise<void> {
    if (checked) {
      await element.check();
    } else {
      await element.uncheck();
    }
  }

  /**
   * Set radio button value
   */
  private async setRadioButton(
    element: ElementHandle,
    selected: boolean
  ): Promise<void> {
    if (selected) {
      await element.check();
    }
  }

  /**
   * Select option from dropdown
   */
  private async selectOption(
    element: ElementHandle,
    value: string
  ): Promise<void> {
    await element.selectOption(value);
  }

  /**
   * Upload file to file input with enhanced support for multiple file formats
   */
  private async uploadFile(
    element: ElementHandle,
    file: File | string | (File | string)[]
  ): Promise<void> {
    try {
      if (Array.isArray(file)) {
        // Handle multiple files - convert to format expected by Playwright
        const filePaths: string[] = [];
        const fileObjects: Array<{ name: string; mimeType: string; buffer: Buffer }> = [];

        for (const item of file) {
          if (typeof item === "string") {
            filePaths.push(item);
          } else if (item instanceof File) {
            // Convert File object to Playwright format
            const buffer = Buffer.from(await item.arrayBuffer());
            fileObjects.push({
              name: item.name,
              mimeType: item.type,
              buffer: buffer,
            });
          }
        }

        // Use file paths if available, otherwise use File objects
        if (filePaths.length > 0) {
          await element.setInputFiles(filePaths);
        } else if (fileObjects.length > 0) {
          await element.setInputFiles(fileObjects);
        } else {
          throw new FormHandlerError(
            "Empty file array provided",
            "File array is empty. Please provide at least one file to upload.",
            false
          );
        }
      } else if (file instanceof File) {
        // Convert File object to Playwright format
        const buffer = Buffer.from(await file.arrayBuffer());
        await element.setInputFiles([{
          name: file.name,
          mimeType: file.type,
          buffer: buffer,
        }]);
      } else if (typeof file === "string") {
        // Handle file path
        await element.setInputFiles(file);
      } else {
        throw new FormHandlerError(
          "Invalid file format for upload",
          "File upload supports: File objects, file paths (strings), or arrays of these. Please provide a supported file format.",
          false
        );
      }
    } catch (error) {
      throw new FormHandlerError(
        `File upload failed: ${(error as Error).message}`,
        "File upload encountered an error. Check file permissions, file existence, and ensure the file input element is available.",
        true
      );
    }
  }
}
