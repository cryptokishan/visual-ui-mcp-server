import { Page } from "playwright";
import { PerformanceMonitor, CoreWebVitals, PageLoadAnalysis, ResourceTiming, MemoryUsage } from "./performance-monitor.js";

export interface ConsoleFilter {
  level?: 'log' | 'info' | 'warn' | 'error';
  source?: string;
  message?: RegExp;
}

export interface NetworkFilter {
  url?: RegExp;
  method?: string;
  status?: number;
  resourceType?: string;
}

export interface MonitoringOptions {
  consoleFilter?: ConsoleFilter;
  networkFilter?: NetworkFilter;
  captureScreenshots?: boolean;
  maxEntries?: number;
}

export interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  source?: string;
}

export interface NetworkEntry {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
  duration?: number;
  failed?: boolean;
  error?: string;
  resourceType?: string;
  size?: number;
}

export interface ErrorEntry {
  type: 'javascript' | 'network' | 'console';
  message: string;
  timestamp: number;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  stack?: string;
  url?: string;
  method?: string;
  status?: number;
}

export interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  navigationTiming: {
    fetchStart: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    connectStart: number;
    connectEnd: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    domInteractive: number;
    domContentLoadedEventStart: number;
    domContentLoadedEventEnd: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;
  };
  resourceTiming: Array<{
    name: string;
    initiatorType: string;
    duration: number;
    size?: number;
    startTime: number;
  }>;
}

export interface MonitoringResult {
  consoleEntries: ConsoleEntry[];
  networkEntries: NetworkEntry[];
  errorEntries: ErrorEntry[];
  performanceMetrics: PerformanceMetrics;
  monitoringDuration: number;
  totalRequests: number;
  failedRequests: number;
  consoleMessages: number;
  errors: number;
}

export class BrowserMonitor {
  private page: Page | null = null;
  private isMonitoring = false;
  private startTime = 0;
  private consoleEntries: ConsoleEntry[] = [];
  private networkEntries: NetworkEntry[] = [];
  private errorEntries: ErrorEntry[] = [];
  private monitoringOptions: MonitoringOptions = {};
  private performanceObserver: any = null;
  private performanceMonitor: PerformanceMonitor | null = null;

  async startMonitoring(page: Page, options: MonitoringOptions = {}): Promise<void> {
    if (this.isMonitoring) {
      throw new Error("Monitoring is already active. Stop current monitoring first.");
    }

    this.page = page;
    this.monitoringOptions = {
      maxEntries: 1000,
      captureScreenshots: false,
      ...options,
    };

    this.isMonitoring = true;
    this.startTime = Date.now();
    this.clearEntries();

    await this.setupConsoleMonitoring();
    await this.setupNetworkMonitoring();
    await this.setupErrorMonitoring();
    await this.setupPerformanceMonitoring();
  }

  async stopMonitoring(): Promise<MonitoringResult> {
    if (!this.isMonitoring) {
      throw new Error("No active monitoring session to stop.");
    }

    const monitoringDuration = Date.now() - this.startTime;

    // Clean up listeners
    if (this.page) {
      this.page.removeAllListeners('console');
      this.page.removeAllListeners('request');
      this.page.removeAllListeners('response');
      this.page.removeAllListeners('requestfailed');
      this.page.removeAllListeners('pageerror');
    }

    // Clean up performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    const performanceMetrics = await this.capturePerformanceMetrics();

    const result: MonitoringResult = {
      consoleEntries: [...this.consoleEntries],
      networkEntries: [...this.networkEntries],
      errorEntries: [...this.errorEntries],
      performanceMetrics,
      monitoringDuration,
      totalRequests: this.networkEntries.length,
      failedRequests: this.networkEntries.filter(req => req.failed || (req.status && req.status >= 400)).length,
      consoleMessages: this.consoleEntries.length,
      errors: this.errorEntries.length,
    };

    this.isMonitoring = false;
    this.page = null;

    return result;
  }

  async getConsoleLogs(filter?: ConsoleFilter): Promise<ConsoleEntry[]> {
    if (!this.isMonitoring) {
      throw new Error("Monitoring is not active. Start monitoring first.");
    }

    let filtered = [...this.consoleEntries];

    if (filter) {
      filtered = filtered.filter(entry => {
        if (filter.level && entry.type !== filter.level) return false;
        if (filter.source && entry.source !== filter.source) return false;
        if (filter.message && !filter.message.test(entry.text)) return false;
        return true;
      });
    }

    return filtered;
  }

  async getNetworkRequests(filter?: NetworkFilter): Promise<NetworkEntry[]> {
    if (!this.isMonitoring) {
      throw new Error("Monitoring is not active. Start monitoring first.");
    }

    let filtered = [...this.networkEntries];

    if (filter) {
      filtered = filtered.filter(entry => {
        if (filter.url && !filter.url.test(entry.url)) return false;
        if (filter.method && entry.method !== filter.method) return false;
        if (filter.status && entry.status !== filter.status) return false;
        if (filter.resourceType && entry.resourceType !== filter.resourceType) return false;
        return true;
      });
    }

    return filtered;
  }

  async getJavaScriptErrors(): Promise<ErrorEntry[]> {
    if (!this.isMonitoring) {
      throw new Error("Monitoring is not active. Start monitoring first.");
    }

    return [...this.errorEntries];
  }

