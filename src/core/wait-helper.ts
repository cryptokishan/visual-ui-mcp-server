import { ElementHandle, Page } from "playwright";

// Wait options interface for utility functions
export interface WaitOptions {
  condition: string; // JS expression or selector
  timeout?: number;
  polling?: number | "raf";
}

// Core wait helper business logic - moved from utils to core for proper architecture
export class WaitHelper {
  private defaultTimeout: number = 10000; // 10 seconds

  /**
   * Wait for content loading and DOM changes using various detection strategies
   */
  async waitForContent(page: Page, options: WaitOptions): Promise<void> {
    const timeout = options.timeout || this.defaultTimeout;

    if (options.condition.startsWith("//") || options.condition.includes("@")) {
      // XPath condition
      await page.waitForFunction(
        (xpath) => {
          const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          return result.singleNodeValue !== null;
        },
        options.condition,
        { timeout, polling: options.polling || "raf" }
      );
    } else if (
      options.condition.startsWith(".") ||
      options.condition.includes("#") ||
      options.condition.includes("[")
    ) {
      // CSS selector condition
      await page.waitForSelector(options.condition, {
        timeout,
        state: "attached",
      });
    } else {
      // JavaScript expression condition
      await page.waitForFunction(
        new Function("return " + options.condition) as any,
        { timeout, polling: options.polling || "raf" }
      );
    }
  }

  /**
   * Wait for network idle - no network requests for specified period
   */
  async waitForNetworkIdle(page: Page, idleTime: number = 500): Promise<void> {
    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;

      const checkIdle = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          page.off("request", checkIdle);
          page.off("response", checkIdle);
          resolve();
        }, idleTime);
      };

      page.on("request", checkIdle);
      page.on("response", checkIdle);

      // Start the timer
      checkIdle();
    });
  }

  /**
   * Wait for JavaScript execution completion by monitoring script activity
   */
  async waitForJSExecution(
    page: Page,
    timeout: number = this.defaultTimeout
  ): Promise<void> {
    // Wait for document ready state
    await page.waitForFunction(() => document.readyState === "complete", {
      timeout,
    });

    // Wait for any pending script executions
    await page.waitForFunction(
      () => {
        // Check if there are any scripts currently executing
        const scripts = Array.from(document.scripts);
        const executingScripts = scripts.filter(
          (script) =>
            (script.src && !script.hasAttribute("data-loaded")) ||
            (script.textContent && script.textContent.includes("setTimeout")) ||
            (script.textContent && script.textContent.includes("setInterval"))
        );

        // Mark scripts as loaded
        scripts.forEach((script) => {
          if (script.src) script.setAttribute("data-loaded", "true");
        });

        return executingScripts.length === 0;
      },
      { timeout: timeout / 2 }
    ); // Shorter timeout for JS checks
  }

  /**
   * Wait for CSS animations and transitions to complete
   */
  async waitForAnimation(
    elementHandle: ElementHandle,
    timeout: number = this.defaultTimeout
  ): Promise<void> {
    await elementHandle.waitForElementState("stable", { timeout });
  }

  /**
   * Wait for custom JavaScript conditions to be met
   */
  async waitForCustom(
    page: Page,
    expression: string,
    timeout: number = this.defaultTimeout
  ): Promise<any> {
    return await page.waitForFunction(
      new Function("return " + expression) as any,
      { timeout }
    );
  }

  /**
   * Wait for URL changes (useful for SPA routing)
   */
  async waitForUrlChange(
    page: Page,
    expectedUrlPattern?: RegExp | string,
    timeout: number = this.defaultTimeout
  ): Promise<void> {
    const initialUrl = page.url();

    const args = [initialUrl, expectedUrlPattern];
    await page.waitForFunction(
      () => {
        const [initial, expected] = arguments as any;
        const currentUrl = window.location.href;
        if (expected) {
          if (typeof expected === "string") {
            return currentUrl !== initial && currentUrl === expected;
          } else {
            return currentUrl !== initial && expected.test(currentUrl);
          }
        }
        return currentUrl !== initial;
      },
      args,
      { timeout }
    );
  }

  /**
   * Comprehensive wait strategy combining multiple conditions
   */
  async waitForPageLoad(
    page: Page,
    options: {
      networkIdle?: boolean;
      jsExecution?: boolean;
      urlChange?: boolean;
      timeout?: number;
    } = {}
  ): Promise<void> {
    const timeout = options.timeout || this.defaultTimeout;

    // Always wait for DOM content loaded first
    await page.waitForLoadState("domcontentloaded", { timeout });

    // Wait for network idle if requested
    if (options.networkIdle) {
      await this.waitForNetworkIdle(page);
    }

    // Wait for JS execution completion if requested
    if (options.jsExecution) {
      await this.waitForJSExecution(page, timeout);
    }

    // Wait for URL change if requested (useful for SPAs)
    if (options.urlChange) {
      await this.waitForUrlChange(page);
    }

    // Final visual stability check
    await page.waitForLoadState("networkidle", { timeout: timeout / 2 });
  }
}

// Export default instance for backward compatibility
export const waitHelper = new WaitHelper();
