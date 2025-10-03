/**
 * Browser Monitor for comprehensive browser context monitoring
 * Captures console logs, network requests, JavaScript errors, and performance metrics
 */

import { ConsoleMessage, NetworkRequest, JavaScriptError, PerformanceMetric, MonitoringOptions, MonitoringResult } from "../types/browser-monitor.js";

export class BrowserMonitor {
  private monitoringActive = false;
  private monitoringResult: MonitoringResult;
  private page: any; // Playwright Page type
  private maxEntries: number;
  private cleanupFunctions: (() => void)[] = [];

  constructor(page: any, options: MonitoringOptions = {}) {
    this.page = page;
    this.maxEntries = options.maxEntries || 1000;

    this.monitoringResult = {
      consoleLogs: [],
      networkRequests: [],
      javascriptErrors: [],
      performanceMetrics: [],
      startTime: Date.now(),
      monitoringActive: false,
    };

    this.setupMonitoring(options);
  }

  private setupMonitoring(options: MonitoringOptions) {
    if (options.includeConsole !== false) {
      this.setupConsoleMonitoring(options.consoleFilter);
    }

    if (options.includeNetwork !== false) {
      this.setupNetworkMonitoring(options.networkFilter);
    }

    if (options.includeErrors !== false) {
      this.setupErrorMonitoring();
    }

    if (options.includePerformance !== false) {
      this.setupPerformanceMonitoring();
    }
  }

  private setupConsoleMonitoring(filter?: MonitoringOptions["consoleFilter"]) {
    const consoleHandler = (msg: any) => {
      const type = msg.type() as ConsoleMessage["type"];
      const text = msg.text();

      // Apply filters
      if (filter?.types && !filter.types.includes(type)) {
        return;
      }

      if (
        filter?.textPattern &&
        !new RegExp(filter.textPattern, "i").test(text)
      ) {
        return;
      }

      const consoleMessage: ConsoleMessage = {
        type,
        text,
        timestamp: Date.now(),
      };

      // Get location if available
      const location = msg.location();
      if (location) {
        consoleMessage.location = {
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
        };
      }

      this.monitoringResult.consoleLogs.push(consoleMessage);

      // Limit entries
      if (this.monitoringResult.consoleLogs.length > this.maxEntries) {
        this.monitoringResult.consoleLogs.shift();
      }
    };

    this.page.on("console", consoleHandler);
    this.cleanupFunctions.push(() => this.page.off("console", consoleHandler));
  }

  private setupNetworkMonitoring(filter?: MonitoringOptions["networkFilter"]) {
    const requestMap = new Map<
      string,
      { url: string; method: string; startTime: number }
    >();

    const requestHandler = (request: any) => {
      const url = request.url();
      const method = request.method();

      // Apply filters
      if (filter?.urlPattern && !new RegExp(filter.urlPattern).test(url)) {
        return;
      }

      if (filter?.methods && !filter.methods.includes(method)) {
        return;
      }

      const key = `${method}:${url}:${Date.now()}`;
      requestMap.set(key, {
        url,
        method,
        startTime: Date.now(),
      });
    };

    const responseHandler = (response: any) => {
      const request = response.request();
      const url = request.url();
      const method = request.method();
      const status = response.status();

      // Apply filters
      if (filter?.statuses && !filter.statuses.includes(status)) {
        return;
      }

      // Find the corresponding request
      const key = Array.from(requestMap.keys()).find((k) =>
        k.startsWith(`${method}:${url}:`)
      );

      if (key) {
        const requestData = requestMap.get(key);
        requestMap.delete(key);

        if (requestData) {
          const networkRequest: NetworkRequest = {
            url,
            method,
            status,
            timestamp: requestData.startTime,
            timing: {
              startTime: requestData.startTime,
              endTime: Date.now(),
              duration: Date.now() - requestData.startTime,
            },
          };

          // Try to get content type and size from response headers
          const headers = response.headers();
          if (headers["content-type"]) {
            networkRequest.contentType = headers["content-type"];
          }

          // Estimate size if available
          if (headers["content-length"]) {
            networkRequest.size = parseInt(headers["content-length"], 10);
          }

          this.monitoringResult.networkRequests.push(networkRequest);

          // Limit entries
          if (this.monitoringResult.networkRequests.length > this.maxEntries) {
            this.monitoringResult.networkRequests.shift();
          }
        }
      }
    };

    this.page.on("request", requestHandler);
    this.page.on("response", responseHandler);

    this.cleanupFunctions.push(() => {
      this.page.off("request", requestHandler);
      this.page.off("response", responseHandler);
    });
  }

