#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs-extra";
import * as path from "path";

// Security utilities for input validation and sanitization
export class SecurityUtils {
  // Validate and sanitize file names to prevent path traversal and injection
  static validateFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      throw new AgentFriendlyError(
        "INVALID_FILENAME",
        "File name is required and must be a string",
        "Please provide a valid file name without special characters",
        false
      );
    }

    // Remove any path separators and dangerous characters
    const sanitized = fileName.replace(/[\/\\:*?"<>|]/g, "_").trim();

    if (sanitized.length === 0) {
      throw new AgentFriendlyError(
        "INVALID_FILENAME",
        "File name becomes empty after sanitization",
        "Please provide a file name with valid characters",
        false
      );
    }

    if (sanitized.length > 255) {
      throw new AgentFriendlyError(
        "INVALID_FILENAME",
        "File name is too long",
        "Please provide a shorter file name (max 255 characters)",
        false
      );
    }

    return sanitized;
  }

  // Validate file paths to prevent directory traversal
  static validateFilePath(
    filePath: string,
    allowedDirectories: string[] = []
  ): string {
    if (!filePath || typeof filePath !== "string") {
      throw new AgentFriendlyError(
        "INVALID_FILEPATH",
        "File path is required and must be a string",
        "Please provide a valid file path",
        false
      );
    }

    // Resolve the path to prevent traversal attacks
    const resolvedPath = path.resolve(filePath);

    // Ensure the resolved path is within allowed directories
    const isAllowed = allowedDirectories.some((allowedDir) => {
      const resolvedAllowedDir = path.resolve(allowedDir);
      return (
        resolvedPath.startsWith(resolvedAllowedDir + path.sep) ||
        resolvedPath === resolvedAllowedDir
      );
    });

    if (!isAllowed) {
      throw new AgentFriendlyError(
        "PATH_TRAVERSAL_DETECTED",
        "File path is outside allowed directories",
        "File operations are restricted to designated directories for security",
        false
      );
    }

    return resolvedPath;
  }

  // Sanitize error messages to prevent information disclosure
  static sanitizeErrorMessage(error: Error): string {
    // Remove stack traces and internal paths from error messages
    let message = error.message;

    // Remove file paths that might contain sensitive information
    message = message.replace(/\/[^\s]+/g, "[PATH]");
    message = message.replace(/\w:[\\/][^\s]*/g, "[PATH]"); // Windows paths

    // Remove potential sensitive data patterns
    message = message.replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, "[REDACTED]"); // Credit cards
    message = message.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "[EMAIL]"
    ); // Emails

    // Limit message length to prevent overly verbose errors
    if (message.length > 500) {
      message = message.substring(0, 500) + "...";
    }

    return message;
  }

  // Get allowed directories for file operations
  static getAllowedDirectories(): string[] {
    const cwd = process.cwd();
    return [
      path.join(cwd, "screenshots"),
      path.join(cwd, "recordings"),
      path.join(cwd, "logs"),
      path.join(cwd, "baselines"),
      path.join(cwd, "mocks"),
    ];
  }
}

// State persistence and operation tracking
interface SessionState {
  browserLaunched: boolean;
  monitoringActive: boolean;
  mockingActive: boolean;
  lastActivity: Date;
  activeTools: string[];
}

interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 1.5,
  initialDelay: 1000,
};

// Enhanced error types with recovery suggestions
class AgentFriendlyError extends Error {
  constructor(
    public code: string,
    message: string,
    public recoverySuggestion: string,
    public canRetry: boolean = false
  ) {
    super(message);
    this.name = "AgentFriendlyError";
  }
}

// Custom error classes for different types of errors
export class BrowserError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("BROWSER_ERROR", message, recoverySuggestion, canRetry);
    this.name = "BrowserError";
  }
}

export class ElementLocatorError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("ELEMENT_LOCATOR_ERROR", message, recoverySuggestion, canRetry);
    this.name = "ElementLocatorError";
  }
}

