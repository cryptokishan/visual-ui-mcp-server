import { ElementHandle, Page } from "playwright";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementLocatorOptions {
  selector: string;
  timeout?: number;
  visibilityCheck?: boolean;
}

export class ElementLocator {
  private defaultTimeout = 10000;

  /**
   * Locates an element using Playwright's native selector engine.
   * Supports full Playwright selector syntax including CSS, XPath, text selectors,
   * compound selectors, shadow DOM, and iframes through selector chaining.
   */
  async locateElement(
    page: Page,
    options: ElementLocatorOptions
  ): Promise<ElementHandle | null> {
    const {
      selector,
      timeout = this.defaultTimeout,
      visibilityCheck = false,
    } = options;

    try {
      // Use Playwright's native locator and wait for element handle
      const locator = page.locator(selector);
      const element = await locator.elementHandle({ timeout });

      // Verify visibility and interactability if requested
      if (element && visibilityCheck) {
        const isInteractable = await this.verifyInteractable(element, page);
        if (!isInteractable) {
          await element.dispose();
          return null;
        }
      }

      console.log(`Element located using Playwright selector: ${selector}`);
      return element;
    } catch (error) {
      console.warn(`Failed to locate element with selector "${selector}": ${(error as Error).message}`);
      return null;
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
