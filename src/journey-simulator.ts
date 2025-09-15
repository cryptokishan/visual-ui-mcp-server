import { Page } from "playwright";
import { VideoRecorder, createJourneyVideoRecorder } from "./video-recorder.js";

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

export class JourneySimulator {
  private page: Page | null = null;
  private isRunning = false;
  private currentJourney: JourneyOptions | null = null;
  private videoRecorder: VideoRecorder | null = null;

  constructor(page?: Page) {
    this.page = page || null;
  }

  setPage(page: Page): void {
    this.page = page;
  }

  async runJourney(options: JourneyOptions): Promise<JourneyResult> {
    if (!this.page) {
      throw new Error(
        "No page instance available. Set page first or pass it to constructor."
      );
    }

    if (this.isRunning) {
      throw new Error(
        "A journey is already running. Wait for it to complete or stop it first."
      );
    }

    this.isRunning = true;
    this.currentJourney = options;

    // Generate unique journey ID
    const journeyId = `journey_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Initialize video recording if enabled
    let recordingSessionId: string | null = null;
    if (options.recording?.enabled) {
      try {
        this.videoRecorder = createJourneyVideoRecorder(
          this.page,
          options.name
        );
        recordingSessionId = await this.videoRecorder.startRecording();
        console.log(
          `🎥 Started recording journey "${options.name}" with session ID: ${recordingSessionId}`
        );
      } catch (error) {
        console.warn(`Failed to start video recording: ${String(error)}`);
      }
    }

    const startTime = Date.now();
    const errors: JourneyError[] = [];
    const screenshots: string[] = [];
    const stepTimings: { stepId: string; duration: number }[] = [];

    try {
      let completedSteps = 0;

      for (let i = 0; i < options.steps.length; i++) {
        const step = options.steps[i];
        const stepStartTime = Date.now();

        try {
          // Check for timeout
          if (
            options.maxDuration &&
            Date.now() - startTime > options.maxDuration
          ) {
            throw new Error(
              `Journey timeout exceeded ${options.maxDuration}ms`
            );
          }

          // Execute step
          const result = await this.executeStep(step);

          // Record timing
          const stepDuration = Date.now() - stepStartTime;
          stepTimings.push({ stepId: step.id, duration: stepDuration });

          completedSteps++;

          // Call completion callback
          if (options.onStepComplete) {
            options.onStepComplete(step, result);
          }

          // Handle screenshots
          if (step.action === "screenshot" && result) {
            screenshots.push(result as string);
          }
        } catch (error) {
          const journeyError: JourneyError = {
            stepId: step.id,
            stepIndex: i,
            error: (error as Error).message,
            timestamp: Date.now(),
          };

          // Take error screenshot if possible
          try {
            const screenshotPath = await this.takeScreenshot(
              `error_${step.id}_${Date.now()}`
            );
            journeyError.screenshot = screenshotPath;
            screenshots.push(screenshotPath);
          } catch (screenshotError) {
            // Ignore screenshot errors
          }

          errors.push(journeyError);

          // Handle error based on step configuration
          if (step.onError === "fail") {
            throw error;
          } else if (
            step.onError === "retry" &&
            step.retryCount &&
            step.retryCount > 0
          ) {
            // Retry logic would go here
            let retryCount = 0;
            while (retryCount < step.retryCount) {
              try {
                await this.executeStep(step);
                break; // Success, exit retry loop
              } catch (retryError) {
                retryCount++;
                if (retryCount >= step.retryCount) {
                  throw retryError; // All retries failed
                }
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s between retries
              }
            }
          } else if (step.onError === "continue") {
            // Continue to next step
            continue;
          } else {
            // Default behavior: fail
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      // Calculate performance metrics
      const performanceMetrics = {
        totalTime: duration,
        averageStepTime:
          stepTimings.reduce((sum, timing) => sum + timing.duration, 0) /
          stepTimings.length,
        slowestStep: stepTimings.reduce(
          (slowest, current) =>
            current.duration > slowest.duration ? current : slowest,
          { stepId: "", duration: 0 }
        ),
      };

      // Stop video recording if enabled
      let recordingResult;
      if (this.videoRecorder && recordingSessionId) {
        try {
          const metadata = await this.videoRecorder.stopRecording();
          recordingResult = {
            sessionId: recordingSessionId,
            videoPath: this.videoRecorder.getVideoPath(),
            metadataPath: this.videoRecorder.getMetadataPath(),
            recordedActions: metadata.actions.length,
            recordedErrors: metadata.errors.length,
          };
          console.log(
            `🎥 Stopped recording journey "${options.name}". Recorded ${metadata.actions.length} actions.`
          );
        } catch (error) {
          console.warn(`Failed to stop recording: ${String(error)}`);
        } finally {
          this.videoRecorder = null;
        }
      }

      return {
        success: errors.length === 0,
        duration,
        completedSteps,
        totalSteps: options.steps.length,
        errors,
        screenshots,
        journeyId,
        performanceMetrics,
        recording: recordingResult,
      };
    } finally {
      this.isRunning = false;
      this.currentJourney = null;
      // Ensure video recorder is cleaned up
      if (this.videoRecorder) {
        try {
          await this.videoRecorder.cleanup();
        } catch (error) {
          console.warn(`Error cleaning up video recorder: ${String(error)}`);
        }
        this.videoRecorder = null;
      }
    }
  }

  private async executeStep(step: JourneyStep): Promise<any> {
    if (!this.page) {
      throw new Error("No page instance available");
    }

    const shouldCaptureAction =
      this.currentJourney?.recording?.enabled &&
      (this.currentJourney.recording.captureAllActions ||
        step.action === "screenshot");

    // Capture action start
    if (shouldCaptureAction && this.videoRecorder) {
      await this.videoRecorder.captureAction({
        timestamp: Date.now(),
        action: step.action,
        selector: step.selector,
        value: step.value,
        description:
          step.description ||
          `${step.action} action on journey step ${step.id}`,
        screenshot: step.action === "screenshot" ? "will_be_taken" : undefined,
        success: true,
        errorMessage: undefined,
      });
    }

    try {
      let result;

      switch (step.action) {
        case "navigate":
          if (!step.value) {
            throw new Error("Navigate action requires a URL value");
          }
          const url = step.value.startsWith("http")
            ? step.value
            : this.currentJourney?.baseUrl
            ? `${this.currentJourney.baseUrl}${step.value}`
            : step.value;
          await this.page.goto(url, { timeout: step.timeout || 30000 });
          result = url;
          break;

        case "click":
          if (!step.selector) {
            throw new Error("Click action requires a selector");
          }
          await this.page.click(step.selector, {
            timeout: step.timeout || 10000,
          });
          result = step.selector;
          break;

        case "type":
          if (!step.selector || step.value === undefined) {
            throw new Error("Type action requires a selector and value");
          }
          await this.page.fill(step.selector, "", {
            timeout: step.timeout || 10000,
          }); // Clear first
          await this.page.fill(step.selector, step.value, {
            timeout: step.timeout || 10000,
          });
          result = step.value;
          break;

        case "wait":
          if (step.condition) {
            await this.page.waitForFunction(step.condition, {
              timeout: step.timeout || 10000,
            });
            result = true;
          } else if (step.selector) {
            await this.page.waitForSelector(step.selector, {
              timeout: step.timeout || 10000,
            });
            result = step.selector;
          } else {
            await new Promise((resolve) =>
              setTimeout(resolve, step.timeout || 1000)
            );
            result = true;
          }
          break;

        case "assert":
          if (!step.condition) {
            throw new Error("Assert action requires a condition function");
          }
          // If condition is a string, evaluate it in the page context
          if (typeof step.condition === "string") {
            result = await this.page.evaluate(
              new Function("return " + step.condition)()
            );
          } else {
            result = await this.page.evaluate(step.condition);
          }
          if (!result) {
            throw new Error(`Assertion failed for step ${step.id}`);
          }
          break;

        case "screenshot":
          const screenshotName =
            step.value || `journey_step_${step.id}_${Date.now()}`;
          result = await this.takeScreenshot(screenshotName);
          break;

        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      // Capture successful action completion
      if (shouldCaptureAction && this.videoRecorder) {
        await this.videoRecorder.captureAction({
          timestamp: Date.now(),
          action: step.action,
          selector: step.selector,
          value: step.value,
          description: `${step.action} action completed successfully`,
          screenshot: undefined,
          success: true,
          errorMessage: undefined,
        });
      }

      return result;
    } catch (error) {
      // Capture failed action
      if (shouldCaptureAction && this.videoRecorder) {
        await this.videoRecorder.captureError({
          timestamp: Date.now(),
          stepId: step.id,
          message: `Step ${step.id} failed: ${(error as Error).message}`,
          screenshot: undefined,
        });
      }
      throw error;
    }
  }

  private async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error("No page instance available");
    }

    const timestamp = Date.now();
    const journeyId = this.currentJourney ? `journey_${this.currentJourney.name.slice(0, 10).replace(/\s+/g, '_')}_${timestamp}` : "";
    const screenshotName = journeyId ? `${journeyId}_${name}` : name;
    const screenshotBuffer = await this.page.screenshot({ fullPage: true });

    // Create organized screenshot directory structure
    let screenshotPath = `screenshots/journeys/${screenshotName}.png`;

    // For journeys, organize by journey name and journey ID
    if (this.currentJourney) {
      // Generate journey directory path
      const journeyNameClean = this.currentJourney.name.replace(/[^a-zA-Z0-9]/g, '_');
      const journeyDir = `screenshots/journeys/${journeyNameClean}`;

      // Create journey-specific directory
      const fs = await import('fs');
      if (!fs.existsSync(journeyDir)) {
        fs.mkdirSync(journeyDir, { recursive: true });
      }

      screenshotPath = `${journeyDir}/${screenshotName}.png`;
    }

    // Ensure directory exists
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.dirname(screenshotPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(screenshotPath, screenshotBuffer);
    return screenshotPath;
  }

  async recordJourney(name: string): Promise<JourneyDefinition> {
    if (!this.page) {
      throw new Error("No page instance available");
    }

    // This would implement journey recording functionality
    // For now, return a basic structure
    const definition: JourneyDefinition = {
      name,
      description: `Recorded journey: ${name}`,
      steps: [],
      created: new Date(),
      modified: new Date(),
    };

    return definition;
  }

  async validateJourney(journey: JourneyDefinition): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!journey.name || journey.name.trim() === "") {
      errors.push("Journey name is required");
    }

    if (!journey.steps || journey.steps.length === 0) {
      errors.push("Journey must have at least one step");
    }

    // Validate each step
    journey.steps.forEach((step, index) => {
      if (!step.id || step.id.trim() === "") {
        errors.push(`Step ${index + 1}: ID is required`);
      }

      if (!step.action) {
        errors.push(`Step ${step.id || index + 1}: Action is required`);
      }

      // Action-specific validation
      switch (step.action) {
        case "navigate":
          if (!step.value) {
            errors.push(
              `Step ${step.id}: Navigate action requires a URL value`
            );
          }
          break;
        case "click":
        case "type":
          if (!step.selector) {
            errors.push(
              `Step ${step.id}: ${step.action} action requires a selector`
            );
          }
          if (step.action === "type" && step.value === undefined) {
            errors.push(`Step ${step.id}: Type action requires a value`);
          }
          break;
        case "assert":
          if (!step.condition) {
            errors.push(
              `Step ${step.id}: Assert action requires a condition function`
            );
          }
          break;
      }

      // Warnings
      if (!step.description) {
        warnings.push(
          `Step ${step.id}: Consider adding a description for clarity`
        );
      }

      if (step.timeout && step.timeout > 30000) {
        warnings.push(
          `Step ${step.id}: Timeout of ${step.timeout}ms is quite long`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async optimizeJourney(
    journey: JourneyDefinition
  ): Promise<JourneyDefinition> {
    // Basic optimization: remove redundant waits, optimize timeouts
    const optimizedSteps = journey.steps.map((step) => ({
      ...step,
      timeout: step.timeout || 10000, // Set default timeout
    }));

    return {
      ...journey,
      steps: optimizedSteps,
      modified: new Date(),
    };
  }

  isJourneyRunning(): boolean {
    return this.isRunning;
  }

  getCurrentJourney(): JourneyOptions | null {
    return this.currentJourney;
  }

  async stopJourney(): Promise<void> {
    this.isRunning = false;
    this.currentJourney = null;
  }
}
