// Tool request handlers implementation

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import fs from "fs-extra";
import * as path from "path";

// Import our tool modules
import { BackendMocker } from "../backend-mocker.js";
import { browserManager } from "../browser-manager.js";
import { BrowserMonitor } from "../browser-monitor.js";
import { ElementLocator } from "../element-locator.js";
import { FormHandler } from "../form-handler.js";
import { JourneySimulator } from "../journey-simulator.js";
import { PerformanceMonitor } from "../performance-monitor.js";
import { uiInteractions } from "../ui-interactions.js";
import { visualTesting } from "../visual-testing.js";

// Import utilities and types
import { DEFAULT_RETRY_CONFIG, DIRECTORIES } from "../config/constants.js";
import { AgentFriendlyError, FormField } from "../types/interfaces.js";
import { Logger, updateBrowserState, validateArgs } from "../utils/helpers.js";

// Tool handler parameters interface
export interface ToolHandlerContext {
  server: Server;
  logger: Logger;
  elementLocator?: ElementLocator | null;
  formHandler?: FormHandler | null;
  browserMonitor?: BrowserMonitor | null;
  journeySimulator?: JourneySimulator | null;
  performanceMonitor?: PerformanceMonitor | null;
  backendMocker?: BackendMocker | null;
}

// Helper functions for browser state validation
export function validateBrowserState(
  logger: Logger,
  operation: string,
  requiresActivePage = true
): void {
  const state = logger.getSessionState();

  if (!state.browserLaunched) {
    throw new AgentFriendlyError(
      "BROWSER_NOT_LAUNCHED",
      `Browser not launched. Cannot perform operation: ${operation}`,
      'Call "launch_browser" first to start a browser session.',
      false
    );
  }

  if (requiresActivePage) {
    const page = browserManager.getPage();
    if (!page) {
      throw new AgentFriendlyError(
        "BROWSER_PAGE_UNAVAILABLE",
        `Browser page unavailable. Cannot perform operation: ${operation}`,
        "The browser page may have been closed. Try launching the browser again.",
        false
      );
    }
  }
}

export function validateMonitoringState(
  logger: Logger,
  operation: string,
  requiresActive = true
): void {
  const state = logger.getSessionState();

  if (requiresActive && !state.monitoringActive) {
    throw new AgentFriendlyError(
      "MONITORING_NOT_ACTIVE",
      `Browser monitoring not active. Cannot perform operation: ${operation}`,
      'Start browser monitoring first with "start_browser_monitoring".',
      false
    );
  }

  if (!requiresActive && state.monitoringActive) {
    throw new AgentFriendlyError(
      "MONITORING_ALREADY_ACTIVE",
      `Browser monitoring already active. Cannot perform operation: ${operation}`,
      'Stop current monitoring with "stop_browser_monitoring" before starting new session.',
      false
    );
  }
}