  async capturePerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.page) {
      throw new Error("No active page for performance monitoring.");
    }

    try {
      // Initialize performance monitor if not already done
      if (!this.performanceMonitor) {
        this.performanceMonitor = new PerformanceMonitor();
      }

      // Get comprehensive performance analysis
      const pageLoadAnalysis = await this.performanceMonitor.analyzePageLoad(this.page);

      // Get Core Web Vitals
      const coreWebVitals = await this.performanceMonitor.measureCoreWebVitals(this.page);

      // Get resource timing
      const resourceTiming = await this.performanceMonitor.monitorResourceLoading(this.page);

      // Get memory usage (short tracking for immediate metrics)
      const memoryHistory = await this.performanceMonitor.trackMemoryUsage(this.page, 2000);
      const latestMemory = memoryHistory.length > 0 ? memoryHistory[memoryHistory.length - 1] : {
        used: 0,
        total: 0,
        limit: 0,
        usedPercent: 0,
        timestamp: Date.now()
      };

      return {
        domContentLoaded: pageLoadAnalysis.domContentLoaded,
        loadComplete: pageLoadAnalysis.loadComplete,
        firstPaint: pageLoadAnalysis.firstPaint,
        firstContentfulPaint: pageLoadAnalysis.firstContentfulPaint,
        largestContentfulPaint: coreWebVitals.lcp,
        cumulativeLayoutShift: coreWebVitals.cls,
        firstInputDelay: coreWebVitals.fid,
        navigationTiming: pageLoadAnalysis.navigationTiming,
        resourceTiming: resourceTiming.map(resource => ({
          name: resource.name,
          initiatorType: resource.initiatorType,
          duration: resource.duration,
          size: resource.size,
          startTime: resource.startTime,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to capture performance metrics: ${(error as Error).message}`);
    }
  }

  private async setupConsoleMonitoring(): Promise<void> {
    if (!this.page) return;

    this.page.on('console', (msg) => {
      const entry: ConsoleEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location(),
        source: 'console',
      };

      this.consoleEntries.push(entry);

      // Limit entries if maxEntries is set
      if (this.monitoringOptions.maxEntries && this.consoleEntries.length > this.monitoringOptions.maxEntries) {
        this.consoleEntries.shift();
      }
    });
  }

  private async setupNetworkMonitoring(): Promise<void> {
    if (!this.page) return;

    this.page.on('request', (request) => {
      const entry: NetworkEntry = {
        url: request.url(),
        method: request.method(),
        requestHeaders: request.headers(),
        timestamp: Date.now(),
        resourceType: request.resourceType(),
      };

      // Try to get request body
      try {
        const postData = request.postData();
        if (postData) {
          entry.requestBody = postData;
        }
      } catch (error) {
        // Some requests might not have readable body
      }

      this.networkEntries.push(entry);

      // Limit entries if maxEntries is set
      if (this.monitoringOptions.maxEntries && this.networkEntries.length > this.monitoringOptions.maxEntries) {
        this.networkEntries.shift();
      }
    });

    this.page.on('response', (response) => {
      const request = this.networkEntries.find(req => req.url === response.url());
      if (request) {
        request.status = response.status();
        request.statusText = response.statusText();
        request.responseHeaders = response.headers();
        request.duration = Date.now() - request.timestamp;

        // Calculate response size
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          request.size = parseInt(contentLength, 10);
        }

        // Try to get response body for certain content types
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json') || contentType.includes('text')) {
            response.text().then(body => {
              request.responseBody = body;
              if (!request.size && body) {
                request.size = new Blob([body]).size;
              }
            }).catch(() => {
              // Ignore errors in getting response body
            });
          }
        } catch (error) {
          // Ignore errors in getting response body
        }
      }
    });

    this.page.on('requestfailed', (request) => {
      const networkRequest = this.networkEntries.find(req => req.url === request.url());
      if (networkRequest) {
        networkRequest.failed = true;
        networkRequest.error = request.failure()?.errorText || 'Request failed';

        // Add to error entries
        const errorEntry: ErrorEntry = {
          type: 'network',
          message: networkRequest.error,
          timestamp: Date.now(),
          url: networkRequest.url,
          method: networkRequest.method,
          status: networkRequest.status,
        };
        this.errorEntries.push(errorEntry);
      }
    });
  }

  private async setupErrorMonitoring(): Promise<void> {
    if (!this.page) return;

    this.page.on('pageerror', (error) => {
      const errorEntry: ErrorEntry = {
        type: 'javascript',
        message: error.message,
        timestamp: Date.now(),
        stack: error.stack,
        location: {
          url: this.page?.url() || '',
          lineNumber: 0,
          columnNumber: 0,
        },
      };

      this.errorEntries.push(errorEntry);

      // Limit entries if maxEntries is set
      if (this.monitoringOptions.maxEntries && this.errorEntries.length > this.monitoringOptions.maxEntries) {
        this.errorEntries.shift();
      }
    });
  }

  private async setupPerformanceMonitoring(): Promise<void> {
    if (!this.page) return;

    // Set up performance observer for additional metrics
    await this.page.evaluate(() => {
      if (typeof PerformanceObserver !== 'undefined') {
        // Monitor Largest Contentful Paint
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            (window as any).__lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }

        // Monitor Cumulative Layout Shift
        try {
          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            (window as any).__cls = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not supported
        }

        // Monitor First Input Delay
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            (window as any).__fid = (lastEntry as any).processingStart - lastEntry.startTime;
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // FID not supported
        }
      }
    });
  }

  private clearEntries(): void {
    this.consoleEntries = [];
    this.networkEntries = [];
    this.errorEntries = [];
  }

  isActive(): boolean {
    return this.isMonitoring;
  }

  getMonitoringStats(): {
    isMonitoring: boolean;
    duration: number;
    consoleEntries: number;
    networkEntries: number;
    errorEntries: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      duration: this.isMonitoring ? Date.now() - this.startTime : 0,
      consoleEntries: this.consoleEntries.length,
      networkEntries: this.networkEntries.length,
      errorEntries: this.errorEntries.length,
    };
  }
}
