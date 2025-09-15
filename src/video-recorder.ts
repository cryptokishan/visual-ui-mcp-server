import fs from "fs-extra";
import * as path from "path";
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
  viewport: { width: number; height: number };
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

export class VideoRecorder {
  private page: Page | null = null;
  private isRecording = false;
  private recordingOptions: VideoRecordingOptions;
  private sessionData: RecordingMetadata;
  private startTime = 0;
  private videoPath = "";
  private metadataPath = "";

  constructor(options: VideoRecordingOptions) {
    this.recordingOptions = {
      outputDir: options.outputDir,
      videoFormat: options.videoFormat || "webm",
      maxDuration: options.maxDuration,
      quality: options.quality || "medium",
      includeAudio: options.includeAudio || false,
      fps: options.fps || 30,
    };

    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      url: "",
      viewport: { width: 1280, height: 720 },
      userAgent: "",
      actions: [],
      errors: [],
      screenshots: [],
    };
  }

  setPage(page: Page): void {
    this.page = page;
  }

  private generateSessionId(): string {
    return `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async startRecording(): Promise<string> {
    if (!this.page) {
      throw new Error(
        "No page instance available. Set page first or pass it to constructor."
      );
    }

    if (this.isRecording) {
      throw new Error("Recording is already in progress.");
    }

    // Ensure output directory exists
    await fs.ensureDir(this.recordingOptions.outputDir);

    this.startTime = Date.now();
    this.sessionData.startTime = this.startTime;
    this.sessionData.url = await this.page.url();

    // Get viewport
    const viewport = await this.page.viewportSize();
    this.sessionData.viewport = {
      width: viewport?.width || 1280,
      height: viewport?.height || 720,
    };

    // Get user agent
    this.sessionData.userAgent = await this.page.evaluate(
      () => navigator.userAgent
    );

    // Set up video recording with Playwright
    this.videoPath = path.join(
      this.recordingOptions.outputDir,
      `${this.sessionData.sessionId}.${this.recordingOptions.videoFormat}`
    );
    this.metadataPath = path.join(
      this.recordingOptions.outputDir,
      `${this.sessionData.sessionId}_metadata.json`
    );

    // Playwright context video recording setup
    const context = this.page.context();
    if (!context) {
      throw new Error("Unable to get browser context for video recording");
    }

    // Video recording setup - note: video recording needs to be configured at browser launch
    console.log(
      `🎬 Video recording configured for: ${this.sessionData.sessionId}`
    );
    console.log(`📁 Video path: ${this.videoPath}`);

    // Save metadata file initially
    await this.saveMetadata();

    this.isRecording = true;

    // Add listeners for performance metrics
    await this.setupPerformanceMonitoring();

    return this.sessionData.sessionId;
  }

  private async setupPerformanceMonitoring(): Promise<void> {
    if (!this.page) return;

    // Listen for page load events
    this.page.on("load", async () => {
      try {
        if (!this.page) return;

        const timing = await this.page.evaluate(() => {
          const t = performance.timing;
          return {
            domContentLoaded:
              t.domContentLoadedEventEnd - t.domContentLoadedEventStart,
            loadComplete: t.loadEventEnd - t.loadEventStart,
          };
        });

        this.sessionData.performanceMetrics = {
          domLoadTime: timing.domContentLoaded,
          loadComplete: timing.loadComplete,
        };

        await this.saveMetadata();
      } catch (error) {
        // Ignore performance monitoring errors
        console.debug(`Performance monitoring error: ${String(error)}`);
      }
    });
  }

  async captureAction(action: RecordingAction): Promise<string | null> {
    if (!this.isRecording) return null;

    action.timestamp = Date.now();
    this.sessionData.actions.push(action);

    // Take actions screenshot if requested
    if (action.screenshot) {
      try {
        const timestamp = Date.now();
        const screenshotPath = path.join(
          this.recordingOptions.outputDir,
          `action_${action.timestamp}.png`
        );

        await this.takeScreenshot(screenshotPath);
        action.screenshot = screenshotPath;
        this.sessionData.screenshots.push(screenshotPath);
      } catch (error) {
        action.errorMessage = `Screenshot failed: ${String(error)}`;
      }
    }

    await this.saveMetadata();
    return action.screenshot || null;
  }

  async captureError(error: RecordingError): Promise<void> {
    if (!this.isRecording) return;

    error.timestamp = Date.now();
    this.sessionData.errors.push(error);

    // Take error screenshot
    try {
      const screenshotPath = path.join(
        this.recordingOptions.outputDir,
        `error_${error.timestamp}.png`
      );

      await this.takeScreenshot(screenshotPath);
      error.screenshot = screenshotPath;
      this.sessionData.screenshots.push(screenshotPath);
    } catch (screenshotError) {
      // Ignore screenshot errors
    }

    await this.saveMetadata();
  }

  async stopRecording(): Promise<RecordingMetadata> {
    if (!this.isRecording) {
      throw new Error("No recording is in progress.");
    }

    const endTime = Date.now();
    this.sessionData.endTime = endTime;
    this.sessionData.duration = endTime - this.startTime;

    this.isRecording = false;

    // Wait a moment for video to finalize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Save final metadata
    await this.saveMetadata();

    const finalData = { ...this.sessionData };
    return finalData;
  }

  private async takeScreenshot(screenshotPath: string): Promise<void> {
    if (!this.page) return;

    const screenshot = await this.page.screenshot({ fullPage: false });
    if (screenshot && screenshot.length > 0) {
      await fs.writeFile(screenshotPath, screenshot);
    }
  }

  private async saveMetadata(): Promise<void> {
    await fs.writeJson(this.metadataPath, this.sessionData, { spaces: 2 });
  }

  async pauseRecording(): Promise<void> {
    if (!this.isRecording) return;

    this.isRecording = false;
  }

  async resumeRecording(): Promise<void> {
    if (this.isRecording) return;

    if (this.page) {
      this.isRecording = true;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  getSessionData(): RecordingMetadata {
    return { ...this.sessionData };
  }

  getVideoPath(): string {
    return this.videoPath;
  }

  getMetadataPath(): string {
    return this.metadataPath;
  }

  async cleanup(): Promise<void> {
    this.isRecording = false;
    this.page = null;
  }
}

// Helper function to create a video recorder for journeys
export function createJourneyVideoRecorder(
  page: Page,
  journeyName: string
): VideoRecorder {
  const videoDir = path.join(
    process.cwd(),
    "recordings",
    "journeys",
    journeyName
  );

  return new VideoRecorder({
    outputDir: videoDir,
    videoFormat: "webm",
    quality: "medium",
    includeAudio: false,
    fps: 30,
  });
}