// Retry logic wrapper
function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  logger: Logger,
  config = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  return (async () => {
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry for non-retryable errors
        if (error instanceof AgentFriendlyError && !error.canRetry) {
          throw error;
        }

        if (attempt === config.maxAttempts) {
          logger.error(
            `${operationName} failed after ${attempt} attempts: ${lastError.message}`
          );
          throw new AgentFriendlyError(
            "OPERATION_FAILED",
            `${operationName} failed after ${attempt} attempts: ${lastError.message}`,
            `Operation failed consistently. Check logs for details.`,
            false
          );
        }

        const delay =
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        logger.debug(
          `Retry ${attempt}/${config.maxAttempts} for ${operationName} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  })();
}

// ============ BROWSER MANAGEMENT HANDLERS ============

export async function handleLaunchBrowser(
  args: any,
  logger: Logger,
  context: ToolHandlerContext
) {
  return withRetry(
    async () => {
      validateArgs(args, ["url"], "launch_browser");

      const result = await browserManager.launchBrowser(args);
      updateBrowserState(logger, true);

    // Initialize ElementLocator, FormHandler, JourneySimulator, and BackendMocker with the current page
    const page = browserManager.getPage();
    if (page) {
      context.elementLocator = new ElementLocator(page);
      context.formHandler = new FormHandler(page, context.elementLocator);
      context.journeySimulator = new JourneySimulator(page);
      const backendMocker = new BackendMocker();
      context.backendMocker = backendMocker;
      // Store in server for persistence across tool calls
      (context.server as any).setBackendMocker?.(backendMocker);
    }
      return result;
    },
    "launch_browser",
    logger
  );
}

export async function handleCloseBrowser(args: any, logger: Logger) {
  const result = await browserManager.closeBrowser();
  updateBrowserState(logger, false, false, false); // Reset all states
  return result;
}

// ============ ELEMENT INTERACTION HANDLERS ============

export async function handleFindElement(
  args: any,
  context: ToolHandlerContext
) {
  if (!context.elementLocator) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  const element = await context.elementLocator.findElement(args as any);
  return {
    content: [
      {
        type: "text",
        text: element ? "Element found successfully" : "Element not found",
      },
    ],
  };
}

export async function handleFillForm(args: any, context: ToolHandlerContext) {
  if (!context.formHandler) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || !args.fields || !Array.isArray(args.fields)) {
    throw new Error(
      "Fields parameter is required for fill_form and must be an array"
    );
  }
  await context.formHandler.fillForm(args.fields as FormField[]);
  return {
    content: [
      {
        type: "text",
        text: `Form filled successfully with ${args.fields.length} fields`,
      },
    ],
  };
}

export async function handleSubmitForm(args: any, context: ToolHandlerContext) {
  if (!context.formHandler) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  await context.formHandler.submitForm(args || {});
  return {
    content: [
      {
        type: "text",
        text: "Form submitted successfully",
      },
    ],
  };
}

// ============ UI INTERACTION HANDLERS ============

export async function handleClickElement(args: any) {
  return await uiInteractions.clickElement(args);
}

export async function handleTypeText(args: any) {
  return await uiInteractions.typeText(args);
}

export async function handleGetElementText(args: any) {
  return await uiInteractions.getElementText(args);
}

// ============ VISUAL TESTING HANDLERS ============

export async function handleTakeElementScreenshot(args: any, logger: Logger) {
  const page = browserManager.getPage();
  if (!page) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (
    !args ||
    typeof args.selector !== "string" ||
    typeof args.name !== "string"
  ) {
    throw new Error("Selector and name parameters are required");
  }
  const elementScreenshot = await visualTesting.takeElementScreenshot(
    page,
    args.selector as string,
    {
      format: args.format as any,
      quality: args.quality as any,
      padding: args.padding as any,
    }
  );
  const elementPath = path.join(
    process.cwd(),
    DIRECTORIES.screenshots,
    "current",
    `${args.name}.png`
  );
  await fs.writeFile(elementPath, elementScreenshot);
  return {
    content: [
      {
        type: "text",
        text: `Element screenshot saved: ${elementPath}`,
      },
    ],
  };
}

export async function handleTakeResponsiveScreenshots(args: any) {
  const page = browserManager.getPage();
  if (!page) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.name !== "string") {
    throw new Error("Name parameter is required");
  }
  const breakpoints = Array.isArray(args.breakpoints)
    ? (args.breakpoints as number[])
    : [320, 768, 1024, 1440];
  const responsiveScreenshots = await visualTesting.takeResponsiveScreenshots(
    page,
    breakpoints,
    {
      selector: args.selector as any,
      fullPage: args.fullPage as any,
    }
  );
  const responsiveResults = Array.from(responsiveScreenshots.entries()).map(
    ([width, buffer]) => {
      const responsivePath = path.join(
        process.cwd(),
        DIRECTORIES.screenshots,
        "current",
        `${args.name}_${width}px.png`
      );
      fs.writeFile(responsivePath, buffer);
      return `${width}px: ${responsivePath}`;
    }
  );
  return {
    content: [
      {
        type: "text",
        text: `Responsive screenshots saved:\n${responsiveResults.join("\n")}`,
      },
    ],
  };
}

// Journey Screenshots Handler
export async function handleGetJourneyScreenshots(args: any) {
  const screenshotsDir = path.join(process.cwd(), DIRECTORIES.screenshots);
  const journeyScreenshots: any[] = [];

  // Filter by journey name if provided
  const journeyFilter = args?.journeyName?.toLowerCase();

  try {
    // Check for screenshots in different subdirectories including journey directories
    const possibleDirs = ["current", "baseline", "regressions", "journeys"];

    for (const subDir of possibleDirs) {
      const fullSubDir = path.join(screenshotsDir, subDir);
      if (fs.existsSync(fullSubDir)) {
        await scanDirectoryForScreenshots(
          fullSubDir,
          subDir,
          journeyScreenshots,
          journeyFilter
        );
      }

      // Also check for journey-specific subdirectories
      const journeySubDir = path.join(screenshotsDir, subDir, "journeys");
      if (fs.existsSync(journeySubDir)) {
        const journeyFiles = fs.readdirSync(journeySubDir);
        for (const journeyFile of journeyFiles) {
          const journeyPath = path.join(journeySubDir, journeyFile);
          if (fs.statSync(journeyPath).isDirectory()) {
            await scanDirectoryForScreenshots(
              journeyPath,
              `${subDir}/journeys/${journeyFile}`,
              journeyScreenshots,
              journeyFilter
            );
          }
        }
      }
    }

    // Check for any journey-specific logging or metadata
    const logsDir = path.join(process.cwd(), "logs");
    let journeyMetadata: any = {};

    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir);
      const recentLogFile = logFiles
        .filter((f) => f.includes("journey") || f.includes("mcp-server"))
        .sort()
        .pop();

      if (recentLogFile) {
        try {
          const logContent = fs.readFileSync(
            path.join(logsDir, recentLogFile),
            "utf-8"
          );
          // Extract journey-related information from logs
          const journeyLines = logContent
            .split("\n")
            .filter(
              (line) =>
                line.includes("Journey") ||
                line.includes("journey") ||
                (journeyFilter && line.toLowerCase().includes(journeyFilter))
            )
            .slice(-20); // Last 20 journey-related lines
          if (journeyLines.length > 0) {
            journeyMetadata.recentActivity = journeyLines.join("\n");
          }
        } catch (error) {
          // Ignore log reading errors
        }
      }
    }

    if (journeyScreenshots.length === 0) {
      if (journeyFilter) {
        return {
          content: [
            {
              type: "text",
              text: `No screenshots found for journey "${args.journeyName}". Journey might not have captured screenshots yet, or screenshots may be stored in a different location.`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "No journey screenshots found. Run user journeys with screenshot steps to capture visual evidence, or provide a journey name to filter for specific journey screenshots.",
            },
          ],
        };
      }
    }

    // Group screenshots by category and journey
    const groupedScreenshots = journeyScreenshots.reduce(
      (acc: { [key: string]: any[] }, shot: any) => {
        const journeyName = shot.journeyName || "unknown";
        const key = `${shot.category}_${journeyName}`;

        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(shot);
        return acc;
      },
      {} as { [key: string]: any[] }
    );

    // Generate summary
    let summary = "";
    if (journeyFilter) {
      const filteredShots = journeyScreenshots.filter(
        (s) =>
          s.journeyName && s.journeyName.toLowerCase().includes(journeyFilter)
      );
      summary += `🎥 Journey "${args.journeyName}" Screenshots:\n📁 ${filteredShots.length} screenshots found\n`;
    } else {
      summary += `🎥 Journey Screenshots Overview:\n📁 Total: ${journeyScreenshots.length} screenshots\n\n`;
    }

    // Add breakdown by groups
    Object.keys(groupedScreenshots).forEach((groupKey) => {
      const group = groupedScreenshots[groupKey];
      const totalSize = group.reduce(
        (sum: number, shot: any) => sum + shot.size,
        0
      );
      const category = groupKey.split("_")[0];

      if (journeyFilter && groupKey.toLowerCase().includes(journeyFilter)) {
        summary += `📋 ${groupKey
          .replace("_", "/")
          .replace(`${args.journeyName}/`, "")}: ${group.length} screenshots\n`;
      } else if (!journeyFilter) {
        summary += `📂 ${groupKey.replace("_", "-")}: ${
          group.length
        } screenshots (${formatBytes(totalSize)})\n`;
      }
    });

    // Detailed list with filtering
    const filteredScreenshots = journeyFilter
      ? journeyScreenshots.filter(
          (shot) =>
            shot.journeyName &&
            shot.journeyName.toLowerCase().includes(journeyFilter)
        )
      : journeyScreenshots.slice(0, 10); // Show first 10 if no filter

    const detailedList = filteredScreenshots
      .sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime()
      )
      .splice(0, 10) // Limit to 10 most recent
      .map((shot) => {
        let sizeFormatted: string;
        let categoryInfo = shot.category;

        if (shot.size > 1024 * 1024) {
          sizeFormatted = `${(shot.size / 1024 / 1024).toFixed(1)} MB`;
        } else if (shot.size > 1024) {
          sizeFormatted = `${(shot.size / 1024).toFixed(1)} KB`;
        } else {
          sizeFormatted = `${shot.size} bytes`;
        }

        // Add journey information
        if (shot.journeyName) {
          categoryInfo += ` | Journey: ${shot.journeyName}`;
        }

        return `🖼️  ${shot.name}
    📂 ${categoryInfo}
    📊 Size: ${sizeFormatted}
    📅 Modified: ${new Date(shot.modified).toLocaleString()}
    📍 Path: ${shot.path}`;
      })
      .join("\n\n");

    let response = summary;
    if (detailedList.length > 0) {
      response += `\n📈 Recent Screenshots:\n\n${detailedList}`;
    }

    if (journeyMetadata.recentActivity) {
      response += `\n📝 Recent Journey Activity:\n${journeyMetadata.recentActivity}`;
    }

    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to retrieve journey screenshots: ${
            (error as Error).message
          }`,
        },
      ],
    };
  }
}

