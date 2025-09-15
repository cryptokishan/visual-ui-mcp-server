// Utility functions and helper classes

import fs from "fs-extra";
import * as path from "path";
import { SessionState, AgentFriendlyError, FilePaths } from "../types/interfaces.js";
import { colors, DEFAULT_RETRY_CONFIG, DEFAULT_SESSION_STATE, DIRECTORIES, LOG_FILES } from "../config/constants.js";

// Logging utility with state management and pretty console output
export class Logger {
  private logFile: string;
  private sessionState: SessionState;
  private enableConsole: boolean = true;

  constructor() {
    this.logFile = path.join(process.cwd(), DIRECTORIES.logs, LOG_FILES.server);
    this.sessionState = this.loadSessionState();
    // Ensure logs directory exists
    fs.ensureDirSync(path.dirname(this.logFile));
  }

  private loadSessionState(): SessionState {
    try {
      const stateFile = path.join(process.cwd(), DIRECTORIES.logs, LOG_FILES.session);
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

    return { ...DEFAULT_SESSION_STATE };
  }

  private saveSessionState(): void {
    try {
      const stateFile = path.join(process.cwd(), DIRECTORIES.logs, LOG_FILES.session);
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

  private formatConsoleMessage(level: string, message: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const [hours, minutes, seconds] = timestamp.split(":");

    switch (level) {
      case "INFO":
        return `${colors.blue}${hours}:${minutes}:${seconds}${colors.reset} ${colors.green}ℹ${colors.reset} ${colors.bright}${message}${colors.reset}`;
      case "ERROR":
        return `${colors.blue}${hours}:${minutes}:${seconds}${colors.reset} ${colors.red}✗${colors.reset} ${colors.bright}${colors.red}${message}${colors.reset}`;
      case "DEBUG":
        return `${colors.blue}${hours}:${minutes}:${seconds}${colors.reset} ${colors.yellow}▶${colors.reset} ${colors.dim}${message}${colors.reset}`;
      case "WARN":
        return `${colors.blue}${hours}:${minutes}:${seconds}${colors.reset} ${colors.yellow}⚠${colors.reset} ${colors.bright}${message}${colors.reset}`;
      case "SUCCESS":
        return `${colors.blue}${hours}:${minutes}:${seconds}${colors.reset} ${colors.green}✓${colors.reset} ${colors.bright}${colors.green}${message}${colors.reset}`;
      default:
        return `${colors.blue}${hours}:${minutes}:${seconds}${colors.reset} ${message}`;
    }
  }

  private logToFile(level: string, message: string): void {
    try {
      fs.ensureDirSync(path.dirname(this.logFile));
      fs.writeFileSync(this.logFile, this.formatMessage(level, message), {
        flag: "a",
      });
    } catch (error) {
      // Fallback to console if file logging fails
      console.error(
        `${colors.red}Failed to write to log file:${colors.reset}`,
        error
      );
      console.log(this.formatConsoleMessage(level, message));
    }
  }

  info(message: string): void {
    this.logToFile("INFO", message);
    if (this.enableConsole) {
      console.log(this.formatConsoleMessage("INFO", message));
    }
  }

  error(message: string): void {
    this.logToFile("ERROR", message);
    if (this.enableConsole) {
      console.error(this.formatConsoleMessage("ERROR", message));
    }
  }

  debug(message: string): void {
    this.logToFile("DEBUG", message);
    if (this.enableConsole) {
      console.debug(this.formatConsoleMessage("DEBUG", message));
    }
  }

  warn(message: string): void {
    this.logToFile("WARN", message);
    if (this.enableConsole) {
      console.warn(this.formatConsoleMessage("WARN", message));
    }
  }

  success(message: string): void {
    this.logToFile("SUCCESS", message);
    if (this.enableConsole) {
      console.log(this.formatConsoleMessage("SUCCESS", message));
    }
  }
}

// Helper functions for common operations

export function validateArgs(
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

export function updateBrowserState(
  logger: Logger,
  launched: boolean,
  monitoring?: boolean,
  mocking?: boolean,
  tool?: string
): void {
  const updates: Partial<SessionState> = { browserLaunched: launched };

  if (monitoring !== undefined) updates.monitoringActive = monitoring;
  if (mocking !== undefined) updates.mockingActive = mocking;
  if (tool) {
    const state = logger.getSessionState();
    const activeTools = [...state.activeTools];
    if (tool && !activeTools.includes(tool)) {
      activeTools.push(tool);
    }
    updates.activeTools = activeTools;
  }

  logger.updateSessionState(updates);
}

export function getFilePaths(): FilePaths {
  return {
    logFile: path.join(process.cwd(), DIRECTORIES.logs, LOG_FILES.server),
    sessionFile: path.join(process.cwd(), DIRECTORIES.logs, LOG_FILES.session),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
}

export function parseJsonSafe<T>(data: string, fallback: T): T {
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}
