import { Page } from "@playwright/test";

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
    const inputs = form.querySelectorAll('input, select, textarea');

    console.log(`Found ${inputs.length} form elements in ${formSelector}`);

    for (const input of inputs) {
      const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const field: FormField = {
        type: element.tagName.toLowerCase() === 'input' ? (element as HTMLInputElement).type : element.tagName.toLowerCase(),
        selector: element.name || element.id || element.className || element.tagName.toLowerCase()
      };

      // Get current value
      if (['text', 'email', 'password', 'number', 'tel', 'url', 'search'].includes(field.type) ||
          element.tagName.toLowerCase() === 'textarea') {
        field.value = (element as HTMLInputElement).value;
      } else if (field.type === 'checkbox' || field.type === 'radio') {
        field.value = (element as HTMLInputElement).checked.toString();
      } else if (element.tagName.toLowerCase() === 'select') {
        const selectElement = element as HTMLSelectElement;
        field.value = selectElement.value;
        field.options = Array.from(selectElement.options).map(opt => opt.value);
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
  fillForm: (formSelector: string, data: Record<string, any>): { success: boolean; filledFields: string[]; errors: string[] } => {
    const results = { success: true, filledFields: <string[]>[], errors: <string[]>[] };

    for (const [fieldName, value] of Object.entries(data)) {
      try {
        const field = document.querySelector(`${formSelector} input[name="${fieldName}"], ${formSelector} select[name="${fieldName}"], ${formSelector} textarea[name="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

        if (!field) {
          results.errors.push(`Field not found: ${fieldName}`);
          continue;
        }

        const tagName = field.tagName.toLowerCase();
        const type = tagName === 'input' ? (field as HTMLInputElement).type : tagName;

        if (type === 'checkbox') {
          (field as HTMLInputElement).checked = !!value;
        } else if (type === 'radio') {
          if (value) (field as HTMLInputElement).checked = true;
        } else if (type !== 'file') {
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
      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"], button') as HTMLButtonElement | HTMLInputElement;

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
    if (!form) return ['Form not found'];

    const errors: string[] = [];
    const inputs = form.querySelectorAll('input, select, textarea');

    for (const input of inputs) {
      const element = input as HTMLInputElement;
      if (!element.checkValidity()) {
        const message = element.validationMessage || `${element.name || element.id || element.type} is invalid`;
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
      return { success: false, error: 'Form not found' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
};

export default FormUtils;
