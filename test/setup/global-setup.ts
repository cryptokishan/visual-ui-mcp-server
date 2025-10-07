import { config } from "dotenv";

// Load environment variables from .env files
// .env.local takes precedence over .env for local development
config({ path: ".env" });        // Load base defaults first
config({ path: ".env.local", override: true });  // Load local overrides second (higher priority)

import { TestServerManager } from "../helpers/test-server-manager";

export default async function () {
  console.log(
    "🚀 Global test setup: Starting MCP server via TestServerManager..."
  );

  const serverManager = TestServerManager.getInstance();

  // Start the server using the manager
  await serverManager.startServer();

  //console.log("✅ MCP server started successfully via TestServerManager");
  //console.log("📊 Server manager is ready for use in all tests");

  // Return teardown function for Vitest global setup
  return async () => {
    console.log(
      "🛑 Global test teardown: Stopping MCP server via TestServerManager..."
    );

    const serverManager = TestServerManager.getInstance();
    await serverManager.stopServer();

    // Reset the singleton for clean state between test runs
    TestServerManager.resetInstance();

    //console.log("✅ MCP server stopped and TestServerManager reset");
  };
}
