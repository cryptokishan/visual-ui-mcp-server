import { Page } from "playwright";
import { log } from "../utils/logger.js";
import { ElementLocator } from "./element-locator.js";
import { FormOperations, FormUtils } from "./form-handler.js";
import { PageStateManager } from "./page-state-manager.js";
import { WaitHelper } from "./wait-helper.js";

export interface JourneyStep {
  id: string;
  action:
    | "navigate"
    | "click"
    | "type"
    | "wait"
    | "assert"
    | "screenshot"
    | "fill_form"
    | "submit_form"
    | "wait_for_element";
  selector?: string;
  value?: string;
  condition?: string; // JS expression
  timeout?: number;
  retryCount?: number;
  onError?: "continue" | "retry" | "fail";
  formData?: Record<string, any>; // For fill_form action
  submitSelector?: string; // For submit_form action
  waitType?: "load" | "networkidle" | "condition" | "timeout"; // For wait action
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
  completedSteps?: number; // Number of successfully completed steps
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
  private waitHelper: WaitHelper;
  private pageStateManager: PageStateManager;
  private formOperations: FormOperations;

  constructor(
    page: Page,
    options: {
      pageStateManager?: PageStateManager;
      createCoordinated?: boolean; // Create PageStateManager if not provided
    } = {}
  ) {
    this.page = page;
    this.elementLocator = new ElementLocator();
    this.waitHelper = new WaitHelper();

    // Enhanced coordination: Create PageStateManager if not provided
    if (options.pageStateManager) {
      this.pageStateManager = options.pageStateManager;
    } else if (options.createCoordinated) {
      this.pageStateManager = new PageStateManager(
        this.waitHelper,
        this.elementLocator,
        this.page
      );
    } else {
      // Fallback for backward compatibility - create minimal PSM
      this.pageStateManager = new PageStateManager(
        this.waitHelper,
        this.elementLocator,
        this.page
      );
    }

    // Create coordinated FormOperations with PageStateManager
    this.formOperations = new FormOperations(this.page, this.pageStateManager);
  }

