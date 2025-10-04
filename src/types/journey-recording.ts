/**
 * Journey Recording types and interfaces
 * Defines TypeScript interfaces for journey recording functionality
 */

export interface RecordingOptions {
  name: string;
  description?: string;
  filter?: {
    excludeSelectors?: string[];
    excludeActions?: ("scroll" | "hover" | "focus")[];
    minInteractionDelay?: number;
  };
  autoSelectors?: boolean;
  maxRecordingTime?: number;
  video?: {
    enabled: boolean;
    format?: "webm"; // Only webm supported by Playwright
    quality?: number; // Video quality (0.0 to 1.0)
  };
  screenshotOnStep?: boolean; // Capture screenshot for each step
}

export interface RecordedStep {
  id: string;
  action: "navigate" | "click" | "type" | "wait" | "assert" | "screenshot" | "scroll" | "focus";
  selector?: string;
  selectorOptions?: SelectorSuggestion[];
  value?: string;
  url?: string;
  timestamp: number;
  pageX?: number;
  pageY?: number;
  elementTag?: string;
  elementText?: string;
  elementId?: string;
  elementClass?: string;
}

export interface SelectorSuggestion {
  selector: string;
  score: number; // 0-100 based on uniqueness/stability
  type: "id" | "class" | "attribute" | "xpath" | "css";
  description?: string;
}

export interface RecordingSession {
  id: string;
  name: string;
  options: RecordingOptions;
  steps: RecordedStep[];
  startTime: number;
  endTime?: number;
  isRecording: boolean;
  isPaused: boolean;
  currentUrl?: string;
  eventsRecorded: number;
  eventsFiltered: number;
}

export interface RecordingResult {
  session: RecordingSession;
  journeyDefinition: JourneyDefinition;
  statistics: {
    totalEvents: number;
    recordedSteps: number;
    filteredEvents: number;
    recordingDuration: number;
  };
  optimization?: RecordingOptimization;
  recordings?: {
    video?: string; // Path to recorded video file
    screenshots?: string[]; // Paths to step screenshots if enabled
    thumbnail?: string; // Path to video thumbnail if generated
  };
}

export interface JourneyDefinition {
  name: string;
  description?: string;
  steps: JourneyStep[];
  metadata?: {
    recordedAt: string;
    recordedBy: string;
    originalUrl: string;
    browserInfo: string;
  };
}

export interface JourneyStep {
  id: string;
  action: "navigate" | "click" | "type" | "wait" | "assert" | "screenshot" | "scroll" | "focus";
  selector?: string;
  value?: string;
  url?: string;
  condition?: string;
  timeout?: number;
  retryCount?: number;
  description?: string;
}

export interface RecordingOptimization {
  originalSteps: number;
  optimizedSteps: number;
  redundantWaitsRemoved: number;
  similarActionsMerged: number;
  suggestions: string[];
}

export interface RecordingStatus {
  sessionId?: string;
  isRecording: boolean;
  isPaused: boolean;
  currentUrl?: string;
  stepsRecorded: number;
  recordingDuration: number;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
}
