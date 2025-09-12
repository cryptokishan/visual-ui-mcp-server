import { ElementLocator } from "./element-locator.js";
export class FormHandler {
    page;
    elementLocator;
    constructor(page, elementLocator) {
        this.page = page;
        this.elementLocator = elementLocator || new ElementLocator(page);
    }
    /**
     * Fill a single form field
     */
    async fillField(field) {
        const element = await this.page.$(field.selector);
        if (!element) {
            throw new Error(`Field not found: ${field.selector}`);
        }
        const fieldType = field.type || (await this.detectFieldType(element));
        switch (fieldType) {
            case "text":
            case "password":
            case "email":
                await this.fillTextField(element, field.value, field.clearFirst);
                break;
            case "number":
                await this.fillTextField(element, field.value.toString(), field.clearFirst);
                break;
            case "checkbox":
                await this.setCheckbox(element, field.value);
                break;
            case "radio":
                await this.setRadioButton(element, field.value);
                break;
            case "select":
                await this.selectOption(element, field.value);
                break;
            case "file":
                await this.uploadFile(element, field.value);
                break;
            default:
                throw new Error(`Unsupported field type: ${fieldType}`);
        }
    }
    /**
     * Fill multiple form fields
     */
    async fillForm(fields) {
        for (const field of fields) {
            try {
                await this.fillField(field);
            }
            catch (error) {
                throw new Error(`Failed to fill field ${field.selector}: ${error.message}`);
            }
        }
    }
    /**
     * Submit a form
     */
    async submitForm(submission = {}) {
        const submitSelector = submission.submitSelector ||
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
        }
        else {
            await submitButton.click();
            return this.page;
        }
    }
    /**
     * Reset a form
     */
    async resetForm(formSelector) {
        const selector = formSelector || "form";
        const form = await this.page.$(selector);
        if (!form) {
            throw new Error(`Form not found: ${selector}`);
        }
        // Try to find and click reset button first
        const resetButton = await form.$('input[type="reset"], button[type="reset"]');
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
            }
            else if (type !== "submit" && type !== "button" && type !== "reset") {
                await input.fill("");
            }
        }
    }
    /**
     * Get form data as key-value pairs
     */
    async getFormData(formSelector) {
        const form = await this.page.$(formSelector);
        if (!form) {
            throw new Error(`Form not found: ${formSelector}`);
        }
        const formData = {};
        // Get all input fields
        const inputs = await form.$$("input, textarea, select");
        for (const input of inputs) {
            const name = await input.getAttribute("name");
            const type = await input.getAttribute("type");
            if (!name)
                continue;
            if (type === "checkbox") {
                formData[name] = await input.isChecked();
            }
            else if (type === "radio") {
                if (await input.isChecked()) {
                    formData[name] = (await input.getAttribute("value")) || "";
                }
            }
            else if (type === "file") {
                // Skip file inputs for now
                continue;
            }
            else {
                formData[name] = await input.inputValue();
            }
        }
        return formData;
    }
    /**
     * Validate form and return validation results
     */
    async validateForm(formSelector) {
        const form = await this.page.$(formSelector);
        if (!form) {
            throw new Error(`Form not found: ${formSelector}`);
        }
        const result = {
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
    async detectFieldType(element) {
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
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
    async fillTextField(element, value, clearFirst = true) {
        if (clearFirst) {
            await element.fill("");
        }
        await element.fill(value);
    }
    /**
     * Set checkbox value
     */
    async setCheckbox(element, checked) {
        if (checked) {
            await element.check();
        }
        else {
            await element.uncheck();
        }
    }
    /**
     * Set radio button value
     */
    async setRadioButton(element, selected) {
        if (selected) {
            await element.check();
        }
    }
    /**
     * Select option from dropdown
     */
    async selectOption(element, value) {
        await element.selectOption(value);
    }
    /**
     * Upload file to file input
     */
    async uploadFile(element, file) {
        // For now, we'll use a simple file path approach
        // In a real implementation, you'd need to handle File objects properly
        if (file && typeof file === "object" && "path" in file) {
            await element.setInputFiles(file.path);
        }
        else {
            throw new Error("File upload requires a file with a path property");
        }
    }
}
