import { Page } from "playwright";
import { ElementLocator } from "./element-locator.js";
export interface FormField {
    selector: string;
    value: string | number | boolean | File;
    type?: "text" | "password" | "email" | "number" | "checkbox" | "radio" | "select" | "file";
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
export declare class FormHandler {
    private page;
    private elementLocator;
    constructor(page: Page, elementLocator?: ElementLocator);
    /**
     * Fill a single form field
     */
    fillField(field: FormField): Promise<void>;
    /**
     * Fill multiple form fields
     */
    fillForm(fields: FormField[]): Promise<void>;
    /**
     * Submit a form
     */
    submitForm(submission?: FormSubmission): Promise<Page>;
    /**
     * Reset a form
     */
    resetForm(formSelector?: string): Promise<void>;
    /**
     * Get form data as key-value pairs
     */
    getFormData(formSelector: string): Promise<Record<string, any>>;
    /**
     * Validate form and return validation results
     */
    validateForm(formSelector: string): Promise<ValidationResult>;
    /**
     * Detect field type automatically
     */
    private detectFieldType;
    /**
     * Fill text input field
     */
    private fillTextField;
    /**
     * Set checkbox value
     */
    private setCheckbox;
    /**
     * Set radio button value
     */
    private setRadioButton;
    /**
     * Select option from dropdown
     */
    private selectOption;
    /**
     * Upload file to file input with enhanced support for multiple file formats
     */
    private uploadFile;
}