  private setupErrorMonitoring() {
    const errorHandler = (error: any) => {
      const jsError: JavaScriptError = {
        message: error.message,
        timestamp: Date.now(),
      };

      // Extract source and line/column from stack if available
      if (error.stack) {
        jsError.stack = error.stack;
        // Simple stack parsing to get source and line
        const stackMatch = error.stack.match(/at\s.*?\((.*?):(\d+):(\d+)\)/);
        if (stackMatch) {
          jsError.source = stackMatch[1];
          jsError.line = parseInt(stackMatch[2], 10);
          jsError.column = parseInt(stackMatch[3], 10);
        }
      }

      this.monitoringResult.javascriptErrors.push(jsError);

      // Limit entries
      if (this.monitoringResult.javascriptErrors.length > this.maxEntries) {
        this.monitoringResult.javascriptErrors.shift();
      }
    };

    this.page.on("pageerror", errorHandler);
    this.cleanupFunctions.push(() => this.page.off("pageerror", errorHandler));
  }

  private setupPerformanceMonitoring() {
    // Capture basic performance timing on page load
    const captureTimingMetrics = () => {
      if (this.page.url()) {
        const timestamp = Date.now();
        // Capture navigation timing if available
        this.page
          .evaluate(() => {
            if (window.performance.timing) {
              const timing = window.performance.timing;
              return {
                domContentLoaded:
                  timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                firstPaint:
                  window.performance
                    .getEntriesByType("paint")
                    .find((e) => e.name === "first-paint")?.startTime || 0,
                firstContentfulPaint:
                  window.performance
                    .getEntriesByType("paint")
                    .find((e) => e.name === "first-contentful-paint")
                    ?.startTime || 0,
              };
            }
            return null;
          })
          .then((timing: any) => {
            if (timing) {
              Object.entries(timing).forEach(([name, value]) => {
                if (typeof value === "number" && value > 0) {
                  this.monitoringResult.performanceMetrics.push({
                    name,
                    value,
                    timestamp,
                  });
                }
              });
            }
          })
          .catch(() => {}); // Ignore errors in performance capture
      }
    };

    // Capture timing metrics after page load
    this.page.on("load", captureTimingMetrics);

    this.cleanupFunctions.push(() =>
      this.page.off("load", captureTimingMetrics)
    );
  }

  startMonitoring(): void {
    this.monitoringActive = true;
    this.monitoringResult.monitoringActive = true;
    this.monitoringResult.startTime = Date.now();
  }

  stopMonitoring(): MonitoringResult {
    this.monitoringActive = false;
    this.monitoringResult.monitoringActive = false;
    this.monitoringResult.endTime = Date.now();

    // Clean up event listeners
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    return { ...this.monitoringResult };
  }

  isMonitoringActive(): boolean {
    return this.monitoringActive;
  }

  getCurrentResult(): MonitoringResult {
    return {
      ...this.monitoringResult,
      monitoringActive: this.monitoringActive,
    };
  }

  clearLogs(): void {
    this.monitoringResult.consoleLogs = [];
    this.monitoringResult.networkRequests = [];
    this.monitoringResult.javascriptErrors = [];
    this.monitoringResult.performanceMetrics = [];
  }

  // Filter methods for retrieving specific data
  getFilteredConsoleLogs(filter?: {
    type?: string;
    textPattern?: string;
  }): ConsoleMessage[] {
    let logs = this.monitoringResult.consoleLogs;

    if (filter?.type) {
      logs = logs.filter((log) => log.type === filter.type);
    }

    if (filter?.textPattern) {
      const regex = new RegExp(filter.textPattern, "i");
      logs = logs.filter((log) => regex.test(log.text));
    }

    return logs;
  }

  getFilteredNetworkRequests(filter?: {
    method?: string;
    status?: number;
    urlPattern?: string;
  }): NetworkRequest[] {
    let requests = this.monitoringResult.networkRequests;

    if (filter?.method) {
      requests = requests.filter((req) => req.method === filter.method);
    }

    if (filter?.status) {
      requests = requests.filter((req) => req.status === filter.status);
    }

    if (filter?.urlPattern) {
      const regex = new RegExp(filter.urlPattern, "i");
      requests = requests.filter((req) => regex.test(req.url));
    }

    return requests;
  }

  getErrors(): JavaScriptError[] {
    return [...this.monitoringResult.javascriptErrors];
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.monitoringResult.performanceMetrics];
  }

  // Summary methods
  getSummary(): {
    totalConsoleLogs: number;
    totalNetworkRequests: number;
    totalErrors: number;
    totalPerformanceMetrics: number;
    monitoringDuration?: number;
  } {
    const summary: {
      totalConsoleLogs: number;
      totalNetworkRequests: number;
      totalErrors: number;
      totalPerformanceMetrics: number;
      monitoringDuration?: number;
    } = {
      totalConsoleLogs: this.monitoringResult.consoleLogs.length,
      totalNetworkRequests: this.monitoringResult.networkRequests.length,
      totalErrors: this.monitoringResult.javascriptErrors.length,
      totalPerformanceMetrics: this.monitoringResult.performanceMetrics.length,
    };

    if (this.monitoringResult.endTime && this.monitoringResult.startTime) {
      summary.monitoringDuration =
        this.monitoringResult.endTime - this.monitoringResult.startTime;
    }

    return summary;
  }
}
