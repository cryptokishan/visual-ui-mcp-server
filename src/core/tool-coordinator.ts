/**
 * Tool Coordinator for centralized page state management across ALL core modules
 * Provides coordinated instances with ElementLocator, PageStateManager, and related services
 * Ensures consistent behavior across FormOperations, JourneySimulator, and future tools
 */

import { Page } from "playwright";
import { AccessibilityTester } from "./accessibility-tester";
import { BrowserMonitor } from "./browser-monitor";
import { ElementLocator } from "./element-locator";
import { FormOperations } from "./form-handler";
import { JourneySimulator } from "./journey-simulator";
import { PageStateManager } from "./page-state-manager";
import { VisualTesting } from "./visual-testing";
import { WaitHelper } from "./wait-helper";

/**
 * Centralized tool coordinator that provides coordinated instances
 * to ALL core modules with consistent page state management and element location
 */
export class ToolCoordinator {
  private pageStateManager: PageStateManager;
  private waitHelper: WaitHelper;
  private elementLocator: ElementLocator;
  private visualTesting: VisualTesting;
  private accessibilityTester: AccessibilityTester;
  private browserMonitor: BrowserMonitor;

  constructor(private page: Page) {
    // Create core coordination infrastructure
    this.waitHelper = new WaitHelper();
    this.elementLocator = new ElementLocator();
    this.pageStateManager = new PageStateManager(
      this.waitHelper,
      this.elementLocator,
      this.page
    );

    // Initialize coordinated service instances
    this.visualTesting = new VisualTesting(this.page);
    this.accessibilityTester = new AccessibilityTester(this.page);
    this.browserMonitor = new BrowserMonitor(this.page);
  }

  /**
   * Get the centralized PageStateManager
   */
  getPageStateManager(): PageStateManager {
    return this.pageStateManager;
  }

  /**
   * Create coordinated FormOperations instance with ElementLocator
   */
  createFormOperations(): FormOperations {
    return new FormOperations(
      this.page,
      this.pageStateManager,
      this.elementLocator
    );
  }

  /**
   * Create coordinated JourneySimulator instance
   */
  createJourneySimulator(): JourneySimulator {
    return new JourneySimulator(this.page, {
      pageStateManager: this.pageStateManager,
    });
  }

  /**
   * Get coordinated VisualTesting instance
   */
  getVisualTesting(): VisualTesting {
    return this.visualTesting;
  }

  /**
   * Get coordinated AccessibilityTester instance
   */
  getAccessibilityTester(): AccessibilityTester {
    return this.accessibilityTester;
  }

  /**
   * Get coordinated BrowserMonitor instance
   */
  getBrowserMonitor(): BrowserMonitor {
    return this.browserMonitor;
  }

  /**
   * Get coordinated ElementLocator instance
   */
  getElementLocator(): ElementLocator {
    return this.elementLocator;
  }

  /**
   * Get coordinated WaitHelper instance
   */
  getWaitHelper(): WaitHelper {
    return this.waitHelper;
  }

  /**
   * Initialize page with coordinated state management
   */
  async initializePage(
    options: {
      url?: string;
      html?: string;
      waitForStable?: boolean;
    } = {}
  ): Promise<void> {
    const { url, html, waitForStable } = options;

    // Set content or navigate
    if (html) {
      await this.page.setContent(html, { timeout: 10000 });
    } else if (url) {
      if (url.startsWith("data:text/html,")) {
        const encodedHtml = url.substring("data:text/html,".length);
        const decodedHtml = decodeURIComponent(encodedHtml);
        await this.page.setContent(decodedHtml, { timeout: 10000 });
      } else {
        await this.page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
      }
    }

    // Wait for initial stability if requested
    if (waitForStable) {
      await this.pageStateManager.waitForInteractive();
    }
  }

  /**
   * Cleanup coordinated resources
   */
  cleanup(): void {
    this.pageStateManager.cleanup();
  }
}

/**
 * Factory function to create coordinated tool instances
 */
export function createToolCoordinator(page: Page): ToolCoordinator {
  return new ToolCoordinator(page);
}
