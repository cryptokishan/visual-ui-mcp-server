/**
 * Browser Monitor types and interfaces
 * Defines TypeScript interfaces for browser monitoring functionality
 */

export interface ConsoleMessage {
  type: "log" | "info" | "warn" | "error" | "debug";
  text: string;
  location?: {
    url: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  timestamp: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  contentType?: string;
  size?: number;
  timing?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
  timestamp: number;
}

export interface JavaScriptError {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

export interface MonitoringOptions {
  includeConsole?: boolean;
  includeNetwork?: boolean;
  includeErrors?: boolean;
  includePerformance?: boolean;
  consoleFilter?: {
    types?: ("log" | "info" | "warn" | "error" | "debug")[];
    textPattern?: string;
  };
  networkFilter?: {
    urlPattern?: string;
    methods?: string[];
    statuses?: number[];
  };
  maxEntries?: number;
}

export interface MonitoringResult {
  consoleLogs: ConsoleMessage[];
  networkRequests: NetworkRequest[];
  javascriptErrors: JavaScriptError[];
  performanceMetrics: PerformanceMetric[];
  startTime: number;
  endTime?: number;
  monitoringActive: boolean;
}
