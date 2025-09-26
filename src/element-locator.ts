import { Page, ElementHandle } from 'playwright';
import { ElementLocatorError, TimeoutError } from './index.js';

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

export class ElementLocator {
  private page: Page;
  private defaultTimeout: number = 10000;
  private defaultRetryCount: number = 3;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Find a single element using multiple fallback strategies
   */
  async findElement(query: ElementQuery): Promise<ElementHandle | null> {
    const timeout = query.timeout || this.defaultTimeout;
    const retryCount = query.retryCount || this.defaultRetryCount;

    // Sort selectors by priority (lower number = higher priority)
    const sortedSelectors = query.selectors.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      for (const selector of sortedSelectors) {
        try {
          let element: ElementHandle | null = null;

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
        } catch (error) {
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
  async waitForElement(query: ElementQuery): Promise<ElementHandle> {
    const timeout = query.timeout || this.defaultTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = await this.findElement(query);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new ElementLocatorError(
      `Element not found within ${timeout}ms using any of the provided selectors`,
      "The element may not exist on the page, or the page may not be fully loaded. Try different selectors, increase the timeout, or ensure the page has finished loading.",
      true
    );
  }

  /**
   * Find multiple elements using the first successful selector strategy
   */
  async findElements(query: ElementQuery): Promise<ElementHandle[]> {
    const timeout = query.timeout || this.defaultTimeout;
    const retryCount = query.retryCount || this.defaultRetryCount;

    // Sort selectors by priority
    const sortedSelectors = query.selectors.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      for (const selector of sortedSelectors) {
        try {
          let elements: ElementHandle[] = [];

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
        } catch (error) {
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
  async isElementVisible(element: ElementHandle): Promise<boolean> {
    try {
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is enabled for interaction
   */
  async isElementEnabled(element: ElementHandle): Promise<boolean> {
    try {
      return await element.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is within the viewport
   */
  async isElementInViewport(element: ElementHandle): Promise<boolean> {
    try {
      const boundingBox = await element.boundingBox();
      if (!boundingBox) return false;

      const viewport = await this.page.viewportSize();
      if (!viewport) return false;

      return (
        boundingBox.x >= 0 &&
        boundingBox.y >= 0 &&
        boundingBox.x + boundingBox.width <= viewport.width &&
        boundingBox.y + boundingBox.height <= viewport.height
      );
    } catch {
      return false;
    }
  }
}
