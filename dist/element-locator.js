export class ElementLocator {
    page;
    defaultTimeout = 10000;
    defaultRetryCount = 3;
    constructor(page) {
        this.page = page;
    }
    /**
     * Find a single element using multiple fallback strategies
     */
    async findElement(query) {
        const timeout = query.timeout || this.defaultTimeout;
        const retryCount = query.retryCount || this.defaultRetryCount;
        // Sort selectors by priority (lower number = higher priority)
        const sortedSelectors = query.selectors.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        for (let attempt = 0; attempt <= retryCount; attempt++) {
            for (const selector of sortedSelectors) {
                try {
                    let element = null;
                    switch (selector.type) {
                        case 'css':
                            element = await this.page.$(selector.value);
                            break;
                        case 'xpath':
                            element = await this.page.$(`xpath=${selector.value}`);
                            break;
                        case 'text':
                            element = await this.page.$(`text=${selector.value}`);
                            break;
                        case 'aria':
                            element = await this.page.$(`[aria-label="${selector.value}"]`);
                            break;
                        case 'data':
                            element = await this.page.$(`[data-testid="${selector.value}"]`);
                            break;
                    }
                    if (element) {
                        // Verify element state if requested
                        if (query.waitForVisible && !(await element.isVisible())) {
                            continue;
                        }
                        if (query.waitForEnabled && !(await element.isEnabled())) {
                            continue;
                        }
                        return element;
                    }
                }
                catch (error) {
                    // Continue to next selector on error
                    continue;
                }
            }
            // Wait before retry (exponential backoff)
            if (attempt < retryCount) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        return null;
    }
    /**
     * Wait for an element to appear with multiple fallback strategies
     */
    async waitForElement(query) {
        const timeout = query.timeout || this.defaultTimeout;
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = await this.findElement(query);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Element not found within ${timeout}ms using any of the provided selectors`);
    }
    /**
     * Find multiple elements using the first successful selector strategy
     */
    async findElements(query) {
        const timeout = query.timeout || this.defaultTimeout;
        const retryCount = query.retryCount || this.defaultRetryCount;
        // Sort selectors by priority
        const sortedSelectors = query.selectors.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        for (let attempt = 0; attempt <= retryCount; attempt++) {
            for (const selector of sortedSelectors) {
                try {
                    let elements = [];
                    switch (selector.type) {
                        case 'css':
                            elements = await this.page.$$(selector.value);
                            break;
                        case 'xpath':
                            elements = await this.page.$$(`xpath=${selector.value}`);
                            break;
                        case 'text':
                            elements = await this.page.$$(`text=${selector.value}`);
                            break;
                        case 'aria':
                            elements = await this.page.$$(`[aria-label="${selector.value}"]`);
                            break;
                        case 'data':
                            elements = await this.page.$$(`[data-testid="${selector.value}"]`);
                            break;
                    }
                    if (elements.length > 0) {
                        // Filter elements based on state requirements
                        const filteredElements = [];
                        for (const element of elements) {
                            let include = true;
                            if (query.waitForVisible && !(await element.isVisible())) {
                                include = false;
                            }
                            if (query.waitForEnabled && !(await element.isEnabled())) {
                                include = false;
                            }
                            if (include) {
                                filteredElements.push(element);
                            }
                        }
                        if (filteredElements.length > 0) {
                            return filteredElements;
                        }
                    }
                }
                catch (error) {
                    continue;
                }
            }
            // Wait before retry
            if (attempt < retryCount) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        return [];
    }
    /**
     * Check if an element is visible and in viewport
     */
    async isElementVisible(element) {
        try {
            return await element.isVisible();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if an element is enabled for interaction
     */
    async isElementEnabled(element) {
        try {
            return await element.isEnabled();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if an element is within the viewport
     */
    async isElementInViewport(element) {
        try {
            const boundingBox = await element.boundingBox();
            if (!boundingBox)
                return false;
            const viewport = await this.page.viewportSize();
            if (!viewport)
                return false;
            return (boundingBox.x >= 0 &&
                boundingBox.y >= 0 &&
                boundingBox.x + boundingBox.width <= viewport.width &&
                boundingBox.y + boundingBox.height <= viewport.height);
        }
        catch {
            return false;
        }
    }
}
