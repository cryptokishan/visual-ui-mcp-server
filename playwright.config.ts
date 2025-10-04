import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  outputDir: "./test/results",
  fullyParallel: false,
  retries: 0,
  workers: 2,
  reporter: [],
  use: {
    baseURL: "http://127.0.0.1:0",
    trace: "on-first-retry",
    headless: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./test/setup/global-setup.ts",
});
