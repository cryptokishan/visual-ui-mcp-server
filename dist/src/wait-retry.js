import { browserManager } from "./browser-manager.js";
export class WaitRetrySystem {
    async waitForElement(args) {
        try {
            const { selector, timeout = 10000, retries = 3, interval = 1000, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let lastError = null;
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
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
                    await element.waitFor({ timeout });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Element "${selector}" found successfully on attempt ${attempt}`,
                            },
                        ],
                    };
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
            }
            throw new Error(`Element "${selector}" not found after ${retries} attempts. Last error: ${lastError?.message}`);
        }
        catch (error) {
            throw new Error(`Failed to wait for element: ${error.message}`);
        }
    }
    async waitForCondition(args) {
        try {
            const { condition, timeout = 10000, retries = 3, interval = 1000 } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let lastError = null;
            let lastResult = null;
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    // Evaluate the condition in the browser context
                    const result = await page.evaluate(condition);
                    if (result) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Condition "${condition}" met successfully on attempt ${attempt}. Result: ${result}`,
                                },
                            ],
                        };
                    }
                    lastResult = result;
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
            }
            throw new Error(`Condition "${condition}" not met after ${retries} attempts. Last result: ${lastResult}. Last error: ${lastError?.message}`);
        }
        catch (error) {
            throw new Error(`Failed to wait for condition: ${error.message}`);
        }
    }
    async waitForText(args) {
        try {
            const { selector, text, timeout = 10000, retries = 3, interval = 1000, selectorType = "css" } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let lastError = null;
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
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
                    await element.waitFor({ timeout });
                    const elementText = await element.textContent();
                    if (elementText && elementText.includes(text)) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Text "${text}" found in element "${selector}" on attempt ${attempt}`,
                                },
                            ],
                        };
                    }
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
            }
            throw new Error(`Text "${text}" not found in element "${selector}" after ${retries} attempts. Last error: ${lastError?.message}`);
        }
        catch (error) {
            throw new Error(`Failed to wait for text: ${error.message}`);
        }
    }
    async waitForURL(args) {
        try {
            const { url, timeout = 10000, retries = 3, interval = 1000, exact = false } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let lastError = null;
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const currentURL = page.url();
                    if (exact) {
                        if (currentURL === url) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `URL "${url}" matched exactly on attempt ${attempt}`,
                                    },
                                ],
                            };
                        }
                    }
                    else {
                        if (currentURL.includes(url)) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `URL "${url}" found in current URL "${currentURL}" on attempt ${attempt}`,
                                    },
                                ],
                            };
                        }
                    }
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
            }
            const currentURL = page.url();
            throw new Error(`URL "${url}" not found after ${retries} attempts. Current URL: ${currentURL}. Last error: ${lastError?.message}`);
        }
        catch (error) {
            throw new Error(`Failed to wait for URL: ${error.message}`);
        }
    }
    async waitForNetworkIdle(args) {
        try {
            const { timeout = 30000, concurrent = 2 } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            await page.waitForLoadState('networkidle', { timeout });
            return {
                content: [
                    {
                        type: "text",
                        text: `Network idle detected after waiting for ${timeout}ms`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to wait for network idle: ${error.message}`);
        }
    }
    async retryAction(args) {
        try {
            const { action, condition, maxRetries = 3, interval = 1000, timeout = 5000 } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            let lastError = null;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    // Execute the action
                    await page.evaluate(action);
                    // Wait a bit for the action to take effect
                    await new Promise(resolve => setTimeout(resolve, interval));
                    // Check the condition
                    const result = await page.evaluate(condition);
                    if (result) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Action succeeded on attempt ${attempt}. Condition met: ${result}`,
                                },
                            ],
                        };
                    }
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
                catch (error) {
                    lastError = error;
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                }
            }
            throw new Error(`Action failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
        }
        catch (error) {
            throw new Error(`Failed to retry action: ${error.message}`);
        }
    }
}
export const waitRetrySystem = new WaitRetrySystem();
