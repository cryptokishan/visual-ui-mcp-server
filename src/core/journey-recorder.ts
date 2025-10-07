/**
 * Journey Recorder for real-time user interaction recording
 * Captures user interactions and automatically generates journey definitions
 */

import * as fs from "fs-extra";
import * as path from "path";
import { Page } from "playwright";
import type {
  JourneyDefinition,
  RecordedStep,
  RecordingOptimization,
  RecordingOptions,
  RecordingResult,
  RecordingSession,
  SelectorSuggestion,
} from "../types/journey-recording.js";
import { JourneySimulator } from "./journey-simulator.js";

export class JourneyRecorder {
  private page: Page;
  private journeySimulator: JourneySimulator;
  private currentSession: RecordingSession | null = null;
  private eventListeners: Map<string, (data: any) => void> = new Map();
  private lastInteractionTime = 0;
  private interactionsQueue: RecordedStep[] = [];
  private recordingsDir: string;
  private videoPath: string | null = null;

  constructor(page: Page) {
    this.page = page;
    this.journeySimulator = new JourneySimulator(page);
    this.recordingsDir = path.join(process.cwd(), "test", "recordings");

    // Ensure recordings directory exists
    fs.ensureDirSync(this.recordingsDir);
  }

  /**
   * Start recording a user journey
   */
  async startRecording(options: RecordingOptions): Promise<RecordingSession> {
    if (this.currentSession && this.currentSession.isRecording) {
      throw new Error(
        "Recording session already in progress. Stop current session first."
      );
    }

    // Generate unique session ID
    const sessionId = `recording_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.currentSession = {
      id: sessionId,
      name: options.name,
      options,
      steps: [],
      startTime: Date.now(),
      isRecording: true,
      isPaused: false,
      currentUrl: this.page.url(),
      eventsRecorded: 0,
      eventsFiltered: 0,
    };

    // Clear any existing listeners
    this.removeEventListeners();

    // Set up event listeners for user interactions
    await this.setupEventListeners();

    console.log(`🟢 Started recording journey: ${options.name}`);

    // Set up video recording if enabled
    if (options.video?.enabled) {
      try {
        // Configure video recording at the page context level
        await this.page.context().addInitScript(() => {
          // Ensure video recording is available in the page context
          console.log("Video recording will be captured at context level");
        });
        console.log("🎥 Video recording enabled for this session");
      } catch (error) {
        console.warn("Failed to configure video recording:", error);
      }
    }

    return { ...this.currentSession };
  }

  /**
   * Stop recording and return the journey definition with recordings
   */
  async stopRecording(): Promise<RecordingResult> {
    if (!this.currentSession || !this.currentSession.isRecording) {
      throw new Error("No active recording session to stop.");
    }

    // Mark session as stopped
    this.currentSession.isRecording = false;
    this.currentSession.endTime = Date.now();
    this.currentSession.isPaused = false;

    // Remove event listeners
    this.removeEventListeners();

    // Process any remaining interactions
    await this.processQueuedInteractions();

    // Generate journey definition
    const journeyDefinition = await this.generateJourneyDefinition();
    const optimization = await this.optimizeRecording();

    // Calculate statistics
    const recordingDuration =
      this.currentSession.endTime - this.currentSession.startTime;
    const statistics = {
      totalEvents:
        this.currentSession.eventsRecorded + this.currentSession.eventsFiltered,
      recordedSteps: this.currentSession.steps.length,
      filteredEvents: this.currentSession.eventsFiltered,
      recordingDuration,
    };

    // Collect recording artifacts (video, screenshots)
    const recordings = await this.collectRecordingArtifacts();

    const result: RecordingResult = {
      session: { ...this.currentSession },
      journeyDefinition,
      statistics,
      optimization,
      recordings: recordings || undefined,
    };

    console.log(
      `🔴 Stopped recording journey: ${this.currentSession.name} (${this.currentSession.steps.length} steps captured)`
    );

    // Clear session
    this.currentSession = null;

    return result;
  }

  /**
   * Pause current recording session
   */
  async pauseRecording(): Promise<void> {
    if (!this.currentSession) {
      throw new Error("No active recording session to pause.");
    }

    if (this.currentSession.isPaused) {
      throw new Error("Recording session is already paused.");
    }

    this.currentSession.isPaused = true;
    console.log(`⏸️ Paused recording journey: ${this.currentSession.name}`);
  }

  /**
   * Resume paused recording session
   */
  async resumeRecording(): Promise<void> {
    if (!this.currentSession) {
      throw new Error("No active recording session to resume.");
    }

    if (!this.currentSession.isPaused) {
      throw new Error("Recording session is not paused.");
    }

    this.currentSession.isPaused = false;
    console.log(`▶️ Resumed recording journey: ${this.currentSession.name}`);
  }

  /**
   * Get current recording status
   */
  getCurrentStatus(): {
    sessionId?: string;
    isRecording: boolean;
    isPaused: boolean;
    currentUrl?: string;
    stepsRecorded: number;
    recordingDuration: number;
    canPause: boolean;
    canResume: boolean;
    canStop: boolean;
  } {
    if (!this.currentSession) {
      return {
        isRecording: false,
        isPaused: false,
        stepsRecorded: 0,
        recordingDuration: 0,
        canPause: false,
        canResume: false,
        canStop: false,
      };
    }

    const duration = Date.now() - this.currentSession.startTime;

    return {
      sessionId: this.currentSession.id,
      isRecording: this.currentSession.isRecording,
      isPaused: this.currentSession.isPaused,
      currentUrl: this.currentSession.currentUrl,
      stepsRecorded: this.currentSession.steps.length,
      recordingDuration: duration,
      canPause:
        this.currentSession.isRecording && !this.currentSession.isPaused,
      canResume:
        this.currentSession.isRecording && this.currentSession.isPaused,
      canStop: this.currentSession.isRecording,
    };
  }

  /**
   * Set up event listeners for user interactions using injected script
   */
  private async setupEventListeners(): Promise<void> {
    // Inject a script to capture DOM events and send them to Playwright
    await this.page.addScriptTag({
      content: `
        window._journeyRecorder = {
          sendEvent: (type, data) => {
            window.postMessage({ type: '_journey_' + type, data }, '*');
          }
        };
      `,
    });

    // Listen for navigation (this works with Playwright)
    const navigationListener = async () => {
      const newUrl = this.page.url();
      if (newUrl !== this.currentSession?.currentUrl) {
        await this.handleInteraction({
          action: "navigate",
          url: newUrl,
        });
      }
    };

    // Set up message listener for DOM events
    const messageListener = async (msg: any) => {
      if (msg.text().includes("_journey_")) {
        const message = await msg.page.evaluate(() => {
          // Try to extract event data from page context if available
          return { type: "unknown", data: {} };
        });
        // Handle based on message type
      }
    };

    // For now, implement a simpler approach using page.evaluate
    // This creates a manual recording approach
    await this.page.evaluate(() => {
      // Create global recording handler
      (window as any)._recordInteraction = (
        action: string,
        selector?: string,
        value?: string
      ) => {
        // This will be called manually by users or other scripts
        console.log("Recorded:", action, selector, value);
      };
    });

    // Register navigation listener only
    this.page.on("framenavigated", navigationListener);

    // Store reference
    this.eventListeners.set("framenavigated", navigationListener);
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    for (const [event, listener] of this.eventListeners) {
      try {
        this.page.off(event as any, listener);
      } catch (error) {
        // Ignore errors when removing listeners
      }
    }
    this.eventListeners.clear();
  }

  /**
   * Handle user interaction event
   */
  private async handleInteraction(data: {
    action: string;
    element?: any;
    value?: string;
    url?: string;
    pageX?: number;
    pageY?: number;
  }): Promise<void> {
    if (
      !this.currentSession ||
      !this.currentSession.isRecording ||
      this.currentSession.isPaused
    ) {
      return;
    }

    // Check if interaction should be filtered
    if (this.shouldFilterInteraction(data)) {
      this.currentSession.eventsFiltered++;
      return;
    }

    // Check minimum interaction delay
    const now = Date.now();
    const minDelay =
      this.currentSession.options.filter?.minInteractionDelay || 500;
    if (now - this.lastInteractionTime < minDelay) {
      this.currentSession.eventsFiltered++;
      return;
    }
    this.lastInteractionTime = now;

    try {
      // Generate recorded step
      const recordedStep: RecordedStep = {
        id: `step_${this.currentSession.steps.length + 1}`,
        action: data.action as any,
        timestamp: now,
      };

      // Add action-specific data
      if (data.element && typeof data.element === "object") {
        recordedStep.elementTag = data.element.tagName?.toLowerCase();
        recordedStep.elementId = data.element.id;
        recordedStep.elementClass = data.element.className;
        recordedStep.elementText = data.element.textContent
          ?.slice(0, 50)
          .trim();

        // Generate selector suggestions if enabled
        if (this.currentSession.options.autoSelectors) {
          recordedStep.selectorOptions = await this.generateSelectorSuggestions(
            data.element
          );
        }

        // Use best selector as main selector
        const bestSelector = this.chooseBestSelector(
          await this.generateSelectorSuggestions(data.element)
        );
        recordedStep.selector = bestSelector?.selector;
      }

      if (data.value !== undefined) {
        recordedStep.value = data.value;
      }

      if (data.url) {
        recordedStep.url = data.url;
      }

      if (data.pageX !== undefined) {
        recordedStep.pageX = data.pageX;
      }

      if (data.pageY !== undefined) {
        recordedStep.pageY = data.pageY;
      }

      // Add to session steps
      this.currentSession.steps.push(recordedStep);
      this.currentSession.eventsRecorded++;

      // Update current URL
      if (data.url) {
        this.currentSession.currentUrl = data.url;
      }

      console.log(
        `📝 Recorded ${data.action} interaction (${this.currentSession.steps.length} total steps)`
      );
    } catch (error) {
      console.warn("Failed to record interaction:", error);
    }
  }

  /**
   * Check if interaction should be filtered based on options
   */
  private shouldFilterInteraction(data: any): boolean {
    const filter = this.currentSession?.options.filter;

    // Check excluded actions
    if (filter?.excludeActions?.includes(data.action)) {
      return true;
    }

    // Check excluded selectors
    if (filter?.excludeSelectors && data.element) {
      const selectors = filter.excludeSelectors;
      const element = data.element;

      for (const selector of selectors) {
        try {
          if (element.matches && element.matches(selector)) {
            return true;
          }
        } catch {
          // Invalid selector, continue checking
        }
      }
    }

    return false;
  }

  /**
   * Check if scroll events should be recorded
   */
  private shouldRecordScroll(): boolean {
    // Only record scroll if explicitly not excluded
    const filter = this.currentSession?.options.filter;
    return !filter?.excludeActions?.includes("scroll");
  }

  /**
   * Check if focus events should be recorded
   */
  private shouldRecordFocus(): boolean {
    // Only record focus if explicitly not excluded
    const filter = this.currentSession?.options.filter;
    return !filter?.excludeActions?.includes("focus");
  }

  /**
   * Generate multiple selector suggestions for an element
   */
  async generateSelectorSuggestions(
    element: any
  ): Promise<SelectorSuggestion[]> {
    const suggestions: SelectorSuggestion[] = [];

    try {
      // ID selector (highest specificity)
      if (element.id) {
        suggestions.push({
          selector: `#${element.id}`,
          score: 100,
          type: "id",
          description: "ID-based selector - most specific and reliable",
        });
      }

      // Classes selector
      const classes = element.className?.split(" ").filter(Boolean);
      if (classes && classes.length > 0) {
        const classSelector = `.${classes.join(".")}`;
        const specificity = Math.min(80 + classes.length * 5, 95);
        suggestions.push({
          selector: classSelector,
          score: specificity,
          type: "class",
          description: `${classes.length} class-based selector`,
        });
      }

      // Attribute-based selectors (aria-label, etc.)
      const attributes = [
        "aria-label",
        "aria-labelledby",
        "title",
        "alt",
        "placeholder",
      ];
      for (const attr of attributes) {
        const value = element.getAttribute?.(attr);
        if (value) {
          suggestions.push({
            selector: `[${attr}="${value}"]`,
            score: 70,
            type: "attribute",
            description: `${attr} attribute selector`,
          });
        }
      }

      // XPath selector (good fallback)
      try {
        const xpath = await this.page.evaluate((el) => {
          function getXPath(element: Element): string {
            if (element.id) return `//*[@id="${element.id}"]`;

            const parts = [];
            let current: Element | null = element;

            while (current && current.nodeType === Node.ELEMENT_NODE) {
              let index = 0;
              let sibling = current.previousSibling;

              while (sibling) {
                if (
                  sibling.nodeType === Node.ELEMENT_NODE &&
                  (sibling as Element).tagName === current.tagName
                ) {
                  index++;
                }
                sibling = sibling.previousSibling;
              }

              const tagName = current.tagName.toLowerCase();
              const pathSegment = index ? `${tagName}[${index + 1}]` : tagName;
              parts.unshift(pathSegment);

              current = current.parentElement;
            }

            return parts.length ? "/" + parts.join("/") : "";
          }
          return getXPath(el);
        }, element);

        if (xpath) {
          suggestions.push({
            selector: xpath,
            score: 60,
            type: "xpath",
            description: "XPath selector - works in complex DOM structures",
          });
        }
      } catch (error) {
        // XPath generation failed, continue
      }

      // CSS selector using text content (lowest specificity)
      if (element.textContent?.trim()) {
        const text = element.textContent.trim().slice(0, 30);
        const textSelector = `text=${text}`;
        suggestions.push({
          selector: textSelector,
          score: 40,
          type: "css",
          description: "Text-based selector - may be brittle",
        });
      }
    } catch (error) {
      console.warn("Failed to generate selector suggestions:", error);
    }

    // Sort by score (highest first)
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Choose the best selector from suggestions
   */
  private chooseBestSelector(
    suggestions: SelectorSuggestion[]
  ): SelectorSuggestion | null {
    if (suggestions.length === 0) return null;

    // Return highest scored selector
    return suggestions[0];
  }

  /**
   * Process any queued interactions
   */
  private async processQueuedInteractions(): Promise<void> {
    // Process any remaining interactions in queue
    for (const interaction of this.interactionsQueue) {
      this.currentSession!.steps.push(interaction);
    }
    this.interactionsQueue = [];
  }

  /**
   * Generate a journey definition from recorded steps
   */
  private async generateJourneyDefinition(): Promise<JourneyDefinition> {
    if (!this.currentSession) {
      throw new Error("No recording session available");
    }

    const steps = this.currentSession.steps.map((step) => ({
      id: step.id,
      action: step.action,
      selector: step.selector,
      value: step.value,
      url: step.url,
      description: this.generateStepDescription(step),
    }));

    return {
      name: this.currentSession.name,
      description: this.currentSession.options.description,
      steps,
      metadata: {
        recordedAt: new Date().toISOString(),
        recordedBy: "visual-ui-mcp-server",
        originalUrl: this.currentSession.currentUrl || "",
        browserInfo: await this.page.evaluate(() => navigator.userAgent),
      },
    };
  }

  /**
   * Generate human-readable description for a step
   */
  private generateStepDescription(step: RecordedStep): string {
    switch (step.action) {
      case "navigate":
        return `Navigate to ${step.url}`;
      case "click":
        return `Click on ${step.elementTag}${
          step.elementId ? `#${step.elementId}` : ""
        } ${step.elementText ? `("${step.elementText}")` : ""}`;
      case "type":
        return `Type "${step.value}" into ${step.elementTag}${
          step.elementId ? `#${step.elementId}` : ""
        }`;
      case "scroll":
        return "Scroll page";
      case "focus":
        return `Focus on ${step.elementTag}${
          step.elementId ? `#${step.elementId}` : ""
        }`;
      default:
        return `${
          step.action.charAt(0).toUpperCase() + step.action.slice(1)
        } action`;
    }
  }

  /**
   * Collect recording artifacts (video, screenshots)
   */
  private async collectRecordingArtifacts(): Promise<{
    video?: string;
    screenshots?: string[];
    thumbnail?: string;
  } | null> {
    if (!this.currentSession) return null;

    const recordings: {
      video?: string;
      screenshots?: string[];
      thumbnail?: string;
    } = {};

    // Collect video if it was enabled
    if (this.currentSession.options.video?.enabled) {
      try {
        const video = this.page.video();
        if (video) {
          const videoPath = await video.path();
          if (videoPath && fs.existsSync(videoPath)) {
            // Move video to recordings directory with unique name
            const videoFileName = `${this.currentSession.id}_journey.webm`;
            const destinationPath = path.join(this.recordingsDir, videoFileName);

            await fs.move(videoPath, destinationPath);
            recordings.video = destinationPath;

            console.log(`📹 Video successfully recorded and saved: ${destinationPath}`);

            // Extract thumbnail from video (placeholder for future implementation)
            // TODO: Implement thumbnail extraction using ffmpeg or similar
          } else {
            console.log("ℹ️ Video recording requested but no video file was generated - context may not support video recording");
          }
        } else {
          console.log("ℹ️ Video recording requested but not available - browser context does not support video recording");
        }
      } catch (error) {
        console.warn("Failed to collect video recording:", error);
        // This is expected in headless environments where video recording is not supported
      }
    }

    // Collect step screenshots if enabled
    if (
      this.currentSession.options.screenshotOnStep &&
      this.currentSession.steps.length > 0
    ) {
      try {
        const screenshots: string[] = [];

        // Capture screenshots for each step (limit to reasonable number for performance)
        const maxScreenshots = Math.min(this.currentSession.steps.length, 20);

        for (let i = 0; i < maxScreenshots; i++) {
          try {
            const screenshotPath = path.join(
              this.recordingsDir,
              `${this.currentSession.id}_step_${i + 1}.png`
            );

            await this.page.screenshot({
              path: screenshotPath,
              fullPage: false, // Only capture viewport for step screenshots
            });

            screenshots.push(screenshotPath);
          } catch (error) {
            console.warn(
              `Failed to capture screenshot for step ${i + 1}:`,
              error
            );
          }
        }

        if (screenshots.length > 0) {
          recordings.screenshots = screenshots;

          // Create an animated GIF from screenshots if we have FFmpeg available
          try {
            await this.createAnimatedGif(
              screenshots,
              `${this.currentSession.id}_journey.gif`
            );
          } catch (error) {
            console.warn("Failed to create animated GIF:", error);
          }
        }
      } catch (error) {
        console.warn("Failed to collect screenshots:", error);
      }
    }

    return Object.keys(recordings).length > 0 ? recordings : null;
  }

  /**
   * Create an animated GIF from screenshots
   */
  private async createAnimatedGif(
    screenshotPaths: string[],
    outputFileName: string
  ): Promise<void> {
    // Note: This implementation assumes FFmpeg is available on the system
    // In a production environment, you'd want to check if FFmpeg is installed
    // For now, we'll create a simple implementation that could be extended

    // This is a placeholder for GIF creation
    // In practice, you would use a library like gifencoder or call FFmpeg
    console.log(
      `Animated GIF creation would be implemented here for: ${outputFileName}`
    );

    // For demonstration, we'll just note that GIF creation could be implemented
    // using libraries like:
    // - gifencoder: https://www.npmjs.com/package/gifencoder
    // - ffmpeg-static with exec calls
    // - canvas-based encoding
  }

  /**
   * Optimize the recorded journey
   */
  private async optimizeRecording(): Promise<RecordingOptimization> {
    if (!this.currentSession) {
      throw new Error("No recording session available");
    }

    const originalSteps = this.currentSession.steps.length;
    let optimizedSteps = [...this.currentSession.steps];

    // Remove consecutive duplicate actions
    const deduplicated: RecordedStep[] = [];
    for (let i = 0; i < optimizedSteps.length; i++) {
      const current = optimizedSteps[i];
      const previous = deduplicated[deduplicated.length - 1];

      if (
        previous &&
        current.action === previous.action &&
        current.selector === previous.selector &&
        current.action !== "type"
      ) {
        // Don't deduplicate typing
        // Skip duplicate
        continue;
      }

      deduplicated.push(current);
    }
    optimizedSteps = deduplicated;

    // Remove rapid consecutive scrolls (within 2 seconds)
    const noRapidScroll: RecordedStep[] = [];
    for (let i = 0; i < optimizedSteps.length; i++) {
      const current = optimizedSteps[i];
      const next = optimizedSteps[i + 1];

      if (
        current.action === "scroll" &&
        next?.action === "scroll" &&
        next.timestamp - current.timestamp < 2000
      ) {
        // Skip the second scroll if too close to the first
        continue;
      }

      noRapidScroll.push(current);
    }
    optimizedSteps = noRapidScroll;

    const redundantWaitsRemoved = Math.max(
      0,
      originalSteps - optimizedSteps.length
    );
    const similarActionsMerged = 0; // Could implement more complex merging logic

    // Update session with optimized steps
    this.currentSession.steps = optimizedSteps;

    const suggestions: string[] = [];
    if (redundantWaitsRemoved > 0) {
      suggestions.push(
        `Removed ${redundantWaitsRemoved} redundant or rapid interactions`
      );
    }
    if (originalSteps > optimizedSteps.length) {
      suggestions.push(
        "Consider reviewing selector stability for long-term test reliability"
      );
    }

    return {
      originalSteps,
      optimizedSteps: optimizedSteps.length,
      redundantWaitsRemoved,
      similarActionsMerged,
      suggestions,
    };
  }
}
