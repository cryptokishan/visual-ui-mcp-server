import { Browser, chromium } from "playwright";
import { log } from "./logger.js";

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
    log.info(`Browser configuration: HEADLESS="${headlessEnv}" (${headlessMode ? "headless" : "headed"} mode)`);

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
 * Get standardized browser launch options based on HEADLESS environment variable
 */
export function getBrowserLaunchOptions(): { headless: boolean; args?: string[] } {
  // Check for HEADLESS environment variable for local testing
  const headlessEnv = process.env.HEADLESS;
  const headlessMode = headlessEnv !== "false";

  log.debug(`Browser launch options: HEADLESS="${headlessEnv}" (${headlessMode ? "headless" : "headed"} mode)`);

  const baseArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
  ];

  if (!headlessMode) {
    // Additional options for headed mode (visible browser)
    return {
      headless: false,
      args: [
        ...baseArgs,
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    };
  }

  // Headless mode
  return {
    headless: true,
    args: baseArgs,
  };
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
