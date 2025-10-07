import { ElementHandle, Page } from "playwright";

// Wait options interface for utility functions
export interface WaitOptions {
  condition: string; // JS expression or selector
  timeout?: number;
  polling?: number | "raf";
}

export interface StabilityOptions {
  timeout?: number;
  checkNetworkIdle?: boolean;
  checkAnimations?: boolean;
  checkCustomCondition?: string;
}

export interface NavigationOptions extends StabilityOptions {
  expectedUrl?: string | RegExp;
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

  /**
   * Wait for page to reach stable state with enhanced checks
   */
  async waitForStableState(
    page: Page,
    options: StabilityOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    const timeout = options.timeout || 30000;
    const checkInterval = 100; // Check every 100ms

    while (Date.now() - startTime < timeout) {
      try {
        // Multiple stability criteria
        const checks = await Promise.all([
          this.checkDomStability(page),
          options.checkNetworkIdle !== false ? this.checkNetworkIdleQuick(page) : Promise.resolve(true),
          options.checkAnimations !== false ? this.checkAnimationStability(page) : Promise.resolve(true),
          options.checkCustomCondition ? this.checkCustomCondition(page, options.checkCustomCondition) : Promise.resolve(true)
        ]);

        const allChecksPass = checks.every(check => check === true);

        if (allChecksPass) {
          // Ensure stability persists for a short period
          await new Promise(resolve => setTimeout(resolve, 500));
          const finalCheck = await this.checkDomStability(page);

          if (finalCheck) {
            return; // Stability achieved
          }
        }
      } catch (error) {
        // Continue checking even if individual checks fail
        console.debug('Stability check failed, continuing:', error);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Page failed to reach stable state within ${timeout}ms`);
  }

  /**
   * Enhanced navigation waiting with stability checks
   */
  async waitForNavigation(
    page: Page,
    options: NavigationOptions = {}
  ): Promise<void> {
    const timeout = options.timeout || 30000;

    try {
      // Wait for basic navigation
      await page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 10000) });

      // If expected URL specified, wait for it
      if (options.expectedUrl) {
        await this.waitForUrlChange(page, options.expectedUrl, timeout);
      }

      // Wait for full stability after navigation
      await this.waitForStableState(page, options);

    } catch (error) {
      throw new Error(`Navigation failed: ${error}`);
    }
  }

  /**
   * Check DOM stability by monitoring mutations
   */
  private async checkDomStability(page: Page): Promise<boolean> {
    try {
      // Check that DOM mutations have settled
      const mutations = await page.evaluate(() => {
        let mutationCount = 0;
        const observer = new MutationObserver(() => mutationCount++);

        observer.observe(document.body || document, {
          childList: true,
          subtree: true,
          attributes: true
        });

        // Wait a short moment to capture mutations
        return new Promise<number>((resolve) => {
          setTimeout(() => {
            observer.disconnect();
            resolve(mutationCount);
          }, 100);
        });
      });

      // Allow small number of mutations (for dynamic content)
      return mutations < 10;

    } catch (error) {
      console.debug('DOM stability check failed:', error);
      return false;
    }
  }

  /**
   * Quick network idle check for stability monitoring
   */
  private async checkNetworkIdleQuick(page: Page): Promise<boolean> {
    try {
      // Quick network check - either already idle or becomes idle within 200ms
      const idlePromise = this.waitForNetworkIdle(page, 50);
      const timeoutPromise = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(true), 200)
      );

      await Promise.race([idlePromise, timeoutPromise]);
      return true;

    } catch (error) {
      // Network check too slow, assume busy for now
      console.debug('Network idle check timeout:', error);
      return false;
    }
  }

  /**
   * Check for running CSS animations/transitions
   */
  private async checkAnimationStability(page: Page): Promise<boolean> {
    try {
      const hasRunningAnimations = await page.evaluate(() => {
        const animatedElements = document.querySelectorAll('*');
        for (const el of animatedElements) {
          const computedStyle = getComputedStyle(el);
          const animations = computedStyle.animationName !== 'none' ||
                           computedStyle.transitionProperty !== 'none';

          if (animations) {
            const animationPlayState = computedStyle.animationPlayState;
            if (animationPlayState !== 'paused' && animationPlayState !== 'finished') {
              return true; // Animation is actively running
            }
          }
        }
        return false; // No active animations
      });

      return !hasRunningAnimations;

    } catch (error) {
      console.debug('Animation stability check failed:', error);
      return true; // Default to stable if check fails
    }
  }

  /**
   * Evaluate custom condition for stability
   */
  private async checkCustomCondition(page: Page, condition: string): Promise<boolean> {
    try {
      return await page.evaluate(condition);
    } catch (error) {
      console.debug('Custom condition check failed:', error);
      return false;
    }
  }
}

// Export default instance for backward compatibility
export const waitHelper = new WaitHelper();
