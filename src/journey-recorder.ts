import { Locator, Page } from "playwright";
import {
  JourneyDefinition,
  JourneyStep,
  RecordingOptions,
  RecordingSession,
  SelectorSuggestion,
} from "./journey-simulator";

// Global registry for maintaining JourneyRecorder instances across MCP tool calls
const recorderRegistry = new Map<string, JourneyRecorder>();

export class JourneyRecorder {
  private sessionId: string | null = null;
  private currentSession: RecordingSession | null = null;
  private eventListeners: Map<string, (...args: any[]) => void> = new Map();
  private lastInteractionTime: number = 0;

  /**
   * Get or create a JourneyRecorder instance by session ID
   */
  static getInstance(sessionId?: string): JourneyRecorder {
    if (sessionId) {
      // Try to retrieve existing instance
      const existingInstance = recorderRegistry.get(sessionId);
      if (existingInstance) {
        return existingInstance;
      }

      // Create new instance for the session
      const newInstance = new JourneyRecorder();
      newInstance.sessionId = sessionId;
      recorderRegistry.set(sessionId, newInstance);
      return newInstance;
    }

    // Return a default instance (for non-session-related operations)
    return new JourneyRecorder();
  }

  /**
   * Remove a JourneyRecorder instance from the registry
   */
  static removeInstance(sessionId: string): void {
    recorderRegistry.delete(sessionId);
  }

  /**
   * Get all active recorder instances
   */
  static getActiveInstances(): string[] {
    return Array.from(recorderRegistry.keys());
  }

