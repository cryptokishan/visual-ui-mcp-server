import { Page } from "playwright";
import { log } from "../utils/logger.js";
import { ElementLocator } from "./element-locator.js";

export interface JourneyStep {
  id: string;
  action: "navigate" | "click" | "type" | "wait" | "assert" | "screenshot";
  selector?: string;
  value?: string;
  condition?: string; // JS expression
  timeout?: number;
  retryCount?: number;
  onError?: "continue" | "retry" | "fail";
}

export interface JourneyOptions {
  name: string;
  steps: JourneyStep[];
  onStepComplete?: (step: JourneyStep, result: any) => void;
  onError?: (error: Error, step: JourneyStep) => void;
  maxDuration?: number;
  video?: boolean; // Enable video recording during journey execution
}

export interface JourneyResult {
  success: boolean;
  timings: Record<string, number>;
  errors: Error[];
  screenshots?: string[];
  video?: string; // Video file path if recording was enabled
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stepCount: number;
}

export interface OptimizationResult {
  originalStepCount: number;
  optimizedStepCount: number;
  optimizationsApplied: number;
  optimizedSteps: JourneyStep[];
  summary: string;
}

export class JourneySimulator {
  private page: Page;
  private elementLocator: ElementLocator;

  constructor(page: Page) {
    this.page = page;
    this.elementLocator = new ElementLocator();
  }

  /**
   * Executes a predefined user journey with multiple sequential steps
   */
  async runJourney(options: JourneyOptions): Promise<JourneyResult> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    const errors: Error[] = [];
    const screenshots: string[] = [];
    let videoPath: string | undefined;

