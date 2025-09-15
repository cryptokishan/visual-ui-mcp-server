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
export interface JourneyOptions {
    name: string;
    steps: JourneyStep[];
    onStepComplete?: (step: JourneyStep, result: any) => void;
    onError?: (error: Error, step: JourneyStep) => void;
    maxDuration?: number;
    baseUrl?: string;
    recording?: {
        enabled: boolean;
        recordVideo?: boolean;
        recordScreenshots?: boolean;
        outputDir?: string;
        captureAllActions?: boolean;
        metadataFormat?: "json" | "detailed";
    };
}
export interface JourneyResult {
    success: boolean;
    duration: number;
    completedSteps: number;
    totalSteps: number;
    errors: JourneyError[];
    screenshots: string[];
    journeyId: string;
    performanceMetrics?: {
        totalTime: number;
        averageStepTime: number;
        slowestStep: {
            stepId: string;
            duration: number;
        };
    };
    recording?: {
        sessionId: string;
        videoPath?: string;
        metadataPath: string;
        recordedActions: number;
        recordedErrors: number;
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
    private videoRecorder;
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