  /**
   * Start recording user interactions
   */
  async startRecording(
    page: Page,
    options: RecordingOptions
  ): Promise<RecordingSession> {
    if (this.currentSession?.isRecording) {
      throw new Error(
        "A recording session is already active. Stop current recording first."
      );
    }

    const sessionId = `rec_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const session: RecordingSession = {
      id: sessionId,
      name: options.name,
      options,
      steps: [],
      startTime: new Date(),
      isRecording: true,
      currentUrl: page.url(),
      page,
    };

    this.currentSession = session;
    this.setupEventListeners(page, session);

    console.log(`🎬 Started recording journey: ${options.name}`);
    return session;
  }

  /**
   * Stop recording and return journey definition
   */
  async stopRecording(sessionId: string): Promise<JourneyDefinition> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    const session = this.currentSession;
    this.cleanupEventListeners(session.page!);

    // Filter and optimize the recorded steps
    const optimizedSteps = await this.optimizeRecordedSteps(session.steps);

    const journey: JourneyDefinition = {
      name: session.name,
      description:
        session.options.description || `Recorded journey: ${session.name}`,
      steps: optimizedSteps,
      created: session.startTime,
      modified: new Date(),
      source: "recorded",
      recordedFrom: session.currentUrl,
    };

    this.currentSession = null;
    console.log(
      `⏹️ Stopped recording journey: ${session.name} (${optimizedSteps.length} steps)`
    );

    return journey;
  }

  /**
   * Pause current recording session
   */
  async pauseRecording(sessionId: string): Promise<void> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    this.currentSession.isRecording = false;
    console.log(`⏸️ Paused recording: ${this.currentSession.name}`);
  }

  /**
   * Resume paused recording session
   */
  async resumeRecording(sessionId: string): Promise<void> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    this.currentSession.isRecording = true;
    console.log(`▶️ Resumed recording: ${this.currentSession.name}`);
  }

  /**
   * Get current recording session status
   */
  async getCurrentSession(): Promise<RecordingSession | null> {
    return this.currentSession;
  }

  /**
   * Generate smart selector suggestions for an element
   */
  async suggestSelectors(
    page: Page,
    element: Locator
  ): Promise<SelectorSuggestion[]> {
    const suggestions: SelectorSuggestion[] = [];
    const elementHandle = await element.elementHandle();

    if (!elementHandle) {
      return suggestions;
    }

    // Get element properties
    const properties = await elementHandle.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id,
        className: el.className,
        text: el.textContent?.trim().substring(0, 50),
        attributes: {
          "aria-label": el.getAttribute("aria-label"),
          placeholder: el.getAttribute("placeholder"),
          name: el.getAttribute("name"),
          type: el.getAttribute("type"),
          role: el.getAttribute("role"),
        },
      };
    });

    // Generate CSS selectors
    if (properties.id) {
      suggestions.push({
        selector: `#${properties.id}`,
        type: "css",
        reliability: 0.95,
        element: `${properties.tagName}#${properties.id}`,
      });
    }

    if (properties.className) {
      const classSelector = `.${properties.className.split(" ").join(".")}`;
      suggestions.push({
        selector: classSelector,
        type: "css",
        reliability: 0.7,
        element: `${properties.tagName}${classSelector}`,
      });
    }

    // Generate attribute selectors
    if (properties.attributes.name) {
      suggestions.push({
        selector: `[name="${properties.attributes.name}"]`,
        type: "css",
        reliability: 0.9,
        element: `${properties.tagName}[name="${properties.attributes.name}"]`,
      });
    }

    if (properties.attributes["aria-label"]) {
      suggestions.push({
        selector: `[aria-label="${properties.attributes["aria-label"]}"]`,
        type: "aria",
        reliability: 0.85,
        element: `${properties.tagName}[aria-label="${properties.attributes["aria-label"]}"]`,
      });
    }

    if (properties.attributes.placeholder) {
      suggestions.push({
        selector: `[placeholder="${properties.attributes.placeholder}"]`,
        type: "css",
        reliability: 0.8,
        element: `${properties.tagName}[placeholder="${properties.attributes.placeholder}"]`,
      });
    }

    // Generate text selector
    if (properties.text && properties.text.length > 0) {
      suggestions.push({
        selector: `text="${properties.text}"`,
        type: "text",
        reliability: 0.6,
        element: `${properties.tagName} with text "${properties.text}"`,
      });
    }

    // Generate XPath selector
    const xpath = await elementHandle.evaluate((el) => {
      function getXPath(element: Element): string {
        if (element.id)
          return `//${element.tagName.toLowerCase()}[@id="${element.id}"]`;

        let path = [];
        let parent = element;
        while (parent && parent.nodeType === Node.ELEMENT_NODE) {
          let selector = parent.tagName.toLowerCase();
          if (parent.id) {
            selector += `[@id="${parent.id}"]`;
            path.unshift(selector);
            break;
          } else {
            let sib = parent.previousSibling;
            let nth = 1;

            while (sib) {
              if (
                sib.nodeType === Node.ELEMENT_NODE &&
                (sib as Element).tagName === parent.tagName
              ) {
                nth++;
              }
              sib = sib.previousSibling;
            }

            selector += `[${nth}]`;
          }

          path.unshift(selector);
          parent = parent.parentElement as Element;
        }
        return path.length ? "//" + path.join("/") : "";
      }
      return getXPath(el);
    });

    if (xpath) {
      suggestions.push({
        selector: xpath,
        type: "xpath",
        reliability: 0.9,
        element: `${properties.tagName} via XPath`,
      });
    }

    // Sort by reliability
    return suggestions.sort((a, b) => b.reliability - a.reliability);
  }

  /**
   * Optimize recorded steps by removing noise and improving selectors
   */
  private async optimizeRecordedSteps(
    steps: JourneyStep[]
  ): Promise<JourneyStep[]> {
    const optimized: JourneyStep[] = [];

    for (const step of steps) {
      // Skip filtered actions
      if (this.shouldFilterStep(step)) {
        continue;
      }

      // Improve selector if auto-selectors is enabled
      if (this.currentSession?.options.autoSelectors && step.selector) {
        const betterSelector = await this.findBetterSelector(step);
        if (betterSelector) {
          step.selector = betterSelector;
        }
      }

      optimized.push(step);
    }

    this.mergeNavigationSteps(optimized);
    this.removeDuplicateInteractions(optimized);

    return optimized;
  }

  /**
   * Setup event listeners for user interaction recording
   */
  private async setupEventListeners(
    page: Page,
    session: RecordingSession
  ): Promise<void> {
    // Node-side click handler: receives ElementHandle
    const clickListener = async (elementHandle: any) => {
      if (!session.isRecording || !this.shouldRecordInteraction()) return;
      if (!elementHandle) return;
      const selector = await this.generateSelectorFromHandle(
        page,
        elementHandle
      );
      const description = await this.describeClickFromHandle(elementHandle);
      session.steps.push({
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: "click",
        selector,
        description,
      });
    };

    // Node-side input handler: receives ElementHandle
    const inputListener = async (elementHandle: any) => {
      if (!session.isRecording || !this.shouldRecordInteraction()) return;
      if (!elementHandle) return;
      // Skip password fields
      const type = await elementHandle.evaluate((el: any) => el.type);
      if (type === "password") return;
      const selector = await this.generateSelectorFromHandle(
        page,
        elementHandle
      );
      const description = await this.describeInputFromHandle(elementHandle);
      const value = await elementHandle.evaluate((el: any) => el.value);
      // Find the last step with matching selector and action
      const existingStep = [...session.steps]
        .reverse()
        .find((s) => s.selector === selector && s.action === "type");
      if (existingStep && existingStep.value !== undefined) {
        existingStep.value = value;
      } else {
        session.steps.push({
          id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          action: "type",
          selector,
          value,
          description,
        });
      }
    };

    const navigationListener = async (url: string) => {
      if (!session.isRecording) return;

      session.steps.push({
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: "navigate",
        value: url,
        description: `Navigate to ${url}`,
      });
      session.currentUrl = url;
    };

    // Register listeners using locator events instead

    // Expose Node-side bindings to receive ElementHandles
    await page.exposeBinding(
      "__journey_click",
      async (source, elementHandle) => {
        await clickListener(elementHandle);
      },
      { handle: true }
    );
    await page.exposeBinding(
      "__journey_input",
      async (source, elementHandle) => {
        await inputListener(elementHandle);
      },
      { handle: true }
    );

    // Inject page-side listeners for click and input (single correct block)
    await page.addInitScript(() => {
      const attachListeners = () => {
        (window as any).addEventListener("click", (event: Event) => {
          const target = (event.target || event.currentTarget) as HTMLElement;
          if (target && typeof (window as any)["__journey_click"] === "function") {
            (window as any)["__journey_click"](target);
          }
        }, true);
        const inputTypes = ["text", "email", "number"];
        document.addEventListener("input", (event: Event) => {
          const target = event.target as HTMLInputElement | HTMLTextAreaElement;
          if (
            target &&
            ((target.tagName === "TEXTAREA") ||
              (target.tagName === "INPUT" && inputTypes.includes((target as HTMLInputElement).type))) &&
            typeof (window as any)["__journey_input"] === "function"
          ) {
            (window as any)["__journey_input"](target);
          }
        }, true);
      };
      (window as any).__journey_attachListeners = attachListeners;
      attachListeners();
    });
    await page.evaluate(() => {
      (window as any).__journey_attachListeners?.();
    });

    // Listen for navigation events
    page.on("framenavigated", (frame: any) => {
      if (frame === page.mainFrame()) {
        navigationListener(frame.url());
      }
    });

    // Store listeners for cleanup
    this.eventListeners.set("click", clickListener);
    this.eventListeners.set("navigation", navigationListener);
  }

  // Helper: Generate selector from ElementHandle
  private async generateSelectorFromHandle(
    page: Page,
    elementHandle: any
  ): Promise<string> {
    // You can extend this to use your existing logic, e.g.:
    // return await this.generateSelector(page, await elementHandle.evaluateHandle(el => el));
    // For now, fallback to tag and id/class
    return await elementHandle.evaluate((el: any) => {
      if (el.id) return `#${el.id}`;
      if (el.className)
        return `${el.tagName.toLowerCase()}.${el.className
          .split(" ")
          .join(".")}`;
      return el.tagName.toLowerCase();
    });
  }

  // Helper: Describe click from ElementHandle
  private async describeClickFromHandle(elementHandle: any): Promise<string> {
    return await elementHandle.evaluate((el: any) => {
      let desc = `Click on ${el.tagName.toLowerCase()}`;
      if (el.type) desc += `[${el.type}]`;
      if (el.getAttribute && el.getAttribute("aria-label"))
        desc += ` "${el.getAttribute("aria-label")}"`;
      else if (el.placeholder) desc += ` "${el.placeholder}"`;
      return desc;
    });
  }

  // Helper: Describe input from ElementHandle
  private async describeInputFromHandle(elementHandle: any): Promise<string> {
    return await elementHandle.evaluate((el: any) => {
      let desc = `Type into ${el.tagName.toLowerCase()}`;
      if (el.type && el.type !== "text") desc += `[${el.type}]`;
      if (el.getAttribute && el.getAttribute("aria-label"))
        desc += ` "${el.getAttribute("aria-label")}"`;
      else if (el.placeholder) desc += ` "${el.placeholder}"`;
      return desc;
    });
  }

  /**
   * Cleanup event listeners
   */
  private cleanupEventListeners(page: Page): void {
    for (const [event, listener] of this.eventListeners) {
      page.off(event as any, listener);
    }
    this.eventListeners.clear();
  }

  /**
   * Generate a reliable selector for an element
   */
  private async generateSelector(
    page: Page,
    element: Element
  ): Promise<string> {
    // Try id first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try unique class combination
    if (element.className) {
      const classes = element.className
        .trim()
        .split(/\s+/)
        .filter((cls) => cls);
      if (classes.length >= 1) {
        // Check if this combination is unique
        const isUnique = await page.evaluate((selector: string) => {
          return document.querySelectorAll(selector).length === 1;
        }, `${element.tagName}.${classes.join(".")}`);

        if (isUnique) {
          return `${element.tagName}.${classes.join(".")}`;
        }
      }
    }

    // For now, skip these complex evaluate calls - focus on basic selectors
    // TODO: Reimplement these with proper typing to avoid deep instantiation issues

    // Simple fallback - use tag name only
    return element.tagName.toLowerCase();
  }

  /**
   * Check if interaction should be filtered out
   */
  private shouldFilterStep(step: JourneyStep): boolean {
    if (!this.currentSession?.options.filter) return false;

    const { excludeSelectors = [], excludeActions = [] } =
      this.currentSession.options.filter;

    // Check excluded selectors
    if (
      step.selector &&
      excludeSelectors.some(
        (excl) =>
          step.selector!.includes(excl) || new RegExp(excl).test(step.selector!)
      )
    ) {
      return true;
    }

    // Check excluded actions - only check for actions that can be filtered
    return excludeActions.some((action: string) => action === step.action);
  }

  /**
   * Check if interaction should be recorded based on timing
   */
  private shouldRecordInteraction(): boolean {
    if (!this.currentSession?.options.filter?.minInteractionDelay) return true;

    const now = Date.now();
    const timeSinceLast = now - this.lastInteractionTime;

    if (
      timeSinceLast < this.currentSession.options.filter.minInteractionDelay
    ) {
      return false;
    }

    this.lastInteractionTime = now;
    return true;
  }

  /**
   * Find a better selector for a recorded step
   */
  private async findBetterSelector(step: JourneyStep): Promise<string | null> {
    try {
      const page = this.currentSession?.page;
      if (!page || !step.selector) return null;

      const locator = page.locator(step.selector);
      const suggestions = await this.suggestSelectors(page, locator);

      // Return the highest reliability selector
      return suggestions.length > 0 ? suggestions[0].selector : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Merge consecutive navigation steps
   */
  private mergeNavigationSteps(steps: JourneyStep[]): void {
    for (let i = steps.length - 2; i >= 0; i--) {
      if (
        steps[i].action === "navigate" &&
        steps[i + 1].action === "navigate"
      ) {
        steps.splice(i, 1); // Remove the earlier navigate
      }
    }
  }

  /**
   * Remove duplicate consecutive interactions
   */
  private removeDuplicateInteractions(steps: JourneyStep[]): void {
    for (let i = steps.length - 2; i >= 0; i--) {
      const current = steps[i];
      const next = steps[i + 1];

      if (
        current.action === next.action &&
        current.selector === next.selector &&
        !current.value &&
        !next.value
      ) {
        // Only for non-input actions
        steps.splice(i, 1);
      }
    }
  }

  /**
   * Generate description for click action
   */
  private describeClick(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim();

    if (tagName === "button") {
      return `Click ${text ? `button "${text}"` : "button"}`;
    } else if (tagName === "a") {
      return `Click ${text ? `link "${text}"` : "link"}`;
    } else if (
      tagName === "input" &&
      (element as HTMLInputElement).type === "submit"
    ) {
      return `Click submit button`;
    } else {
      return `Click ${tagName}${text ? ` "${text}"` : ""}`;
    }
  }

  /**
   * Generate description for input action
   */
  private describeInput(element: HTMLInputElement): string {
    const tagName = element.tagName.toLowerCase();
    const type = element.type;
    const placeholder = element.placeholder;
    const label = element.getAttribute("aria-label");

    let description = `Type into ${tagName}`;
    if (type && type !== "text") description += `[${type}]`;
    if (label) description += ` "${label}"`;
    else if (placeholder) description += ` "${placeholder}"`;

    return description;
  }
}
