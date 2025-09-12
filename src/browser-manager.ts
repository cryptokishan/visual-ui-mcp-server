import { Browser, chromium, Page } from "playwright";

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
      throw new Error(`Failed to launch browser: ${(error as Error).message}`);
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
      throw new Error(`Failed to close browser: ${(error as Error).message}`);
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
      throw new Error("No active page. Launch browser first.");
    }

    await this.page.waitForLoadState("networkidle", { timeout });
  }

  async waitForSelector(selector: string, timeout = 5000) {
    if (!this.page) {
      throw new Error("No active page. Launch browser first.");
    }

    await this.page.waitForSelector(selector, { timeout });
  }
}

export const browserManager = new BrowserManager();