export class FormHandlerError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("FORM_HANDLER_ERROR", message, recoverySuggestion, canRetry);
    this.name = "FormHandlerError";
  }
}

export class VisualTestingError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("VISUAL_TESTING_ERROR", message, recoverySuggestion, canRetry);
    this.name = "VisualTestingError";
  }
}

export class PerformanceMonitorError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("PERFORMANCE_MONITOR_ERROR", message, recoverySuggestion, canRetry);
    this.name = "PerformanceMonitorError";
  }
}

export class JourneyError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("JOURNEY_ERROR", message, recoverySuggestion, canRetry);
    this.name = "JourneyError";
  }
}

export class BackendMockError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("BACKEND_MOCK_ERROR", message, recoverySuggestion, canRetry);
    this.name = "BackendMockError";
  }
}

export class FileSystemError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("FILE_SYSTEM_ERROR", message, recoverySuggestion, canRetry);
    this.name = "FileSystemError";
  }
}

export class ValidationError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = false) {
    super("VALIDATION_ERROR", message, recoverySuggestion, canRetry);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = true) {
    super("NETWORK_ERROR", message, recoverySuggestion, canRetry);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends AgentFriendlyError {
  constructor(message: string, recoverySuggestion: string, canRetry = true) {
    super("TIMEOUT_ERROR", message, recoverySuggestion, canRetry);
    this.name = "TimeoutError";
  }
}

// Logging utility with state management
class Logger {
  private logFile: string;
  private sessionState: SessionState;

  constructor() {
    this.logFile = path.join(process.cwd(), "logs", "mcp-server.log");
    this.sessionState = this.loadSessionState();
    // Ensure logs directory exists
    fs.ensureDirSync(path.dirname(this.logFile));
  }

  private loadSessionState(): SessionState {
    try {
      const stateFile = path.join(process.cwd(), "logs", "session-state.json");
      if (fs.existsSync(stateFile)) {
        const data = fs.readFileSync(stateFile, "utf-8");
        const state = JSON.parse(data);
        // Convert timestamp back to Date
        state.lastActivity = new Date(state.lastActivity);
        return state;
      }
    } catch (error) {
      this.debug(`Failed to load session state: ${error}`);
    }

    // Return default state
    return {
      browserLaunched: false,
      monitoringActive: false,
      mockingActive: false,
      lastActivity: new Date(),
      activeTools: [],
    };
  }

  private saveSessionState(): void {
    try {
      const stateFile = path.join(process.cwd(), "logs", "session-state.json");
      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeFileSync(stateFile, JSON.stringify(this.sessionState, null, 2));
    } catch (error) {
      console.error("Failed to save session state:", error);
    }
  }

  updateSessionState(updates: Partial<SessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...updates,
      lastActivity: new Date(),
    };
    this.saveSessionState();
  }

  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  private formatMessage(level: string, message: string): string {
    return `[${new Date().toISOString()}] ${level}: ${message}\n`;
  }

  info(message: string): void {
    const logMessage = this.formatMessage("INFO", message);
    try {
      fs.ensureDirSync(path.dirname(this.logFile));
      fs.writeFileSync(this.logFile, logMessage, { flag: "a" });
    } catch (error) {
      // Fallback to console if file logging fails
      console.error("Failed to write to log file:", error);
      console.log(message);
    }
  }

  error(message: string): void {
    const logMessage = this.formatMessage("ERROR", message);
    try {
      fs.ensureDirSync(path.dirname(this.logFile));
      fs.writeFileSync(this.logFile, logMessage, { flag: "a" });
    } catch (error) {
      // Fallback to console if file logging fails
      console.error("Failed to write to log file:", error);
      console.error(message);
    }
  }

  debug(message: string): void {
    const logMessage = this.formatMessage("DEBUG", message);
    try {
      fs.ensureDirSync(path.dirname(this.logFile));
      fs.writeFileSync(this.logFile, logMessage, { flag: "a" });
    } catch (error) {
      // Fallback to console if file logging fails
      console.error("Failed to write to log file:", error);
      console.debug(message);
    }
  }
}