// Helper function to scan directory for screenshots
async function scanDirectoryForScreenshots(
  directory: string,
  category: string,
  screenshots: any[],
  journeyFilter?: string
) {
  try {
    const files = fs.readdirSync(directory);

    for (const file of files) {
      if (
        file.endsWith(".png") ||
        file.endsWith(".jpg") ||
        file.endsWith(".jpeg") ||
        file.endsWith(".gif")
      ) {
        const filePath = path.join(directory, file);
        try {
          const stats = fs.statSync(filePath);

          // Extract journey name from filename or path
          let journeyName = "general";
          if (directory.includes("journey") || file.includes("journey")) {
            if (file.match(/journey[_-]([a-zA-Z_-]+)/)) {
              journeyName =
                file.match(/journey[_-]([a-zA-Z_-]+)/)?.[1] || "general";
            } else if (directory.includes("journey")) {
              const dirParts = directory.split("/");
              const journeyIndex = dirParts.findIndex((part) =>
                part.includes("journey")
              );
              if (journeyIndex !== -1 && dirParts[journeyIndex + 1]) {
                journeyName = dirParts[journeyIndex + 1];
              }
            }
          }

          // Apply filter if specified
          if (
            journeyFilter &&
            journeyName &&
            !journeyName.toLowerCase().includes(journeyFilter)
          ) {
            continue;
          }

          screenshots.push({
            name: file,
            path: filePath,
            category: category,
            journeyName: journeyName,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            type: path.extname(file).substring(1),
          });
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

// Format bytes utility (inline since it's locally used)
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============ BACKEND SERVICE MOCKING HANDLERS ============

export async function handleLoadMockConfig(args: any, context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.name !== "string") {
    throw new Error("Mock configuration name is required");
  }
  await context.backendMocker.loadMockConfig(args);
  return {
    content: [
      {
        type: "text",
        text: `Mock configuration "${args.name}" loaded successfully`,
      },
    ],
  };
}

export async function handleSaveMockConfig(args: any, context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.name !== "string") {
    throw new Error("Mock configuration name is required");
  }
  await context.backendMocker.saveMockConfig(args.name);
  return {
    content: [
      {
        type: "text",
        text: `Mock configuration "${args.name}" saved successfully`,
      },
    ],
  };
}

export async function handleAddMockRule(args: any, context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.url !== "string" || !args.response) {
    throw new Error("Mock rule URL and response are required");
  }
  const ruleId = await context.backendMocker.addMockRule(args);
  return {
    content: [
      {
        type: "text",
        text: `Mock rule added successfully with ID: ${ruleId}`,
      },
    ],
  };
}

export async function handleRemoveMockRule(args: any, context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.ruleId !== "string") {
    throw new Error("Mock rule ID is required");
  }
  await context.backendMocker.removeMockRule(args.ruleId);
  return {
    content: [
      {
        type: "text",
        text: `Mock rule "${args.ruleId}" removed successfully`,
      },
    ],
  };
}

export async function handleUpdateMockRule(args: any, context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.ruleId !== "string" || !args.updates) {
    throw new Error("Mock rule ID and updates are required");
  }
  await context.backendMocker.updateMockRule(args.ruleId, args.updates);
  return {
    content: [
      {
        type: "text",
        text: `Mock rule "${args.ruleId}" updated successfully`,
      },
    ],
  };
}

