import { Page } from "playwright";
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
export declare class BrowserMonitor {
    private page;
    private isMonitoring;
    private startTime;
    private consoleEntries;
    private networkEntries;
    private errorEntries;
    private monitoringOptions;
    private performanceObserver;
    startMonitoring(page: Page, options?: MonitoringOptions): Promise<void>;
    stopMonitoring(): Promise<MonitoringResult>;
    getConsoleLogs(filter?: ConsoleFilter): Promise<ConsoleEntry[]>;
    getNetworkRequests(filter?: NetworkFilter): Promise<NetworkEntry[]>;
    getJavaScriptErrors(): Promise<ErrorEntry[]>;
    capturePerformanceMetrics(): Promise<PerformanceMetrics>;
    private setupConsoleMonitoring;
    private setupNetworkMonitoring;
    private setupErrorMonitoring;
    private setupPerformanceMonitoring;
    private clearEntries;
    isActive(): boolean;
    getMonitoringStats(): {
        isMonitoring: boolean;
        duration: number;
        consoleEntries: number;
        networkEntries: number;
        errorEntries: number;
    };
}