// Import our tool modules
import { BackendMocker } from "./backend-mocker.js";
import { browserManager } from "./browser-manager.js";
import { BrowserMonitor } from "./browser-monitor.js";
import { ElementLocator } from "./element-locator.js";
import { FormHandler } from "./form-handler.js";
import { JourneyRecorder } from "./journey-recorder.js";
import { JourneySimulator } from "./journey-simulator.js";
import { PerformanceMonitor } from "./performance-monitor.js";

// Import tool handlers
import {
  handleAddMockRule,
  handleClearAllMocks,
  handleDisableBackendMocking,
  handleEnableBackendMocking,
  handleGetMockedRequests,
  handleGetMockRules,
  handleLoadMockConfig,
  handleRemoveMockRule,
  handleSaveMockConfig,
  handleSetupJourneyMocks,
  handleUpdateMockRule,
} from "./tools/backend-mocking.js";
import {
  handleCloseBrowser,
  handleLaunchBrowser,
} from "./tools/browser-management.js";
import {
  handleCapturePerformanceMetrics,
  handleGetFilteredConsoleLogs,
  handleGetFilteredNetworkRequests,
  handleGetJavascriptErrors,
  handleStartBrowserMonitoring,
  handleStopBrowserMonitoring,
} from "./tools/browser-monitoring.js";
import {
  handleCheckForErrors,
  handleGetConsoleLogs,
  handleGetNetworkRequests,
} from "./tools/dev-tools.js";
import {
  handleClickElement,
  handleFindElement,
  handleGetElementText,
  handleTypeText,
} from "./tools/element-interactions.js";
import { handleFillForm, handleSubmitForm } from "./tools/form-interactions.js";
import {
  handleGetRecordingStatus,
  handlePauseJourneyRecording,
  handleResumeJourneyRecording,
  handleStartJourneyRecording,
  handleStopJourneyRecording,
  handleSuggestElementSelectors,
} from "./tools/journey-recording.js";
import {
  handleOptimizeJourneyDefinition,
  handleRecordUserJourney,
  handleRunUserJourney,
  handleValidateJourneyDefinition,
} from "./tools/journey-simulation.js";
import {
  handleAnalyzePageLoad,
  handleDetectPerformanceRegression,
  handleGetComprehensivePerformanceMetrics,
  handleMeasureCoreWebVitals,
  handleMonitorResourceLoading,
  handleTrackMemoryUsage,
} from "./tools/performance-monitoring.js";
import {
  handleGetServerState,
  handleGetSessionInfo,
} from "./tools/server-state.js";
import {
  handleCompareScreenshots,
  handleDetectVisualRegression,
  handleTakeElementScreenshot,
  handleTakeResponsiveScreenshots,
  handleTakeScreenshot,
  handleUpdateBaseline,
} from "./tools/visual-testing.js";
import {
  handleWaitForCondition,
  handleWaitForElement,
} from "./tools/wait-retry.js";

class VisualUITestingServer {
  private server: Server;
  private logger: Logger;
  private browserInstance: any = null;
  private elementLocator: ElementLocator | null = null;
  private formHandler: FormHandler | null = null;
  private browserMonitor: BrowserMonitor | null = null;
  private journeySimulator: JourneySimulator | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  private journeyRecorder: JourneyRecorder | null = null;
  private currentRecordingSessionId: string | null = null;
  private backendMocker: BackendMocker | null = null;

