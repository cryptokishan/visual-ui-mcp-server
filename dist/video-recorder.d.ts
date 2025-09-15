import { Page } from "playwright";
export interface VideoRecordingOptions {
    outputDir: string;
    videoFormat: "webm" | "mp4";
    maxDuration?: number;
    quality?: "low" | "medium" | "high";
    includeAudio?: boolean;
    fps?: number;
}
export interface RecordingMetadata {
    sessionId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    url: string;
    viewport: {
        width: number;
        height: number;
    };
    userAgent: string;
    actions: RecordingAction[];
    performanceMetrics?: {
        domLoadTime?: number;
        firstPaint?: number;
        loadComplete?: number;
    };
    errors: RecordingError[];
    screenshots: string[];
}
export interface RecordingAction {
    timestamp: number;
    action: string;
    selector?: string;
    value?: string;
    description?: string;
    screenshot?: string;
    success: boolean;
    errorMessage?: string;
}
export interface RecordingError {
    timestamp: number;
    stepId?: string;
    message: string;
    screenshot?: string;
}
export declare class VideoRecorder {
    private page;
    private isRecording;
    private recordingOptions;
    private sessionData;
    private startTime;
    private videoPath;
    private metadataPath;
    constructor(options: VideoRecordingOptions);
    setPage(page: Page): void;
    private generateSessionId;
    startRecording(): Promise<string>;
    private setupPerformanceMonitoring;
    captureAction(action: RecordingAction): Promise<string | null>;
    captureError(error: RecordingError): Promise<void>;
    stopRecording(): Promise<RecordingMetadata>;
    private takeScreenshot;
    private saveMetadata;
    pauseRecording(): Promise<void>;
    resumeRecording(): Promise<void>;
    isCurrentlyRecording(): boolean;
    getSessionData(): RecordingMetadata;
    getVideoPath(): string;
    getMetadataPath(): string;
    cleanup(): Promise<void>;
}
export declare function createJourneyVideoRecorder(page: Page, journeyName: string): VideoRecorder;
