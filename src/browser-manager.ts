import { Browser, chromium, Page, errors as playwrightErrors } from "playwright";
import { BrowserError, TimeoutError } from "./index.js";

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launchBrowser(args: any) {
    try {
      const {
        url,
        headless = false,
        viewport = { width: 1280, height: 720 },
      } = args;

      // Close existing browser if any
      if (this.browser) {
        await this.browser.close();
      }

      // Launch new browser
      this.browser = await chromium.launch({
        headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      });

      // Create new page
      this.page = await this.browser.newPage();

      // Set viewport
      await this.page.setViewportSize(viewport);

      // Navigate to URL
      await this.page.goto(url, { waitUntil: "networkidle" });

      return {
        content: [
          {
            type: "text",
            text: `Browser launched successfully and navigated to ${url}. Viewport: ${viewport.width}x${viewport.height}`,
          },
        ],
      };
    } catch (error) {
      throw new BrowserError(
        `Failed to launch browser: ${(error as Error).message}`,
        "Ensure browser dependencies are installed and try again. Check system resources and network connectivity.",
        true
      );
    }
  }

  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }

      return {
        content: [
          {
            type: "text",
            text: "Browser closed successfully",
          },
        ],
      };
    } catch (error) {
      throw new BrowserError(
        `Failed to close browser: ${(error as Error).message}`,
        "Browser may have already been closed or encountered an internal error.",
        false
      );
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  async waitForLoad(timeout = 30000) {
    if (!this.page) {
      throw new BrowserError(
        "No active page available for load waiting",
        "Launch the browser first before attempting to wait for page load.",
        false
      );
    }

    try {
      await this.page.waitForLoadState("networkidle", { timeout });
    } catch (error) {
      // Only throw TimeoutError for Playwright timeout, otherwise wrap as BrowserError
      const err: any = error;
      if (
        (playwrightErrors && err instanceof playwrightErrors.TimeoutError) ||
        (err && err.name === "TimeoutError")
      ) {
        throw new TimeoutError(
          `Page load timed out after ${timeout}ms`,
          "The page may be taking too long to load. Try increasing the timeout or check network connectivity.",
          true
        );
      } else {
        throw new BrowserError(
          `Page load failed: ${(err && err.message) || err}`,
          "An unexpected error occurred while waiting for the page to load. See error details for more information.",
          false
        );
      }
    }
  }

  async waitForSelector(selector: string, timeout = 5000) {
    if (!this.page) {
      throw new BrowserError(
        "No active page available for selector waiting",
        "Launch the browser first before attempting to wait for selectors.",
        false
      );
    }

    try {
      await this.page.waitForSelector(selector, { timeout });
    } catch (error) {
      const err: any = error;
      if (
        (playwrightErrors && err instanceof playwrightErrors.TimeoutError) ||
        (err && err.name === "TimeoutError")
      ) {
        throw new TimeoutError(
          `Selector \"${selector}\" not found within ${timeout}ms. Original error: ${(err && err.message) || err}`,
          "The element may not exist on the page, or the page may not be fully loaded. Try a different selector or increase the timeout.",
          true
        );
      } else if (err instanceof Error) {
        throw new BrowserError(
          `Selector wait failed: ${err.message}`,
          "An unexpected error occurred while waiting for the selector. See error details for more information.",
          false
        );
      } else {
        throw error;
      }
    }
  }
}

export const browserManager = new BrowserManager();