  constructor() {
    this.logger = new Logger();
    this.server = new Server({
      name: "visual-ui-mcp-server",
      version: "3.0.0",
    });

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  // Enhanced browser state validation
  private async validateBrowserState(
    operation: string,
    requiresActivePage = true
  ): Promise<void> {
    const state = this.logger.getSessionState();

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

  // Enhanced monitoring state validation
  private validateMonitoringState(
    operation: string,
    requiresActive = true
  ): void {
    const state = this.logger.getSessionState();

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

  // Enhanced mocking state validation
  private validateMockingState(operation: string, requiresActive = true): void {
    const state = this.logger.getSessionState();

    if (requiresActive && !state.mockingActive) {
      throw new AgentFriendlyError(
        "MOCKING_NOT_ACTIVE",
        `Backend mocking not active. Cannot perform operation: ${operation}`,
        'Enable backend mocking first with "enable_backend_mocking".',
        false
      );
    }

    if (!requiresActive && state.mockingActive) {
      throw new AgentFriendlyError(
        "MOCKING_ALREADY_ACTIVE",
        `Backend mocking already active. Cannot perform operation: ${operation}`,
        'Disable current mocking with "disable_backend_mocking" before starting new session.',
        false
      );
    }
  }

  // Retry logic wrapper
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry for non-retryable errors
        if (error instanceof AgentFriendlyError && !error.canRetry) {
          throw error;
        }

        if (attempt === retryConfig.maxAttempts) {
          this.logger.error(
            `${operationName} failed after ${attempt} attempts`
          );
          throw new AgentFriendlyError(
            "OPERATION_FAILED",
            `${operationName} failed after ${attempt} attempts: ${lastError.message}`,
            `Operation failed consistently. Check logs for details. Last error: ${lastError.message}`,
            false
          );
        }

        const delay =
          retryConfig.initialDelay *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1);
        this.logger.debug(
          `Retry ${attempt}/${retryConfig.maxAttempts} for ${operationName} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Validate required arguments
  private validateArgs(
    args: any,
    requiredFields: string[],
    operation: string
  ): void {
    if (!args) {
      throw new AgentFriendlyError(
        "MISSING_ARGUMENTS",
        `Arguments are required for operation: ${operation}`,
        `Please provide the required arguments for ${operation}.`,
        false
      );
    }

    const missingFields = requiredFields.filter(
      (field) =>
        !(field in args) || args[field] === undefined || args[field] === null
    );

    if (missingFields.length > 0) {
      throw new AgentFriendlyError(
        "MISSING_REQUIRED_ARGUMENTS",
        `Missing required arguments for ${operation}: ${missingFields.join(
          ", "
        )}`,
        `Please provide the following required arguments: ${missingFields.join(
          ", "
        )}`,
        false
      );
    }
  }

  // Update session state
  private updateBrowserState(
    launched: boolean,
    monitoring?: boolean,
    mocking?: boolean,
    tool?: string
  ): void {
    const updates: Partial<SessionState> = { browserLaunched: launched };

    if (monitoring !== undefined) updates.monitoringActive = monitoring;
    if (mocking !== undefined) updates.mockingActive = mocking;
    if (tool) {
      const state = this.logger.getSessionState();
      const activeTools = [...state.activeTools];
      if (tool && !activeTools.includes(tool)) {
        activeTools.push(tool);
      }
      updates.activeTools = activeTools;
    }

    this.logger.updateSessionState(updates);
  }

  private setupToolHandlers() {
    // Return minimal tool list for fast initial connection - detailed schemas available via tools/list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("DEBUG: ListToolsRequestSchema handler called");
      return {
        tools: [
          // Minimal tool definitions for fast loading - use tools/list for detailed info
          {
            name: "launch_browser",
            description: "Launch browser",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "close_browser",
            description: "Close browser",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "find_element",
            description: "Find element",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "fill_form",
            description: "Fill form",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "submit_form",
            description: "Submit form",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "click_element",
            description: "Click element",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "type_text",
            description: "Type text",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_element_text",
            description: "Get element text",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "take_element_screenshot",
            description: "Take element screenshot",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "take_responsive_screenshots",
            description: "Take responsive screenshots",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "detect_visual_regression",
            description: "Detect visual regression",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "update_baseline",
            description: "Update baseline",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "take_screenshot",
            description: "Take screenshot",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "compare_screenshots",
            description: "Compare screenshots",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_console_logs",
            description: "Get console logs",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_network_requests",
            description: "Get network requests",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "check_for_errors",
            description: "Check for errors",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "start_browser_monitoring",
            description: "Start browser monitoring",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "stop_browser_monitoring",
            description: "Stop browser monitoring",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_filtered_console_logs",
            description: "Get filtered console logs",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_filtered_network_requests",
            description: "Get filtered network requests",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_javascript_errors",
            description: "Get JavaScript errors",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "capture_performance_metrics",
            description: "Capture performance metrics",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "measure_core_web_vitals",
            description: "Measure core web vitals",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "analyze_page_load",
            description: "Analyze page load",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "monitor_resource_loading",
            description: "Monitor resource loading",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "track_memory_usage",
            description: "Track memory usage",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "detect_performance_regression",
            description: "Detect performance regression",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_comprehensive_performance_metrics",
            description: "Get comprehensive performance metrics",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "load_mock_config",
            description: "Load mock config",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "save_mock_config",
            description: "Save mock config",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "add_mock_rule",
            description: "Add mock rule",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "remove_mock_rule",
            description: "Remove mock rule",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "update_mock_rule",
            description: "Update mock rule",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "enable_backend_mocking",
            description: "Enable backend mocking",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "disable_backend_mocking",
            description: "Disable backend mocking",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_mocked_requests",
            description: "Get mocked requests",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_mock_rules",
            description: "Get mock rules",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "clear_all_mocks",
            description: "Clear all mocks",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "setup_journey_mocks",
            description: "Setup journey mocks",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "wait_for_element",
            description: "Wait for element",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "wait_for_condition",
            description: "Wait for condition",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "run_user_journey",
            description: "Run user journey",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "record_user_journey",
            description: "Record user journey",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "validate_journey_definition",
            description: "Validate journey definition",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "optimize_journey_definition",
            description: "Optimize journey definition",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "start_journey_recording",
            description: "Start journey recording",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "stop_journey_recording",
            description: "Stop journey recording",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "pause_journey_recording",
            description: "Pause journey recording",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "resume_journey_recording",
            description: "Resume journey recording",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_recording_status",
            description: "Get recording status",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "suggest_element_selectors",
            description: "Suggest element selectors",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_server_state",
            description: "Get server state",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_session_info",
            description: "Get session info",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "configure_session",
            description: "Configure session",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_performance_baseline",
            description: "Get performance baseline",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "set_performance_baseline",
            description: "Set performance baseline",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "clear_performance_baselines",
            description: "Clear performance baselines",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
        ],
      };
    });
  }

  private setupRequestHandlers() {
    // Handle MCP initialization
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      console.error("DEBUG: initialize handler called");
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: "visual-ui-mcp-server",
          version: "3.0.0",
        },
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;

      this.logger.info(`📨 Received tool call: ${name}`);
      if (args) {
        this.logger.debug(`📨 Arguments: ${JSON.stringify(args, null, 2)}`);
      }

      try {
        this.logger.info(`🔧 Executing tool: ${name}`);

        switch (name) {

          // Browser Management
          case "launch_browser":
            return await handleLaunchBrowser(this, args);
          case "close_browser":
            return await handleCloseBrowser(this);

          // Element Interactions
          case "find_element":
            return await handleFindElement(this, args);
          case "click_element":
            return await handleClickElement(this, args);
          case "type_text":
            return await handleTypeText(this, args);
          case "get_element_text":
            return await handleGetElementText(this, args);

          // Form Interactions
          case "fill_form":
            return await handleFillForm(this, args);
          case "submit_form":
            return await handleSubmitForm(this, args);

          // Visual Testing
          case "take_element_screenshot":
            return await handleTakeElementScreenshot(this, args);
          case "take_responsive_screenshots":
            return await handleTakeResponsiveScreenshots(this, args);
          case "detect_visual_regression":
            return await handleDetectVisualRegression(this, args);
          case "update_baseline":
            return await handleUpdateBaseline(this, args);
          case "take_screenshot":
            return await handleTakeScreenshot(this, args);
          case "compare_screenshots":
            return await handleCompareScreenshots(this, args);

          // Developer Tools
          case "get_console_logs":
            return await handleGetConsoleLogs(this, args);
          case "get_network_requests":
            return await handleGetNetworkRequests(this, args);
          case "check_for_errors":
            return await handleCheckForErrors(this, args);

          // Browser Monitoring
          case "start_browser_monitoring":
            return await handleStartBrowserMonitoring(this, args);
          case "stop_browser_monitoring":
            return await handleStopBrowserMonitoring(this, args);
          case "get_filtered_console_logs":
            return await handleGetFilteredConsoleLogs(this, args);
          case "get_filtered_network_requests":
            return await handleGetFilteredNetworkRequests(this, args);
          case "get_javascript_errors":
            return await handleGetJavascriptErrors(this, args);
          case "capture_performance_metrics":
            return await handleCapturePerformanceMetrics(this, args);

          // Performance Monitoring
          case "measure_core_web_vitals":
            return await handleMeasureCoreWebVitals(this, args);
          case "analyze_page_load":
            return await handleAnalyzePageLoad(this, args);
          case "monitor_resource_loading":
            return await handleMonitorResourceLoading(this, args);
          case "track_memory_usage":
            return await handleTrackMemoryUsage(this, args);
          case "detect_performance_regression":
            return await handleDetectPerformanceRegression(this, args);
          case "get_comprehensive_performance_metrics":
            return await handleGetComprehensivePerformanceMetrics(this, args);

          // Backend Mocking
          case "load_mock_config":
            return await handleLoadMockConfig(this, args);
          case "save_mock_config":
            return await handleSaveMockConfig(this, args);
          case "add_mock_rule":
            return await handleAddMockRule(this, args);
          case "remove_mock_rule":
            return await handleRemoveMockRule(this, args);
          case "update_mock_rule":
            return await handleUpdateMockRule(this, args);
          case "enable_backend_mocking":
            return await handleEnableBackendMocking(this, args);
          case "disable_backend_mocking":
            return await handleDisableBackendMocking(this, args);
          case "get_mocked_requests":
            return await handleGetMockedRequests(this, args);
          case "get_mock_rules":
            return await handleGetMockRules(this, args);
          case "clear_all_mocks":
            return await handleClearAllMocks(this, args);
          case "setup_journey_mocks":
            return await handleSetupJourneyMocks(this, args);

          // Wait/Retry
          case "wait_for_element":
            return await handleWaitForElement(this, args);
          case "wait_for_condition":
            return await handleWaitForCondition(this, args);

          // Journey Simulation
          case "run_user_journey":
            return await handleRunUserJourney(this, args);
          case "record_user_journey":
            return await handleRecordUserJourney(this, args);
          case "validate_journey_definition":
            return await handleValidateJourneyDefinition(this, args);
          case "optimize_journey_definition":
            return await handleOptimizeJourneyDefinition(this, args);

          // Journey Recording
          case "start_journey_recording":
            return await handleStartJourneyRecording(this, args);
          case "stop_journey_recording":
            return await handleStopJourneyRecording(this, args);
          case "pause_journey_recording":
            return await handlePauseJourneyRecording(this, args);
          case "resume_journey_recording":
            return await handleResumeJourneyRecording(this, args);
          case "get_recording_status":
            return await handleGetRecordingStatus(this, args);
          case "suggest_element_selectors":
            return await handleSuggestElementSelectors(this, args);

          // Server State
          case "get_server_state":
            return await handleGetServerState(this, args);
          case "get_session_info":
            return await handleGetSessionInfo(this, args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const sanitizedMessage = SecurityUtils.sanitizeErrorMessage(
          error as Error
        );
        this.logger.error(
          `❌ Tool execution failed: ${name} (${executionTime}ms) - ${sanitizedMessage}`
        );
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${sanitizedMessage}`
        );
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Visual UI Testing MCP Server started and ready");
    console.error("DEBUG: Server connected to transport");
    this.logger.info("Visual UI Testing MCP Server started");

    // Add a small delay to ensure server is fully ready before accepting requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Start the server
const server = new VisualUITestingServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
