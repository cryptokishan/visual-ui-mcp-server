#!/usr/bin/env node

// Visual UI Testing MCP Server - Entry point
// This is the new modularized version of the server

import { colors } from "./config/constants.js";
import { VisualUITestingServer } from "./server.js";

// Start the server
async function startServer() {
  try {
    const server = new VisualUITestingServer();
    await server.start();
  } catch (error) {
    console.error(
      `${colors.red}✗${colors.reset} ${colors.bright}${colors.red}Failed to start Visual UI Testing MCP Server:${colors.reset}`,
      error
    );
    process.exit(1);
  }
}

// Run the server
startServer().catch((error) => {
  console.error(
    `${colors.red}✗${colors.reset} ${colors.bright}${colors.red}Failed to start Visual UI Testing MCP Server:${colors.reset}`,
    error
  );
  process.exit(1);
});
