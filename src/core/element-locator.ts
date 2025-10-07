import { ElementHandle, Page } from "playwright";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementLocatorOptions {
  selector: string;
  type?: "css" | "xpath" | "text" | "aria" | "data";
  timeout?: number;
  retryCount?: number;
  visibilityCheck?: boolean;
}

export class ElementLocator {
  private defaultTimeout = 10000;

  /**
   * Enhanced element location with multi-strategy fallback.
   * Leverages Playwright's built-in auto-waiting and retry mechanisms.
   * Tries selectors in priority order: accessibility > semantic > structural > test-specific.
   */
  async locate(
    page: Page,
    options: ElementLocatorOptions
  ): Promise<ElementHandle | null> {
    const strategies = this.generateStrategies(options);

    for (const strategy of strategies) {
      try {
        console.log(
          `Trying strategy: ${strategy.type} - "${strategy.selector}"`
        );
        const element = await this.tryStrategy(page, strategy, options);

        if (element) {
          console.log(
            `Element located using strategy: ${strategy.type} - "${strategy.selector}"`
          );
          return element;
        }
      } catch (error) {
        //console.warn(`Strategy ${strategy.type} failed: ${(error as Error).message}`);
      }
    }

    return null;
  }

  /**
   * Waits for element to be available using Playwright's built-in waiting.
   */
  async waitForElement(
    page: Page,
    options: ElementLocatorOptions
  ): Promise<ElementHandle> {
    const element = await this.locate(page, options);
    if (!element) {
      throw new Error(
        `Element not found using any strategy for selector: ${options.selector}`
      );
    }
    return element;
  }

  /**
   * Locates an element using Playwright's native selector engine.
   * Supports full Playwright selector syntax and auto-waiting capabilities.
   */
  async locateElement(
    page: Page,
    options: ElementLocatorOptions
  ): Promise<ElementHandle | null> {
    // For backward compatibility, treat as CSS selector using Playwright's auto-waiting
    try {
      const locator = page.locator(options.selector);
      const element = await locator.elementHandle({
        timeout: options.timeout || this.defaultTimeout,
      });

      if (element && options.visibilityCheck) {
        const isInteractable = await this.verifyInteractable(element, page);
        if (!isInteractable) {
          await element.dispose();
          return null;
        }
      }

      return element;
    } catch (error) {
      console.warn(
        `Failed to locate element with selector "${options.selector}": ${
          (error as Error).message
        }`
      );
      return null;
    }
  }

  /**
   * Generates intelligent fallback strategies based on the input selector and type.
   * Uses Playwright's built-in locators for better reliability and auto-waiting.
   */
  private generateStrategies(
    options: ElementLocatorOptions
  ): Array<{ type: string; selector: string; useBuiltInLocator?: boolean }> {
    const { selector, type } = options;
    const strategies: Array<{
      type: string;
      selector: string;
      useBuiltInLocator?: boolean;
    }> = [];

    // If a specific type is provided, use appropriate strategy
    if (type) {
      switch (type) {
        case "text":
          strategies.push({
            type: "text-partial",
            selector,
            useBuiltInLocator: true,
          });
          break;
        case "data":
          const testid = selector.match(/data-testid=['"]([^'"]*)['"]/);
          strategies.push({
            type: "testid-builtin",
            selector: testid ? testid[1] : selector,
            useBuiltInLocator: true,
          });
          break;
        default:
          strategies.push({ type, selector });
      }
      return strategies;
    }

    // Detect selector type to prioritize correct strategies
    if (selector.includes("//") || selector.includes("/")) {
      strategies.push({ type: "xpath", selector });
      strategies.push({ type: "css", selector });
    } else if (selector.includes("[") || selector.includes(">>")) {
      strategies.push({ type: "css", selector });
      strategies.push({ type: "xpath", selector });
    } else {
      // Likely text selector
      strategies.push({
        type: "text-partial",
        selector,
        useBuiltInLocator: true,
      });

      // Fallbacks
      strategies.push({ type: "css", selector });
      strategies.push({ type: "xpath", selector });
    }

    return strategies;
  }

  /**
   * Attempts to locate element using the given strategy, leveraging Playwright's built-in locators.
   */
  private async tryStrategy(
    page: Page,
    strategy: { type: string; selector: string; useBuiltInLocator?: boolean },
    options: ElementLocatorOptions
  ): Promise<ElementHandle | null> {
    const timeout = options.timeout || this.defaultTimeout;

    try {
      let locator;

      if (strategy.useBuiltInLocator) {
        // Use Playwright's built-in intelligent locators with auto-waiting
        switch (strategy.type) {
          case "aria-role":
            locator = page.getByRole(strategy.selector as any);
            break;
          case "aria-text":
            locator = page.getByRole("button", { name: strategy.selector });
            break;
          case "aria-role-clickable":
            // Try buttons first, then links for clickable text
            locator = page.getByRole("button", { name: strategy.selector });
            try {
              const element = await locator.elementHandle({ timeout });
              return element; // Return directly if found
            } catch {}
            // If button not found, try link
            locator = page.getByRole("link", { name: strategy.selector });
            break;
          case "aria-label":
            locator = page.getByLabel(strategy.selector);
            break;
          case "text-exact":
            locator = page.getByText(strategy.selector, { exact: true });
            break;
          case "text-partial":
            locator = page.getByText(strategy.selector);
            break;
          case "testid":
            locator = page.getByTestId(strategy.selector);
            break;
          case "data-cy":
            locator = page.locator(`[data-cy="${strategy.selector}"]`);
            break;
          default:
            locator = page.locator(strategy.selector);
        }
      } else {
        // Traditional locator
        locator = page.locator(strategy.selector);
      }

      const element = await locator.elementHandle({ timeout });

      // Additional visibility/interactability check if requested
      if (element && options.visibilityCheck) {
        const isInteractable = await this.verifyInteractable(element, page);
        if (!isInteractable) {
          await element.dispose();
          return null;
        }
      }

      return element;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifies if the element is visible and interactable.
   */
  private async verifyInteractable(
    element: ElementHandle,
    page: Page
  ): Promise<boolean> {
    try {
      await element.waitForElementState("visible", { timeout: 1000 });
      await element.waitForElementState("stable", { timeout: 1000 });

      // Get actual viewport size
      const viewport = await page.viewportSize();
      const viewportWidth = viewport?.width || 1280;
      const viewportHeight = viewport?.height || 720;

      // Check if in viewport
      const box: BoundingBox | null | undefined = await element.boundingBox();
      if (!box) return false;

      // Check if element is within viewport bounds
      if (
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > viewportWidth ||
        box.y + box.height > viewportHeight
      ) {
        // Scroll into view if needed
        await element.scrollIntoViewIfNeeded();
        const newBox = await element.boundingBox();
        if (!newBox || newBox.y < 0) return false;
      }

      // Dispatch focus event to check if focusable (for interactability)
      await element.focus().catch(() => false);
      return true;
    } catch (error) {
      return false;
    }
  }
}
