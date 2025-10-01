import { Page } from "playwright";
export interface CoreWebVitals {
    cls: number;
    fid: number;
    lcp: number;
}
export interface PageLoadAnalysis {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
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
    resourceTiming: ResourceTiming[];
}
export interface ResourceTiming {
    name: string;
    initiatorType: string;
    duration: number;
    size?: number;
    startTime: number;
    transferSize?: number;
    decodedBodySize?: number;
    encodedBodySize?: number;
}
export interface MemoryUsage {
    timestamp: number;
    used: number;
    total: number;
    limit: number;
    usedPercent: number;
}
export interface RegressionReport {
    isRegression: boolean;
    changes: {
        metric: string;
        baseline: number;
        current: number;
        change: number;
        changePercent: number;
        threshold: number;
    }[];
    summary: string;
}
export interface PerformanceMetrics {
    coreWebVitals: CoreWebVitals;
    timing: PageLoadAnalysis;
    resources: ResourceTiming[];
    memory: MemoryUsage;
    timestamp: number;
}
export declare class PerformanceMonitor {
    private page;
    private performanceObserver;
    private memoryInterval;
    private coreWebVitals;
    private memoryHistory;
    measureCoreWebVitals(page: Page): Promise<CoreWebVitals>;
    analyzePageLoad(page: Page): Promise<PageLoadAnalysis>;
    monitorResourceLoading(page: Page): Promise<ResourceTiming[]>;
    trackMemoryUsage(page: Page, duration?: number): Promise<MemoryUsage[]>;
    detectPerformanceRegression(baseline: PerformanceMetrics, current: PerformanceMetrics): Promise<RegressionReport>;
    getComprehensiveMetrics(page: Page): Promise<PerformanceMetrics>;
    private setupCoreWebVitalsObservers;
    private cleanupObservers;
}
