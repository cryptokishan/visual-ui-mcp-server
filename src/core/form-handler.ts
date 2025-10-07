/**
 * Form Handler for automated form interaction in visual UI testing
 * Provides comprehensive form field detection, population, submission, and validation
 */

export interface FormField {
  type: string;
  selector: string;
  value?: string;
  options?: string[];
  label?: string;
  required?: boolean;
}

export interface FormResult {
  success: boolean;
  submitted?: boolean;
  validationErrors?: string[];
  filledFields?: string[];
  fields?: FormField[];
  error?: string;
}

/**
 * Utility functions for form handling that work in HTML context
 * These functions run in the browser context via page.evaluate()
 */
export const FormUtils = {
  /**
   * Detect all form fields within a form element
   */
  detectFields: (formSelector: string): FormField[] => {
    const form = document.querySelector(formSelector) as HTMLFormElement;
    if (!form) {
      console.warn(`Form not found with selector: ${formSelector}`);
      return [];
    }

    const fields: FormField[] = [];
    const inputs = form.querySelectorAll("input, select, textarea");

    console.log(`Found ${inputs.length} form elements in ${formSelector}`);

    for (const input of inputs) {
      const element = input as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
      const field: FormField = {
        type:
          element.tagName.toLowerCase() === "input"
            ? (element as HTMLInputElement).type
            : element.tagName.toLowerCase(),
        selector:
          element.name ||
          element.id ||
          element.className ||
          element.tagName.toLowerCase(),
      };

      // Get current value
      if (
        [
          "text",
          "email",
          "password",
          "number",
          "tel",
          "url",
          "search",
        ].includes(field.type) ||
        element.tagName.toLowerCase() === "textarea"
      ) {
        field.value = (element as HTMLInputElement).value;
      } else if (field.type === "checkbox" || field.type === "radio") {
        field.value = (element as HTMLInputElement).checked.toString();
      } else if (element.tagName.toLowerCase() === "select") {
        const selectElement = element as HTMLSelectElement;
        field.value = selectElement.value;
        field.options = Array.from(selectElement.options).map(
          (opt) => opt.value
        );
      }

      // Check if required
      field.required = (element as HTMLInputElement).required;

      // Try to get label
      const id = element.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) field.label = label.textContent?.trim();
      }

      fields.push(field);
    }

    console.log(`Detected ${fields.length} form fields:`, fields);
    return fields;
  },

  /**
   * Fill form fields with data
   */
  fillForm: (
    formSelector: string,
    data: Record<string, any>
  ): { success: boolean; filledFields: string[]; errors: string[] } => {
    const results = {
      success: true,
      filledFields: <string[]>[],
      errors: <string[]>[],
    };

    for (const [fieldName, value] of Object.entries(data)) {
      try {
        const field = document.querySelector(
          `${formSelector} input[name="${fieldName}"], ${formSelector} select[name="${fieldName}"], ${formSelector} textarea[name="${fieldName}"]`
        ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

        if (!field) {
          results.errors.push(`Field not found: ${fieldName}`);
          continue;
        }

        const tagName = field.tagName.toLowerCase();
        const type =
          tagName === "input" ? (field as HTMLInputElement).type : tagName;

        if (type === "checkbox") {
          (field as HTMLInputElement).checked = !!value;
        } else if (type === "radio") {
          if (value) (field as HTMLInputElement).checked = true;
        } else if (type !== "file") {
          field.value = value.toString();
        }

        results.filledFields.push(fieldName);
      } catch (error) {
        results.errors.push(`Error filling field ${fieldName}: ${error}`);
      }
    }

    return results;
  },

  /**
   * Submit form
   */
  submitForm: (formSelector: string): { success: boolean; error?: string } => {
    try {
      const form = document.querySelector(formSelector) as HTMLFormElement;
      if (!form) {
        return { success: false, error: `Form not found: ${formSelector}` };
      }

      // Try to find submit button first
      const submitBtn = form.querySelector(
        'input[type="submit"], button[type="submit"], button'
      ) as HTMLButtonElement | HTMLInputElement;

      if (submitBtn) {
        submitBtn.click();
      } else {
        form.submit();
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Get validation errors
   */
  getValidationErrors: (formSelector: string): string[] => {
    const form = document.querySelector(formSelector);
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
  },

  /**
   * Reset form
   */
  resetForm: (formSelector: string): { success: boolean; error?: string } => {
    try {
      const form = document.querySelector(formSelector) as HTMLFormElement;
      if (form) {
        form.reset();
        return { success: true };
      }
      return { success: false, error: "Form not found" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export default FormUtils;

/**
 * Core browser-level form operations that work with Playwright Page
 */
export class FormOperations {
  private page: any; // Playwright Page
  private pageStateManager?: any; // Optional PageStateManager for coordination
  private elementLocator: any; // Robust element location (injected by ToolCoordinator)

  constructor(
    page: any,
    pageStateManager?: any,
    elementLocator?: any // Injected by ToolCoordinator
  ) {
    this.page = page;
    this.pageStateManager = pageStateManager;
    // ElementLocator is injected by ToolCoordinator for coordination
    this.elementLocator = elementLocator;
  }

  /**
   * Wait for form to be available
   */
  async waitForForm(formSelector: string): Promise<void> {
    try {
      await this.page
        .locator(formSelector)
        .waitFor({ state: "visible", timeout: 5000 });
    } catch (error) {
      throw new Error(`Form not found or not visible: ${formSelector}`);
    }
  }

  /**
   * Fill form fields with typing simulation using optimized ElementLocator
   */
  async fillFormWithTyping(
    formSelector: string,
    data: Record<string, any>
  ): Promise<{ filledFields: string[]; errors: string[] }> {
    const filledFields: string[] = [];
    const fieldErrors: string[] = [];

    // Use coordinated PageStateManager for stability if available
    if (this.pageStateManager) {
      await this.pageStateManager.waitForStableState({
        timeout: 3000,
        checkNetworkIdle: false,
        checkAnimations: false,
      });
    }

    for (const [fieldKey, value] of Object.entries(data)) {
      try {
        await this.fillSingleField(formSelector, fieldKey, value);
        filledFields.push(fieldKey);
      } catch (error) {
        fieldErrors.push(`Error filling field ${fieldKey}: ${error}`);
      }
    }

    return { filledFields, errors: fieldErrors };
  }

  /**
   * Optimized single field filling using ElementLocator
   */
  private async fillSingleField(
    formSelector: string,
    fieldKey: string,
    value: any
  ): Promise<void> {
    // Try ElementLocator first with optimized settings (BYPASS COMPLEX FALLBACKS)
    if (this.elementLocator && typeof this.elementLocator.locateElement === 'function') {
      try {
        // Use simple, fast ElementLocator for basic field finding
        const element = await this.elementLocator.locateElement(this.page, {
          selector: `${formSelector} [name="${fieldKey}"]`, // Single simple selector
          timeout: 2000, // Shorter timeout for speed
          visibilityCheck: false, // Skip expensive visibility checks
          retryCount: 0, // No retry to avoid blocking
        });

        if (element) {
          // Get field info and use direct ElementHandle methods for speed
          const inputType = await element.getAttribute("type") || "";
          const tagName = await element.evaluate((el: any) =>
            el.tagName.toLowerCase()
          );

          // Use ElementHandle directly for performance
          if (inputType === "checkbox") {
            value ? await element.check() : await element.uncheck();
          } else if (inputType === "radio") {
            if (value) await element.check();
          } else if (tagName === "select") {
            await element.selectOption(String(value));
          } else {
            await element.fill(String(value)); // Direct fill for text fields
          }

          await element.dispose(); // Cleanup ElementHandle
          return; // Success - skip to next field
        }
      } catch (error) {
        // ElementLocator failed, fall back to traditional approach
        console.debug(`ElementLocator failed for ${fieldKey}:`, error);
      }
    }

    // Fallback to basic Playwright locator if ElementLocator fails or unavailable
    const locator = this.page.locator(
      `${formSelector} [name="${fieldKey}"], ${formSelector} #${fieldKey}, ${formSelector} [placeholder*="${fieldKey}"]`
    ).first(); // Take first match for speed

    const inputType = await locator.getAttribute("type") || "";
    const tagName = await locator.evaluate((el: any) =>
      el.tagName.toLowerCase()
    );

    if (inputType === "checkbox") {
      value ? await locator.check() : await locator.uncheck();
    } else if (inputType === "radio") {
      if (value) await locator.check();
    } else if (tagName === "select") {
      await locator.selectOption(String(value));
    } else {
      await locator.fill(String(value));
    }
  }

  /**
   * Generate intelligent field selector for ElementLocator
   * Combines form constraint with multiple field identification strategies
   */
  private generateFieldSelector(
    formSelector: string,
    fieldKey: string
  ): string {
    // Primary strategies: name attributes
    const nameSelectors = [
      `${formSelector} input[name="${fieldKey}"]`,
      `${formSelector} select[name="${fieldKey}"]`,
      `${formSelector} textarea[name="${fieldKey}"]`,
    ].join(", ");

    // Secondary: Placeholder-based (for React apps)
    const placeholderSelectors = `${formSelector} [placeholder*="${fieldKey}"]`;

    // Tertiary: ID-based selectors
    const idSelectors = `${formSelector} #${fieldKey}`;

    // Quaternary: Test ID selectors (for test frameworks)
    const testIdSelectors = [
      `${formSelector} [data-testid*="${fieldKey}"]`,
      `${formSelector} [aria-label*="${fieldKey}"]`,
    ].join(", ");

    // Combine all strategies - ElementLocator will try them intelligently
    return [
      nameSelectors,
      placeholderSelectors,
      idSelectors,
      testIdSelectors,
    ].join(", ");
  }

  /**
   * Validate required fields are provided
   */
  async validateRequiredFields(
    formSelector: string,
    data: Record<string, any>
  ): Promise<{
    valid: boolean;
    missingFields?: string[];
    requiredFields?: string[];
  }> {
    return await this.page.evaluate(
      ({ selector, data }: { selector: string; data: Record<string, any> }) => {
        const form = document.querySelector(selector) as HTMLFormElement;
        if (!form) return { valid: false, errors: ["Form not found"] };

        const requiredFields: string[] = [];
        const inputs = form.querySelectorAll("input, select, textarea");

        for (const input of inputs) {
          const element = input as any;
          const name = element.name || element.id || "";
          if (name && element.outerHTML.includes("required")) {
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
        };
      },
      { selector: formSelector, data }
    );
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(fileSelector: string, filePath: string): Promise<void> {
    await this.page.setInputFiles(fileSelector, filePath);
  }

  /**
   * Wait for page to stabilize after form submission
   */
  async waitForSubmission(timeout: number = 5000): Promise<void> {
    try {
      // Use PageStateManager if available for comprehensive stability checking
      if (this.pageStateManager) {
        await this.pageStateManager.waitForStableState({
          timeout,
          checkNetworkIdle: true,
          checkAnimations: true,
        });
      } else {
        // Fallback to basic network idle check if no state manager available
        await this.page
          .waitForLoadState("networkidle", { timeout })
          .catch(() => {});
      }
    } catch (error) {
      // Don't throw errors for submission waiting - forms may not always navigate
      console.debug(
        "Form submission stability check completed with:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
