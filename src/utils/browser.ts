import { Browser, chromium } from "playwright";

// Global browser instance (following singleton pattern for resource management)
let browser: Browser | null = null;

/**
 * Initialize browser instance for element locator tool
 */
export async function initializeBrowser(): Promise<Browser> {
  if (!browser) {
    // Check for HEADLESS environment variable for local testing
    const headlessEnv = process.env.HEADLESS;
    const headlessMode = headlessEnv !== "false";
    console.log(`Environment HEADLESS="${headlessEnv}"`);
    console.log(
      `Launching browser in ${headlessMode ? "headless" : "headed"} mode`
    );

    browser = await chromium.launch({
      headless: headlessMode,
      // Additional options for local development
      ...(headlessMode
        ? {}
        : {
            devtools: false, // Set to true if you want DevTools open
            slowMo: 100, // Slow down actions for better visibility during testing
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-accelerated-2d-canvas",
              "--no-first-run",
              "--no-zygote",
              "--disable-gpu",
            ],
          }),
    });
  }
  return browser;
}

/**
 * Cleanup browser resources
 */
export async function cleanupBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
