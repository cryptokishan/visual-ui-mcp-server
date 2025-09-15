// Shared type definitions for the MCP server

// State persistence and operation tracking
export interface SessionState {
  browserLaunched: boolean;
  monitoringActive: boolean;
  mockingActive: boolean;
  lastActivity: Date;
  activeTools: string[];
}

// Enhanced error types with recovery suggestions
export class AgentFriendlyError extends Error {
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

// File paths and utilities
export interface FilePaths {
  logFile: string;
  sessionFile: string;
}

// Tool execution context
export interface ToolContext {
  name: string;
  arguments?: any;
  startTime: number;
}

// Server component interfaces
export interface ServerComponents {
  browserInstance?: any;
  elementLocator?: any;
  formHandler?: any;
  browserMonitor?: any;
  journeySimulator?: any;
  performanceMonitor?: any;
}

// Journey step definition
export interface JourneyStep {
  id: string;
  action: string;
  selector?: string;
  value?: string;
  condition?: string;
  timeout?: number;
  retryCount?: number;
  onError?: string;
  description?: string;
}

// Journey definition
export interface JourneyDefinition {
  name: string;
  steps: JourneyStep[];
  onStepComplete?: (step: any, result: any) => void;
  onError?: (error: any, step: any) => void;
  maxDuration?: number;
  baseUrl?: string;
}

// Mock rule definition
export interface MockRule {
  id?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
    delay?: number;
  };
  priority?: number;
}

// Mock configuration
export interface MockConfig {
  name: string;
  description?: string;
  rules: MockRule[];
  enabled?: boolean;
}

// Performance metrics interfaces
export interface CoreWebVitals {
  cls: number;
  fid: number;
  lcp: number;
}

export interface TimingMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  usedPercent: number;
}

export interface PerformanceMetrics {
  coreWebVitals: CoreWebVitals;
  timing: TimingMetrics;
  memory: MemoryMetrics;
  timestamp: number;
}

// Screenshot options
export interface ScreenshotOptions {
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  padding?: number;
}

// Element locator strategies
export interface ElementLocatorOptions {
  type: "css" | "xpath" | "text" | "aria" | "data";
  value: string;
  priority?: number;
}

export interface LocatorQuery {
  selectors: ElementLocatorOptions[];
  timeout?: number;
  waitForVisible?: boolean;
  waitForEnabled?: boolean;
  retryCount?: number;
}

// Form field definition
export interface FormField {
  selector: string;
  value: string;
  type?:
    | "text"
    | "password"
    | "email"
    | "number"
    | "checkbox"
    | "radio"
    | "select";
  clearFirst?: boolean;
}

// Server state response
export interface ServerState {
  browserLaunched: boolean;
  monitoringActive: boolean;
  mockingActive: boolean;
  activeTools: string[];
  lastActivity: Date;
}

// Tool argument validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
