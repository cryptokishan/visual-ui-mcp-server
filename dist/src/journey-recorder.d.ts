import { Locator, Page } from "playwright";
import { JourneyDefinition, RecordingOptions, RecordingSession, SelectorSuggestion } from "./journey-simulator";
export declare class JourneyRecorder {
    private sessionId;
    private currentSession;
    private eventListeners;
    private lastInteractionTime;
    /**
     * Get or create a JourneyRecorder instance by session ID
     */
    static getInstance(sessionId?: string): JourneyRecorder;
    /**
     * Remove a JourneyRecorder instance from the registry
     */
    static removeInstance(sessionId: string): void;
    /**
     * Get all active recorder instances
     */
    static getActiveInstances(): string[];
    /**
     * Start recording user interactions
     */
    startRecording(page: Page, options: RecordingOptions): Promise<RecordingSession>;
    /**
     * Stop recording and return journey definition
     */
    stopRecording(sessionId: string): Promise<JourneyDefinition>;
    /**
     * Pause current recording session
     */
    pauseRecording(sessionId: string): Promise<void>;
    /**
     * Resume paused recording session
     */
    resumeRecording(sessionId: string): Promise<void>;
    /**
     * Get current recording session status
     */
    getCurrentSession(): Promise<RecordingSession | null>;
    /**
     * Generate smart selector suggestions for an element
     */
    suggestSelectors(page: Page, element: Locator): Promise<SelectorSuggestion[]>;
    /**
     * Optimize recorded steps by removing noise and improving selectors
     */
    private optimizeRecordedSteps;
    /**
     * Setup event listeners for user interaction recording
     */
    private setupEventListeners;
    private generateSelectorFromHandle;
    private describeClickFromHandle;
    private describeInputFromHandle;
    /**
     * Cleanup event listeners
     */
    private cleanupEventListeners;
    /**
     * Generate a reliable selector for an element
     */
    private generateSelector;
    /**
     * Check if interaction should be filtered out
     */
    private shouldFilterStep;
    /**
     * Check if interaction should be recorded based on timing
     */
    private shouldRecordInteraction;
    /**
     * Find a better selector for a recorded step
     */
    private findBetterSelector;
    /**
     * Merge consecutive navigation steps
     */
    private mergeNavigationSteps;
    /**
     * Remove duplicate consecutive interactions
     */
    private removeDuplicateInteractions;
    /**
     * Generate description for click action
     */
    private describeClick;
    /**
     * Generate description for input action
     */
    private describeInput;
}
