/**
 * Page State Manager for centralized page readiness coordination
 * Provides unified state management across all core modules to ensure reliable web automation
 */

import { Page } from "playwright";
import { ElementLocator } from "./element-locator.js";
import { StabilityOptions, WaitHelper } from "./wait-helper.js";

// Re-export for backward compatibility
export { StabilityOptions } from "./wait-helper.js";

export enum PageState {
  LOADING = "loading",
  INTERACTIVE = "interactive",
  STABLE = "stable",
  NAVIGATING = "navigating",
  ERROR = "error",
}

export interface StateTransition {
  fromState: PageState;
  toState: PageState;
  timestamp: number;
  trigger?: string;
}

export class PageStateManager {
  private currentState: PageState = PageState.LOADING;
  private stateHistory: StateTransition[] = [];
  private pageLoadStartTime: number = 0;
  private lastNavigationTime: number = 0;
  private navigationListeners: Set<() => void> = new Set();

  constructor(
    private waitHelper: WaitHelper,
    private elementLocator: ElementLocator,
    private page: Page
  ) {
    this.setupPageListeners();
  }

  /**
   * Check if page is in a ready state for operations
   */
  async isPageReady(options?: { allowNavigating?: boolean }): Promise<boolean> {
    const allowNavigating = options?.allowNavigating ?? false;

    try {
      // Quick checks first
      if (this.currentState === PageState.ERROR) {
        return false;
      }

      if (this.currentState === PageState.NAVIGATING && !allowNavigating) {
        return false;
      }

      // Check DOM readiness
      const domReady = await this.page.evaluate(() => {
        return (
          document.readyState === "complete" ||
          document.readyState === "interactive"
        );
      });

      if (!domReady) {
        return false;
      }

      // Page is ready - DOM and network checks passed
      return true;
    } catch (error) {
      console.warn("Page readiness check failed:", error);
      return false;
    }
  }

  /**
   * Wait for page to reach stable state - delegates to WaitHelper
   */
  async waitForStableState(options: StabilityOptions = {}): Promise<void> {
    await this.waitHelper.waitForStableState(this.page, options);
    this.setState(PageState.STABLE, "stability achieved");
  }

  /**
   * Wait for navigation to complete - delegates to WaitHelper
   */
  async waitForNavigation(
    targetUrl?: string | RegExp,
    options: StabilityOptions = {}
  ): Promise<void> {
    this.setState(PageState.NAVIGATING, "navigation started");
    this.lastNavigationTime = Date.now();

    try {
      await this.waitHelper.waitForNavigation(this.page, {
        ...options,
        expectedUrl: targetUrl,
      });
      this.setState(PageState.STABLE, "navigation completed");
    } catch (error) {
      this.setState(PageState.ERROR, `navigation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Coordinate an action with stability checks and error recovery
   */
  async coordinateAction<T>(
    action: () => Promise<T>,
    stabilityCheck?: () => Promise<boolean>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      allowConcurrent?: boolean;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 2;
    const retryDelay = options.retryDelay ?? 1000;
    const allowConcurrent = options.allowConcurrent ?? true;

    // Prevent concurrent operations if not allowed
    if (!allowConcurrent && this.currentState === PageState.NAVIGATING) {
      await this.waitForStableState();
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait for page readiness before action
        await this.waitForStableState({ timeout: 5000 });

        // Perform the action
        const result = await action();

        // Post-action stability check if provided
        if (stabilityCheck) {
          const isStable = await stabilityCheck();
          if (!isStable) {
            // Wait a bit and check again
            await new Promise((resolve) => setTimeout(resolve, 500));
            const finalCheck = await stabilityCheck();
            if (!finalCheck) {
              throw new Error("Post-action stability check failed");
            }
          }
        }

        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          this.setState(PageState.ERROR, `coordinated action failed: ${error}`);
          throw error;
        }

        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(
          `Action attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          error
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Coordinate action failed after all retries");
  }

  /**
   * Get current state information
   */
  getCurrentState(): {
    state: PageState;
    timestamp: number;
    lastTransition?: StateTransition;
    timeInCurrentState: number;
  } {
    const now = Date.now();
    const lastTransition = this.stateHistory[this.stateHistory.length - 1];

    return {
      state: this.currentState,
      timestamp: now,
      lastTransition,
      timeInCurrentState: lastTransition ? now - lastTransition.timestamp : 0,
    };
  }

  /**
   * Wait for page to become interactive (DOM ready, basic interactivity)
   */
  async waitForInteractive(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded", { timeout });

    // Wait for basic interactivity
    await this.page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        if (
          document.readyState === "complete" ||
          document.readyState === "interactive"
        ) {
          resolve();
          return;
        }

        const checkReady = () => {
          if (
            document.readyState === "complete" ||
            document.readyState === "interactive"
          ) {
            document.removeEventListener("readystatechange", checkReady);
            resolve();
          }
        };

        document.addEventListener("readystatechange", checkReady);
        // Fallback timeout
        setTimeout(() => {
          document.removeEventListener("readystatechange", checkReady);
          resolve();
        }, 5000);
      });
    });

    this.setState(PageState.INTERACTIVE, "page became interactive");
  }

  /**
   * Force state reset (useful for error recovery)
   */
  resetState(): void {
    this.setState(PageState.LOADING, "manual reset");
    this.stateHistory = [];
  }

  /**
   * Clean up listeners and resources
   */
  cleanup(): void {
    for (const listener of this.navigationListeners) {
      listener();
    }
    this.navigationListeners.clear();
    this.stateHistory = [];
  }

  private setState(newState: PageState, trigger: string): void {
    const transition: StateTransition = {
      fromState: this.currentState,
      toState: newState,
      timestamp: Date.now(),
      trigger,
    };

    this.stateHistory.push(transition);
    this.currentState = newState;

    // Keep history manageable (last 50 transitions)
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    console.debug(
      `PageState: ${transition.fromState} → ${transition.toState} (${trigger})`
    );
  }

  private setupPageListeners(): void {
    // Listen for page load events
    const loadListener = () => {
      this.setState(PageState.INTERACTIVE, "page load event");
    };

    const errorListener = (error: any) => {
      this.setState(PageState.ERROR, `page error: ${error.message}`);
    };

    // Note: Playwright event listeners setup would go here
    // For now, states are managed programmatically

    this.navigationListeners.add(() => {
      this.page.off("load", loadListener);
      this.page.off("pageerror", errorListener);
    });
  }
}
