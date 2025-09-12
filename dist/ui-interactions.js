import { browserManager } from "./browser-manager.js";
export class UIInteractions {
    async clickElement(args) {
        try {
            const { selector, selectorType = "css", timeout = 5000 } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let element;
            switch (selectorType) {
                case "text":
                    element = page.locator(`text=${selector}`);
                    break;
                case "role":
                    element = page.getByRole(selector);
                    break;
                case "label":
                    element = page.getByLabel(selector);
                    break;
                case "placeholder":
                    element = page.getByPlaceholder(selector);
                    break;
                default:
                    element = page.locator(selector);
            }
            await element.click({ timeout });
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully clicked element: ${selector} (type: ${selectorType})`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to click element: ${error.message}`);
        }
    }
    async typeText(args) {
        try {
            const { selector, text, clear = true, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let element;
            switch (selectorType) {
                case "text":
                    element = page.locator(`text=${selector}`);
                    break;
                case "role":
                    element = page.getByRole(selector);
                    break;
                case "label":
                    element = page.getByLabel(selector);
                    break;
                case "placeholder":
                    element = page.getByPlaceholder(selector);
                    break;
                default:
                    element = page.locator(selector);
            }
            if (clear) {
                await element.clear();
            }
            await element.type(text);
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully typed "${text}" into element: ${selector}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to type text: ${error.message}`);
        }
    }
    async getElementText(args) {
        try {
            const { selector, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let element;
            switch (selectorType) {
                case "text":
                    element = page.locator(`text=${selector}`);
                    break;
                case "role":
                    element = page.getByRole(selector);
                    break;
                case "label":
                    element = page.getByLabel(selector);
                    break;
                default:
                    element = page.locator(selector);
            }
            const text = await element.textContent();
            return {
                content: [
                    {
                        type: "text",
                        text: `Element text: "${text || ""}"`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to get element text: ${error.message}`);
        }
    }
    async getElementAttribute(args) {
        try {
            const { selector, attribute, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let element;
            switch (selectorType) {
                case "text":
                    element = page.locator(`text=${selector}`);
                    break;
                case "role":
                    element = page.getByRole(selector);
                    break;
                case "label":
                    element = page.getByLabel(selector);
                    break;
                default:
                    element = page.locator(selector);
            }
            const value = await element.getAttribute(attribute);
            return {
                content: [
                    {
                        type: "text",
                        text: `Element attribute "${attribute}": "${value || ""}"`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to get element attribute: ${error.message}`);
        }
    }
    async isElementVisible(args) {
        try {
            const { selector, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let element;
            switch (selectorType) {
                case "text":
                    element = page.locator(`text=${selector}`);
                    break;
                case "role":
                    element = page.getByRole(selector);
                    break;
                case "label":
                    element = page.getByLabel(selector);
                    break;
                default:
                    element = page.locator(selector);
            }
            const isVisible = await element.isVisible();
            return {
                content: [
                    {
                        type: "text",
                        text: `Element "${selector}" is ${isVisible ? "visible" : "not visible"}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to check element visibility: ${error.message}`);
        }
    }
    async scrollToElement(args) {
        try {
            const { selector, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let element;
            switch (selectorType) {
                case "text":
                    element = page.locator(`text=${selector}`);
                    break;
                case "role":
                    element = page.getByRole(selector);
                    break;
                case "label":
                    element = page.getByLabel(selector);
                    break;
                default:
                    element = page.locator(selector);
            }
            await element.scrollIntoViewIfNeeded();
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully scrolled to element: ${selector}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to scroll to element: ${error.message}`);
        }
    }
}
export const uiInteractions = new UIInteractions();
