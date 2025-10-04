/**
 * Tool Registry - Centralized tool management for MCP server
 * Provides organized registration and management of all MCP tools
 */

// src/tool-registry.ts - Centralized MCP tool registration management
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { accessibilityTesterTool } from "./tool/accessibility-tester-tool.js";
import { browserMonitorTool } from "./tool/browser-monitor-tool.js";
import { elementLocatorTool } from "./tool/element-locator-tool.js";
import { formHandlerTool } from "./tool/form-handler-tool.js";

import { journeySimulatorTool } from "./tool/journey-simulator-tool.js";
import { visualTestingTool } from "./tool/visual-testing-tool.js";
import { waitHelperTool } from "./tool/wait-helper-tool.js";
import type { McpToolInfo } from "./types/mcp.js";
import { log } from "./utils/logger.js";

export type ToolRegistryEntry = {
  info: McpToolInfo;
  name: string;
  description: string;
};

export type ToolRegistry = Record<string, ToolRegistryEntry>;

/**
 * Centralized tool registry - pre-computed during module initialization for optimal performance
 * The IIFE functions execute ONCE when module loads, caching tool info for fast runtime access
 */
export const toolRegistry: ToolRegistry = {
  accessibilityTester: (() => {
    log.debug("Pre-computing accessibilityTester tool info");
    const info = accessibilityTesterTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),
  elementLocator: (() => {
    log.debug("Pre-computing elementLocator tool info");
    const info = elementLocatorTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),
  formHandler: (() => {
    log.debug("Pre-computing formHandler tool info");
    const info = formHandlerTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),
  waitHelper: (() => {
    log.debug("Pre-computing waitHelper tool info");
    const info = waitHelperTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),
  browserMonitor: (() => {
    log.debug("Pre-computing browserMonitor tool info");
    const info = browserMonitorTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),
  visualTesting: (() => {
    log.debug("Pre-computing visualTesting tool info");
    const info = visualTestingTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),

  journeySimulator: (() => {
    log.debug("Pre-computing journeySimulator tool info");
    const info = journeySimulatorTool.getRegistrationInfo(); // ✅ Called once at module load
    return { info, name: info.name, description: info.description };
  })(),
} as const;

/**
 * Configure which tools to register by default
 */
const AVAILABLE_TOOLS = Object.keys(toolRegistry);

/**
 * Private helper to register a single tool with proper error handling
 */
function registerTool(server: McpServer, toolKey: string): boolean {
  const tool = toolRegistry[toolKey];
  if (!tool) {
    log.warn(`Tool '${toolKey}' not found in registry`);
    return false;
  }

  try {
    const searializedToolResponse = server.registerTool(
      tool.info.name,
      {
        title: tool.info.title,
        description: tool.info.description,
        inputSchema: tool.info.inputSchema,
      },
      tool.info.handler
    );
    log.info(`${tool.name} registered successfully`);
    return searializedToolResponse !== null;
  } catch (error) {
    log.error(`Failed to register ${tool.name}`, error);
    return false;
  }
}

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  const registeredCount = AVAILABLE_TOOLS.reduce((count, toolKey) => {
    return count + (registerTool(server, toolKey) ? 1 : 0);
  }, 0);

  const failedCount = AVAILABLE_TOOLS.length - registeredCount;
  log.info(
    `MCP tools registered: ${registeredCount} successful, ${failedCount} failed`
  );
}

export function registerTools(server: McpServer, toolKeys: string[]): void {
  const registeredCount = toolKeys.reduce((count, toolKey) => {
    return count + (registerTool(server, toolKey) ? 1 : 0);
  }, 0);

  const failedCount = toolKeys.length - registeredCount;
  log.info(
    `MCP tools registered: ${registeredCount} successful, ${failedCount} failed`
  );
}

/**
 * Get list of all available tool names
 */
export function getAvailableToolNames(): string[] {
  return Object.values(toolRegistry).map((tool) => tool.name);
}

/**
 * Get tool info by name (useful for debugging/testing)
 */
export function getToolInfo(toolName: string) {
  return Object.values(toolRegistry).find((tool) => tool.name === toolName);
}