    try {
      // Video recording is set up at the browser context level when the tool creates the browser
      // We just log here to inform about video recording status
      if (options.video) {
        log.info("Video recording enabled for journey execution");
      }

      for (const step of options.steps) {
        const stepStartTime = Date.now();

        try {
          // Check step condition if provided
          if (step.condition) {
            const conditionMet = await this.page.evaluate(step.condition);
            if (!conditionMet) {
              continue; // Skip step if condition not met
            }
          }

          await this.executeStep(step);
          timings[step.id] = Date.now() - stepStartTime;

          // Handle step completion callback
          if (options.onStepComplete) {
            const result =
              step.action === "screenshot"
                ? await this.captureScreenshot()
                : null;
            if (result) screenshots.push(result);
            options.onStepComplete(step, result);
          }
        } catch (error) {
          const stepError =
            error instanceof Error ? error : new Error(String(error));
          errors.push(stepError);

          // Handle error based on strategy
          const errorStrategy = step.onError || "fail";
          if (errorStrategy === "continue") {
            continue;
          } else if (errorStrategy === "retry" && (step.retryCount || 0) > 0) {
            // Implement retry logic here
            continue;
          } else {
            // fail - call error callback and break
            if (options.onError) {
              options.onError(stepError, step);
            }
            break;
          }
        }
      }

      // If video recording was enabled, get the video file path
      if (options.video) {
        try {
          // Wait a moment for video to finish writing
          await this.page.waitForTimeout(1000);
          videoPath = await this.getVideoFilePath();
          log.info(`Video recorded: ${videoPath}`);
        } catch (videoError) {
          log.warn("Failed to get video file path", videoError);
        }
      }

      const result: JourneyResult = {
        success: errors.length === 0,
        timings,
        errors,
        screenshots,
      };

      result.video = videoPath;

      return result;
    } catch (error) {
      // If video recording was enabled, still try to get the video path even on error
      if (options.video) {
        try {
          videoPath = await this.getVideoFilePath();
          log.info(`Video recorded (journey failed): ${videoPath}`);
        } catch (videoError) {
          log.warn("Failed to get video file path on error", videoError);
        }
      }

      const errorResult: JourneyResult = {
        success: false,
        timings,
        errors: [error instanceof Error ? error : new Error(String(error))],
        screenshots,
      };

      errorResult.video = videoPath;

      return errorResult;
    }
  }

  /**
   * Gets the video file path from the browser context
   * Returns undefined if video recording is not available (e.g., headless mode)
   */
  private async getVideoFilePath(): Promise<string | undefined> {
    try {
      const videos = this.page.video();
      if (videos) {
        const path = await videos.path();
        return path;
      }
      // In headless mode or when video recording is not available, videos will be null
      log.info(
        "Video recording not available (headless mode or not supported)"
      );
    } catch (error) {
      // Video recording not supported in this environment (headless mode)
      log.info("Video recording not supported in this environment");
    }
    return undefined;
  }

  /**
   * Executes a single journey step
   */
  private async executeStep(step: JourneyStep): Promise<void> {
    switch (step.action) {
      case "navigate":
        if (!step.value) throw new Error("Navigate step requires a URL value");
        const navTimeout = step.timeout || 30000;
        await this.page.goto(step.value, {
          waitUntil: "domcontentloaded",
          timeout: navTimeout,
        });
        break;

      case "click":
        if (!step.selector) throw new Error("Click step requires a selector");

        // Use ElementLocator for robust element finding with proper timeout
        const element = await this.elementLocator.locate(this.page, {
          selector: step.selector,
          timeout: step.timeout || 5000, // Respect step timeout, default to 5s instead of 10s
          visibilityCheck: true, // Check element is interactable
        });

        if (!element) {
          throw new Error(
            `Element '${step.selector}' not found or not clickable`
          );
        }

        // Use Playwright's native click with appropriate timeout
        await element.click({ timeout: 2000 });
        break;

      case "type":
        if (!step.selector || step.value === undefined) {
          throw new Error("Type step requires both selector and value");
        }

        // Use ElementLocator for robust element finding with proper timeout
        const typeElement = await this.elementLocator.locate(this.page, {
          selector: step.selector,
          timeout: step.timeout || 5000, // Respect step timeout, default to 5s
          visibilityCheck: true,
        });

        if (!typeElement) {
          throw new Error(
            `Element '${step.selector}' not found or not fillable`
          );
        }

        // Use Playwright's native fill with appropriate timeout
        await typeElement.fill(step.value, { timeout: 2000 });
        break;

      case "wait":
        if (step.condition) {
          await this.page.waitForFunction(step.condition, {
            timeout: step.timeout || 10000,
          });
        } else if (step.value) {
          await this.page.waitForTimeout(parseInt(step.value));
        } else {
          throw new Error(
            "Wait step requires either condition or timeout value"
          );
        }
        break;

      case "assert":
        if (!step.condition)
          throw new Error("Assert step requires a condition");
        const result = await this.page.evaluate(step.condition);
        if (!result) {
          throw new Error(`Assertion failed: ${step.condition}`);
        }
        break;

      case "screenshot":
        // Screenshot is handled in the main loop callback
        break;

      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  /**
   * Captures a screenshot and returns base64
   */
  private async captureScreenshot(): Promise<string> {
    const buffer = await this.page.screenshot({ type: "png" });
    return buffer.toString("base64");
  }

  /**
   * Public method for running user journey - main MCP interface
   */
  async runUserJourney(
    name: string,
    stepsJson: string,
    video: boolean = false
  ): Promise<
    JourneyResult & {
      journeyName: string;
      stepsExecuted: number;
      totalDuration: number;
      errorCount: number;
      stepTimings: Record<string, number>;
    }
  > {
    try {
      const parsedSteps: JourneyStep[] = this.parseSteps(stepsJson);
      if (!parsedSteps || parsedSteps.length === 0) {
        throw new Error("steps parameter must contain a valid non-empty array");
      }

      const journeyOptions: JourneyOptions = {
        name,
        steps: parsedSteps,
        video,
      };

      const journeyResult = await this.runJourney(journeyOptions);

      return {
        ...journeyResult,
        journeyName: name,
        stepsExecuted: parsedSteps.length,
        totalDuration: Object.values(journeyResult.timings).reduce(
          (sum, time) => sum + time,
          0
        ),
        errorCount: journeyResult.errors.length,
        stepTimings: journeyResult.timings,
      };
    } catch (error) {
      return {
        success: false,
        timings: {},
        errors: [error instanceof Error ? error : new Error(String(error))],
        screenshots: [],
        journeyName: name,
        stepsExecuted: 0,
        totalDuration: 0,
        errorCount: 1,
        stepTimings: {},
      };
    }
  }

  /**
   * Public method for validating journey definitions
   */
  async validateJourneyDefinition(
    stepsJson: string
  ): Promise<ValidationResult> {
    try {
      const parsedSteps: JourneyStep[] = this.parseSteps(stepsJson);
      if (!parsedSteps || parsedSteps.length === 0) {
        return {
          isValid: false,
          errors: ["steps parameter must contain a valid non-empty array"],
          warnings: [],
          stepCount: 0,
        };
      }

      return this.validateSteps(parsedSteps);
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        stepCount: 0,
      };
    }
  }

  /**
   * Public method for optimizing journey definitions
   */
  async optimizeJourneyDefinition(
    stepsJson: string
  ): Promise<OptimizationResult> {
    try {
      const parsedSteps: JourneyStep[] = this.parseSteps(stepsJson);
      if (!parsedSteps || parsedSteps.length === 0) {
        throw new Error("steps parameter must contain a valid non-empty array");
      }

      const optimizedSteps = this.optimizeSteps(parsedSteps);

      return {
        originalStepCount: parsedSteps.length,
        optimizedStepCount: optimizedSteps.length,
        optimizationsApplied: parsedSteps.length - optimizedSteps.length,
        optimizedSteps,
        summary: `Optimized journey: ${parsedSteps.length} → ${optimizedSteps.length} steps`,
      };
    } catch (error) {
      return {
        originalStepCount: 0,
        optimizedStepCount: 0,
        optimizationsApplied: 0,
        optimizedSteps: [],
        summary: `Optimization failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Parses JSON string into journey steps array
   */
  private parseSteps(stepsJson: string): JourneyStep[] {
    return JSON.parse(stepsJson);
  }

  /**
   * Validates journey steps for syntax and logic errors
   */
  private validateSteps(steps: JourneyStep[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const stepIds = new Set<string>();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      // Validate step structure
      if (!step.id || typeof step.id !== "string") {
        errors.push(`Step ${i}: invalid or missing id`);
      }

      if (
        !step.action ||
        !["navigate", "click", "type", "wait", "assert", "screenshot"].includes(
          step.action
        )
      ) {
        errors.push(`Step ${step.id}: invalid action '${step.action}'`);
      }

      // Action-specific validations
      switch (step.action) {
        case "navigate":
          if (!step.value) {
            errors.push(
              `Step ${step.id}: navigate action requires 'value' (URL)`
            );
          }
          break;
        case "click":
          if (!step.selector) {
            errors.push(`Step ${step.id}: click action requires 'selector'`);
          }
          break;
        case "type":
          if (!step.selector || step.value === undefined) {
            errors.push(
              `Step ${step.id}: type action requires both 'selector' and 'value'`
            );
          }
          break;
        case "wait":
          if (!step.condition && !step.value) {
            errors.push(
              `Step ${step.id}: wait action requires either 'condition' or 'value'`
            );
          }
          break;
        case "assert":
          if (!step.condition) {
            errors.push(`Step ${step.id}: assert action requires 'condition'`);
          }
          break;
      }

      // Check timeout values
      if (step.timeout && (step.timeout <= 0 || step.timeout > 60000)) {
        warnings.push(
          `Step ${step.id}: timeout ${step.timeout}ms seems unusual (expected 1-60000ms)`
        );
      }

      // Validate onError strategy
      if (
        step.onError &&
        !["continue", "retry", "fail"].includes(step.onError)
      ) {
        errors.push(
          `Step ${step.id}: invalid onError strategy '${step.onError}'`
        );
      }

      // Check retry count for retry strategy
      if (
        step.onError === "retry" &&
        (!step.retryCount || step.retryCount <= 0)
      ) {
        warnings.push(
          `Step ${step.id}: retry strategy without valid retryCount`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stepCount: steps.length,
    };
  }

  /**
   * Optimizes journey steps by removing redundant waits and improving efficiency
   */
  private optimizeSteps(steps: JourneyStep[]): JourneyStep[] {
    const optimized: JourneyStep[] = [];
    let pendingWaits: JourneyStep[] = [];

    for (const step of steps) {
      // Remove consecutive waits that can be combined
      if (step.action === "wait" && !step.condition) {
        // Simple timeout wait - combine with previous simple waits
        const timeoutValue = parseInt(step.value || "0");
        const lastWait =
          pendingWaits.length > 0
            ? pendingWaits[pendingWaits.length - 1]
            : null;

        if (lastWait && lastWait.action === "wait" && !lastWait.condition) {
          lastWait.value = String(
            parseInt(lastWait.value || "0") + timeoutValue
          );
          continue;
        } else {
          pendingWaits.push({ ...step });
        }
      } else {
        // Flush pending waits before this interactive step
        optimized.push(...pendingWaits);
        pendingWaits = [];

        // Add the current step
        optimized.push(step);
      }
    }

    // Flush any remaining waits
    optimized.push(...pendingWaits);

    return optimized;
  }
}
