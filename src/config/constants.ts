// Configuration constants and retry policies

export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMultiplier: 1.5,
  initialDelay: 1000,
};

// Color constants for console logging
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

// Server configuration
export const SERVER_CONFIG = {
  name: "visual-ui-mcp-server",
  version: "1.0.0",
};

// Session state defaults
export const DEFAULT_SESSION_STATE = {
  browserLaunched: false,
  monitoringActive: false,
  mockingActive: false,
  lastActivity: new Date(),
  activeTools: [],
};

// Directory paths
export const DIRECTORIES = {
  logs: "logs",
  screenshots: "screenshots",
  baselines: "baselines",
};

// Log file names
export const LOG_FILES = {
  server: "mcp-server.log",
  session: "session-state.json",
};
