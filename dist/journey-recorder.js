// Global registry for maintaining JourneyRecorder instances across MCP tool calls
const recorderRegistry = new Map();
export class JourneyRecorder {
    sessionId = null;
    currentSession = null;
    eventListeners = new Map();
    lastInteractionTime = 0;
    /**
     * Get or create a JourneyRecorder instance by session ID
     */
    static getInstance(sessionId) {
        if (sessionId) {
            // Try to retrieve existing instance
            const existingInstance = recorderRegistry.get(sessionId);
            if (existingInstance) {
                return existingInstance;
            }
            // Create new instance for the session
            const newInstance = new JourneyRecorder;
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
    static removeInstance(sessionId) {
        recorderRegistry.delete(sessionId);
    }
    /**
     * Get all active recorder instances
     */
    static getActiveInstances() {
        return Array.from(recorderRegistry.keys());
    }
    /**
     * Start recording user interactions
     */
    async startRecording(page, options) {
        if (this.currentSession?.isRecording) {
            throw new Error("A recording session is already active. Stop current recording first.");
        }
        const sessionId = `rec_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const session = {
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
    async stopRecording(sessionId) {
        if (!this.currentSession || this.currentSession.id !== sessionId) {
            throw new Error(`Recording session ${sessionId} not found`);
        }
        const session = this.currentSession;
        this.cleanupEventListeners(session.page);
        // Filter and optimize the recorded steps
        const optimizedSteps = await this.optimizeRecordedSteps(session.steps);
        const journey = {
            name: session.name,
            description: session.options.description || `Recorded journey: ${session.name}`,
            steps: optimizedSteps,
            created: session.startTime,
            modified: new Date(),
            source: "recorded",
            recordedFrom: session.currentUrl,
        };
        this.currentSession = null;
        console.log(`⏹️ Stopped recording journey: ${session.name} (${optimizedSteps.length} steps)`);
        return journey;
    }
    /**
     * Pause current recording session
     */
    async pauseRecording(sessionId) {
        if (!this.currentSession || this.currentSession.id !== sessionId) {
            throw new Error(`Recording session ${sessionId} not found`);
        }
        this.currentSession.isRecording = false;
        console.log(`⏸️ Paused recording: ${this.currentSession.name}`);
    }
    /**
     * Resume paused recording session
     */
    async resumeRecording(sessionId) {
        if (!this.currentSession || this.currentSession.id !== sessionId) {
            throw new Error(`Recording session ${sessionId} not found`);
        }
        this.currentSession.isRecording = true;
        console.log(`▶️ Resumed recording: ${this.currentSession.name}`);
    }
    /**
     * Get current recording session status
     */
    async getCurrentSession() {
        return this.currentSession;
    }
    /**
     * Generate smart selector suggestions for an element
     */
    async suggestSelectors(page, element) {
        const suggestions = [];
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
            function getXPath(element) {
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
                    }
                    else {
                        let sib = parent.previousSibling;
                        let nth = 1;
                        while (sib) {
                            if (sib.nodeType === Node.ELEMENT_NODE &&
                                sib.tagName === parent.tagName) {
                                nth++;
                            }
                            sib = sib.previousSibling;
                        }
                        selector += `[${nth}]`;
                    }
                    path.unshift(selector);
                    parent = parent.parentElement;
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
    async optimizeRecordedSteps(steps) {
        const optimized = [];
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
        // Merge consecutive navigation steps
        this.mergeNavigationSteps(steps);
        // Remove duplicate consecutive clicks on the same element
        this.removeDuplicateInteractions(steps);
        return steps;
    }
    /**
     * Setup event listeners for user interaction recording
     */
    setupEventListeners(page, session) {
        const clickListener = async (event) => {
            if (!session.isRecording || !this.shouldRecordInteraction())
                return;
            const element = event.target;
            if (!element)
                return;
            const selector = await this.generateSelector(page, element);
            const description = this.describeClick(element);
            session.steps.push({
                id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                action: "click",
                selector,
                description,
            });
        };
        const inputListener = async (event) => {
            if (!session.isRecording || !this.shouldRecordInteraction())
                return;
            const element = event.target;
            if (!element || element.type === "password")
                return;
            const selector = await this.generateSelector(page, element);
            const description = this.describeInput(element);
            const value = element.value;
            // Find the last step with matching selector and action
            const existingStep = [...session.steps]
                .reverse()
                .find((s) => s.selector === selector && s.action === "type");
            if (existingStep && existingStep.value !== undefined) {
                // Update existing step with new value
                existingStep.value = value;
            }
            else {
                // Add new type step
                session.steps.push({
                    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    action: "type",
                    selector,
                    value,
                    description,
                });
            }
        };
        const navigationListener = async (url) => {
            if (!session.isRecording)
                return;
            session.steps.push({
                id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                action: "navigate",
                value: url,
                description: `Navigate to ${url}`,
            });
            session.currentUrl = url;
        };
        // Register listeners using locator events instead
        page
            .locator("*")
            .filter({ hasText: /.*/ }) // Clickable elements
            .first() // Just a placeholder for now
            .page()
            .exposeFunction("__journey_click", clickListener);
        // Listen for input events
        page
            .locator('input[type="text"], input[type="email"], input[type="number"], textarea')
            .evaluateAll((inputs) => {
            inputs.forEach((input) => {
                input.addEventListener("input", () => {
                    // Trigger custom event for page context
                    window.dispatchEvent(new CustomEvent("__journey_input", { detail: { element: input } }));
                });
            });
        });
        // Listen for navigation events
        page.on("framenavigated", (frame) => {
            if (frame === page.mainFrame) {
                navigationListener(frame.url);
            }
        });
        // Store listeners for cleanup
        this.eventListeners.set("click", clickListener);
        this.eventListeners.set("navigation", navigationListener);
    }
    /**
     * Cleanup event listeners
     */
    cleanupEventListeners(page) {
        for (const [event, listener] of this.eventListeners) {
            page.off(event, listener);
        }
        this.eventListeners.clear();
    }
    /**
     * Generate a reliable selector for an element
     */
    async generateSelector(page, element) {
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
                const isUnique = await page.evaluate((selector) => {
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
    shouldFilterStep(step) {
        if (!this.currentSession?.options.filter)
            return false;
        const { excludeSelectors = [], excludeActions = [] } = this.currentSession.options.filter;
        // Check excluded selectors
        if (step.selector &&
            excludeSelectors.some((excl) => step.selector.includes(excl) || new RegExp(excl).test(step.selector))) {
            return true;
        }
        // Check excluded actions - only check for actions that can be filtered
        return excludeActions.some((action) => action === step.action);
    }
    /**
     * Check if interaction should be recorded based on timing
     */
    shouldRecordInteraction() {
        if (!this.currentSession?.options.filter?.minInteractionDelay)
            return true;
        const now = Date.now();
        const timeSinceLast = now - this.lastInteractionTime;
        if (timeSinceLast < this.currentSession.options.filter.minInteractionDelay) {
            return false;
        }
        this.lastInteractionTime = now;
        return true;
    }
    /**
     * Find a better selector for a recorded step
     */
    async findBetterSelector(step) {
        try {
            const page = this.currentSession?.page;
            if (!page || !step.selector)
                return null;
            const locator = page.locator(step.selector);
            const suggestions = await this.suggestSelectors(page, locator);
            // Return the highest reliability selector
            return suggestions.length > 0 ? suggestions[0].selector : null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Merge consecutive navigation steps
     */
    mergeNavigationSteps(steps) {
        for (let i = steps.length - 2; i >= 0; i--) {
            if (steps[i].action === "navigate" &&
                steps[i + 1].action === "navigate") {
                steps.splice(i, 1); // Remove the earlier navigate
            }
        }
    }
    /**
     * Remove duplicate consecutive interactions
     */
    removeDuplicateInteractions(steps) {
        for (let i = steps.length - 2; i >= 0; i--) {
            const current = steps[i];
            const next = steps[i + 1];
            if (current.action === next.action &&
                current.selector === next.selector &&
                !current.value &&
                !next.value) {
                // Only for non-input actions
                steps.splice(i, 1);
            }
        }
    }
    /**
     * Generate description for click action
     */
    describeClick(element) {
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent?.trim();
        if (tagName === "button") {
            return `Click ${text ? `button "${text}"` : "button"}`;
        }
        else if (tagName === "a") {
            return `Click ${text ? `link "${text}"` : "link"}`;
        }
        else if (tagName === "input" &&
            element.type === "submit") {
            return `Click submit button`;
        }
        else {
            return `Click ${tagName}${text ? ` "${text}"` : ""}`;
        }
    }
    /**
     * Generate description for input action
     */
    describeInput(element) {
        const tagName = element.tagName.toLowerCase();
        const type = element.type;
        const placeholder = element.placeholder;
        const label = element.getAttribute("aria-label");
        let description = `Type into ${tagName}`;
        if (type && type !== "text")
            description += `[${type}]`;
        if (label)
            description += ` "${label}"`;
        else if (placeholder)
            description += ` "${placeholder}"`;
        return description;
    }
}
