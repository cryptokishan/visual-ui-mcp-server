export interface SessionState {
    browserLaunched: boolean;
    monitoringActive: boolean;
    mockingActive: boolean;
    lastActivity: Date;
    activeTools: string[];
}
export declare class AgentFriendlyError extends Error {
    code: string;
    recoverySuggestion: string;
    canRetry: boolean;
    constructor(code: string, message: string, recoverySuggestion: string, canRetry?: boolean);
}
export interface FilePaths {
    logFile: string;
    sessionFile: string;
}
export interface ToolContext {
    name: string;
    arguments?: any;
    startTime: number;
}
export interface ServerComponents {
    browserInstance?: any;
    elementLocator?: any;
    formHandler?: any;
    browserMonitor?: any;
    journeySimulator?: any;
    performanceMonitor?: any;
}
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
export interface JourneyDefinition {
    name: string;
    steps: JourneyStep[];
    onStepComplete?: (step: any, result: any) => void;
    onError?: (error: any, step: any) => void;
    maxDuration?: number;
    baseUrl?: string;
}
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
export interface MockConfig {
    name: string;
    description?: string;
    rules: MockRule[];
    enabled?: boolean;
}
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
export interface ScreenshotOptions {
    format?: "png" | "jpeg" | "webp";
    quality?: number;
    padding?: number;
}
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
export interface FormField {
    selector: string;
    value: string;
    type?: "text" | "password" | "email" | "number" | "checkbox" | "radio" | "select";
    clearFirst?: boolean;
}
export interface ServerState {
    browserLaunched: boolean;
    monitoringActive: boolean;
    mockingActive: boolean;
    activeTools: string[];
    lastActivity: Date;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
