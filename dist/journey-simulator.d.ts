import { Page } from "playwright";
export interface JourneyStep {
    id: string;
    action: "navigate" | "click" | "type" | "wait" | "assert" | "screenshot";
    selector?: string;
    value?: string;
    condition?: () => Promise<boolean>;
    timeout?: number;
    retryCount?: number;
    onError?: "continue" | "retry" | "fail";
    description?: string;
}
export interface RecordingOptions {
    name: string;
    description?: string;
    filter?: {
        excludeSelectors?: string[];
        excludeActions?: ("scroll" | "hover" | "focus")[];
        minInteractionDelay?: number;
    };
    autoSelectors?: boolean;
}
export interface RecordingSession {
    id: string;
    name: string;
    options: RecordingOptions;
    steps: JourneyStep[];
    startTime: Date;
    isRecording: boolean;
    currentUrl?: string;
    page?: Page;
}
export interface SelectorSuggestion {
    selector: string;
    type: "css" | "xpath" | "text" | "aria";
    reliability: number;
    element: string;
}
export interface JourneyOptions {
    name: string;
    steps: JourneyStep[];
    onStepComplete?: (step: JourneyStep, result: any) => void;
    onError?: (error: Error, step: JourneyStep) => void;
    maxDuration?: number;
    baseUrl?: string;
}
export interface JourneyResult {
    success: boolean;
    duration: number;
    completedSteps: number;
    totalSteps: number;
    errors: JourneyError[];
    screenshots: string[];
    performanceMetrics?: {
        totalTime: number;
        averageStepTime: number;
        slowestStep: {
            stepId: string;
            duration: number;
        };
    };
}
export interface JourneyError {
    stepId: string;
    stepIndex: number;
    error: string;
    timestamp: number;
    screenshot?: string;
}
export interface JourneyDefinition {
    name: string;
    description?: string;
    steps: JourneyStep[];
    created: Date;
    modified: Date;
    source?: "manual" | "recorded";
    recordedFrom?: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class JourneySimulator {
    private page;
    private isRunning;
    private currentJourney;
    constructor(page?: Page);
    setPage(page: Page): void;
    runJourney(options: JourneyOptions): Promise<JourneyResult>;
    private executeStep;
    private takeScreenshot;
    recordJourney(name: string): Promise<JourneyDefinition>;
    validateJourney(journey: JourneyDefinition): Promise<ValidationResult>;
    optimizeJourney(journey: JourneyDefinition): Promise<JourneyDefinition>;
    isJourneyRunning(): boolean;
    getCurrentJourney(): JourneyOptions | null;
    stopJourney(): Promise<void>;
}