export async function handleGetMockRules(context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  const rules = await context.backendMocker.getMockRules();
  return {
    content: [
      {
        type: "text",
        text: `Active mock rules (${rules.length}):\n${rules
          .map((rule) => `- ${rule.id}: ${rule.method || "ALL"} ${rule.url}`)
          .join("\n")}`,
      },
    ],
  };
}

export async function handleEnableBackendMocking(context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  const page = browserManager.getPage();
  if (!page) {
    throw new Error("Browser page unavailable. Please launch browser first.");
  }
  await context.backendMocker.enableMocking(page);
  return {
    content: [
      {
        type: "text",
        text: "Backend service mocking enabled successfully",
      },
    ],
  };
}

export async function handleDisableBackendMocking(context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  const page = browserManager.getPage();
  if (!page) {
    throw new Error("Browser page unavailable. Please launch browser first.");
  }
  await context.backendMocker.disableMocking(page);
  return {
    content: [
      {
        type: "text",
        text: "Backend service mocking disabled successfully",
      },
    ],
  };
}

export async function handleGetMockedRequests(context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  const requests = await context.backendMocker.getMockedRequests();
  return {
    content: [
      {
        type: "text",
        text: `Mocked requests history (${requests.length}):\n${requests
          .map((req) => `- ${req.method} ${req.url} -> ${req.response.status}`)
          .join("\n")}`,
      },
    ],
  };
}

