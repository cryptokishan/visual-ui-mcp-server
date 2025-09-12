import { ElementHandle, Page } from "playwright";
import { ElementLocator } from "./element-locator.js";

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
      throw new Error(`Field not found: ${field.selector}`);
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
        throw new Error(`Unsupported field type: ${fieldType}`);
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
        throw new Error(
          `Failed to fill field ${field.selector}: ${(error as Error).message}`
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
      throw new Error(`Submit button not found: ${submitSelector}`);
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
      throw new Error(`Form not found: ${selector}`);
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
      throw new Error(`Form not found: ${formSelector}`);
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
      throw new Error(`Form not found: ${formSelector}`);
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
    const tagName = await element.evaluate((el) => (el as Element).tagName.toLowerCase());
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
   * Upload file to file input
   */
  private async uploadFile(element: ElementHandle, file: File): Promise<void> {
    // For now, we'll use a simple file path approach
    // In a real implementation, you'd need to handle File objects properly
    if (file && typeof file === "object" && "path" in file) {
      await element.setInputFiles((file as any).path);
    } else {
      throw new Error("File upload requires a file with a path property");
    }
  }
}
