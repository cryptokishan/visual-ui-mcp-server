import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 15000,
    setupFiles: ["./test/utils/test-setup.ts"],
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules", "dist", "logs", "screenshots"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "test/",
        "dist/",
        "logs/",
        "screenshots/",
        "**/*.d.ts",
        "**/*.config.ts",
      ],
    },
    reporters: ["verbose", "json", "html"],
    outputFile: {
      json: "./coverage/test-results.json",
      html: "./coverage/test-results.html",
    },
  },
});
