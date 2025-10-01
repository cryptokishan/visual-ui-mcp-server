import { Page, ElementHandle } from 'playwright';
export interface ElementQuery {
    selectors: Array<{
        type: 'css' | 'xpath' | 'text' | 'aria' | 'data';
        value: string;
        priority?: number;
    }>;
    timeout?: number;
    waitForVisible?: boolean;
    waitForEnabled?: boolean;
    retryCount?: number;
}
export declare class ElementLocator {
    private page;
    private defaultTimeout;
    private defaultRetryCount;
    constructor(page: Page);
    /**
     * Find a single element using multiple fallback strategies
     */
    findElement(query: ElementQuery): Promise<ElementHandle | null>;
    /**
     * Wait for an element to appear with multiple fallback strategies
     */
    waitForElement(query: ElementQuery): Promise<ElementHandle>;
    /**
     * Find multiple elements using the first successful selector strategy
     */
    findElements(query: ElementQuery): Promise<ElementHandle[]>;
    /**
     * Check if an element is visible and in viewport
     */
    isElementVisible(element: ElementHandle): Promise<boolean>;
    /**
     * Check if an element is enabled for interaction
     */
    isElementEnabled(element: ElementHandle): Promise<boolean>;
    /**
     * Check if an element is within the viewport
     */
    isElementInViewport(element: ElementHandle): Promise<boolean>;
}