export async function handleClearAllMocks(context: ToolHandlerContext) {
  if (!context.backendMocker) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  await context.backendMocker.clearAllMocks();
  return {
    content: [
      {
        type: "text",
        text: "All mock rules cleared successfully",
      },
    ],
  };
}

export async function handleSetupJourneyMocks(args: any, context: ToolHandlerContext) {
  if (!args || !args.journeyName || !args.mockConfig) {
    throw new Error("Journey name and mock configuration are required");
  }

  // Load the journey-specific mock configuration
  await handleLoadMockConfig({
    name: `${args.journeyName}-mocks`,
    ...args.mockConfig
  }, context);

  // Enable mocking
  await handleEnableBackendMocking(context);

  return {
    content: [
      {
        type: "text",
        text: `Journey mocks set up successfully for "${args.journeyName}"`,
      },
    ],
  };
}

// Tool request handler dispatcher
export async function handleToolRequest(
  name: string,
  args: any,
  context: ToolHandlerContext
): Promise<any> {
  const { logger } = context;

  switch (name) {
    // Browser Management
    case "launch_browser":
      return await handleLaunchBrowser(args, logger, context);
    case "close_browser":
      return await handleCloseBrowser(args, logger);

    // Element Interactions
    case "find_element":
      return await handleFindElement(args, context);
    case "fill_form":
      return await handleFillForm(args, context);
    case "submit_form":
      return await handleSubmitForm(args, context);
    case "click_element":
      return await handleClickElement(args);
    case "type_text":
      return await handleTypeText(args);
    case "get_element_text":
      return await handleGetElementText(args);

    // Visual Testing
    case "take_element_screenshot":
      return await handleTakeElementScreenshot(args, logger);
    case "take_responsive_screenshots":
      return await handleTakeResponsiveScreenshots(args);
    case "detect_visual_regression":
      return await visualTesting.compareWithBaseline(
        browserManager.getPage()!,
        args.testName as string,
        args
      );
    case "update_baseline":
      await visualTesting.updateBaseline(
        browserManager.getPage()!,
        args.testName as string
      );
      return {
        content: [
          {
            type: "text",
            text: `Baseline updated for test: ${args.testName}`,
          },
        ],
      };
    case "take_screenshot":
      return await visualTesting.takeScreenshot(args);
    case "compare_screenshots":
      return await visualTesting.compareScreenshots(args);

    // Journey Screenshots
    case "get_journey_screenshots":
      return await handleGetJourneyScreenshots(args);

    // Backend Service Mocking
    case "load_mock_config":
      return await handleLoadMockConfig(args, context);
    case "save_mock_config":
      return await handleSaveMockConfig(args, context);
    case "add_mock_rule":
      return await handleAddMockRule(args, context);
    case "remove_mock_rule":
      return await handleRemoveMockRule(args, context);
    case "update_mock_rule":
      return await handleUpdateMockRule(args, context);
    case "get_mock_rules":
      return await handleGetMockRules(context);
    case "enable_backend_mocking":
      return await handleEnableBackendMocking(context);
    case "disable_backend_mocking":
      return await handleDisableBackendMocking(context);
    case "get_mocked_requests":
      return await handleGetMockedRequests(context);
    case "clear_all_mocks":
      return await handleClearAllMocks(context);
    case "setup_journey_mocks":
      return await handleSetupJourneyMocks(args, context);

    // Default case for unimplemented tools
    default:
      logger.warn(`Tool handler not implemented yet: ${name}`);
      // Return a stub response instead of throwing error
      return {
        content: [
          {
            type: "text",
            text: `Tool "${name}" is not yet implemented in the modular version. Please use the original implementation or wait for upcoming updates.`,
          },
        ],
      };
  }
}