  /**
   * Get the PageStateManager for coordination
   */
  getPageStateManager(): PageStateManager {
    return this.pageStateManager;
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
    let completedSteps = 0;

    try {
      // Video recording is set up at the browser context level when the tool creates the browser
      // We just log here to inform about video recording status
      if (options.video) {
        log.info("Video recording enabled for journey execution");
      }

      for (const step of options.steps) {
        const stepStartTime = Date.now();

        try {
          // Check step condition if provided (using WaitHelper)
          if (step.condition) {
            try {
              await this.waitHelper.waitForCustom(
                this.page,
                step.condition,
                1000
              );
            } catch (error) {
              // Condition not met, skip step
              continue;
            }
          }

          await this.executeStep(step);
          timings[step.id] = Date.now() - stepStartTime;
          completedSteps++;

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
          log.error(`Step ${step.id} failed: ${stepError.message}`, stepError);
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
        completedSteps,
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
        completedSteps,
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

        // Check if this is a data URL (common in tests) - skip SPA logic for these
        if (step.value.startsWith("data:")) {
          await this.page.goto(step.value, {
            waitUntil: "domcontentloaded",
            timeout: navTimeout,
          });
          break;
        }

        // Check if this is internal SPA navigation to the same domain
        try {
          const currentUrl = new URL(this.page.url());
          const targetUrl = new URL(step.value, this.page.url());

          if (currentUrl.origin === targetUrl.origin) {
            // Internal navigation - try SPA navigation first
            try {
              await this.handleSpaNavigation(
                targetUrl.pathname + targetUrl.search + targetUrl.hash,
                navTimeout
              );
            } catch (spaError) {
              log.warn(
                `SPA navigation failed for ${step.value}, falling back to page navigation`,
                spaError
              );
              // Fall back to full page navigation
              await this.page.goto(step.value, {
                waitUntil: "domcontentloaded",
                timeout: navTimeout,
              });
            }
          } else {
            // External navigation - use full page load
            await this.page.goto(step.value, {
              waitUntil: "domcontentloaded",
              timeout: navTimeout,
            });
          }
        } catch (urlError) {
          // If URL parsing fails, treat as external navigation (absolute URL with protocol)
          await this.page.goto(step.value, {
            waitUntil: "domcontentloaded",
            timeout: navTimeout,
          });
        }
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
          // Use WaitHelper for conditional waiting
          await this.waitHelper.waitForCustom(
            this.page,
            step.condition,
            step.timeout || 10000
          );
        } else if (step.value) {
          // Use WaitHelper for timeout-based waiting
          await this.waitHelper.waitForCustom(
            this.page,
            "true", // Wait for simple condition to be met
            parseInt(step.value)
          );
        } else {
          throw new Error(
            "Wait step requires either condition or timeout value"
          );
        }
        break;

      case "fill_form":
        if (!step.formData || !step.selector)
          throw new Error("fill_form step requires both formData and selector");
        // Use pre-coordinated FormOperations with PageStateManager
        await this.formOperations.waitForForm(step.selector);
        const fillResult = await this.formOperations.fillFormWithTyping(
          step.selector,
          step.formData
        );
        if (fillResult.errors.length > 0) {
          log.error(
            `Form fill errors: ${fillResult.errors.join(", ")}`,
            fillResult.errors
          );
          throw new Error(`Form fill failed: ${fillResult.errors.join(", ")}`);
        }
        break;

      case "submit_form":
        if (!step.selector)
          throw new Error("submit_form step requires selector");
        // Use pre-coordinated FormOperations with PageStateManager
        await this.formOperations.waitForForm(step.selector);
        await this.page.evaluate(
          (selector) => FormUtils.submitForm(selector),
          step.selector
        );
        await this.formOperations.waitForSubmission(step.timeout);
        break;

      case "wait_for_element":
        if (!step.selector)
          throw new Error("wait_for_element step requires selector");
        await this.elementLocator.waitForElement(this.page, {
          selector: step.selector,
          timeout: step.timeout || 10000,
        });
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
   * Handles SPA (Single Page Application) navigation for frameworks like React Router
   */
  private async handleSpaNavigation(
    targetPath: string,
    timeout: number
  ): Promise<void> {
    // Method 1: Try to find and click a navigation link that matches the path
    try {
      const linkSelectors = [
        `a[href="${targetPath}"]`,
        `a[href="${targetPath}"]`, // exact match
        `[data-to="${targetPath}"]`,
        `[to="${targetPath}"]`, // React Router Link shorthand
      ];

      for (const selector of linkSelectors) {
        try {
          const link = this.page.locator(selector).first();
          if ((await link.count()) > 0 && (await link.isVisible())) {
            await link.click({ timeout: 2000 });
            // Wait for navigation to complete within SPA
            await this.page.waitForLoadState("networkidle", {
              timeout: timeout - 2000,
            });
            return;
          }
        } catch (e) {
          // Continue to next selector
          continue;
        }
      }
    } catch (linkError) {
      log.debug(
        "Link-based navigation failed, trying programmatic navigation",
        linkError
      );
    }

    // Method 2: Try programmatic navigation using History API
    try {
      // Check if history API is available and push state
      await this.page.evaluate((path) => {
        if (window.history && window.history.pushState) {
          window.history.pushState(null, "", path);
          // Trigger popstate event to notify React Router
          window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
        } else {
          throw new Error("History API not available");
        }
      }, targetPath);

      // Wait for the page to update after navigation
      await this.page.waitForLoadState("networkidle", { timeout });
      return;
    } catch (historyError) {
      log.debug("History API navigation failed", historyError);
    }

    // Method 3: Direct URL assignment (fallback)
    try {
      await this.page.evaluate((path) => {
        window.location.href = path;
      }, targetPath);

      await this.page.waitForLoadState("networkidle", { timeout });
      return;
    } catch (directError) {
      log.debug("Direct URL navigation failed", directError);
    }

    // If all methods fail, throw error to trigger fallback
    throw new Error(
      `All SPA navigation methods failed for path: ${targetPath}`
    );
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
        stepsExecuted: journeyResult.completedSteps || parsedSteps.length,
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
        ![
          "navigate",
          "click",
          "type",
          "wait",
          "assert",
          "screenshot",
          "fill_form",
          "submit_form",
          "wait_for_element",
        ].includes(step.action)
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
        case "fill_form":
          if (!step.selector || !step.formData) {
            errors.push(
              `Step ${step.id}: fill_form action requires both 'selector' and 'formData'`
            );
          }
          break;
        case "submit_form":
          if (!step.selector) {
            errors.push(
              `Step ${step.id}: submit_form action requires 'selector'`
            );
          }
          break;
        case "wait_for_element":
          if (!step.selector) {
            errors.push(
              `Step ${step.id}: wait_for_element action requires 'selector'`
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
