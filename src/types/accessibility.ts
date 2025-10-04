/**
 * Accessibility Testing types and interfaces
 * Defines TypeScript interfaces for accessibility testing functionality
 */

export interface AccessibilityOptions {
  standards?: ("WCAG2A" | "WCAG2AA" | "Section508")[];
  rules?: string[];
  includeBestPractices?: boolean;
  excludeRules?: string[];
  runOnly?: {
    type: "tag" | "rule";
    values: string[];
  };
}

export interface ViolationNode {
  target: string;
  html: string;
  failureSummary?: string;
}

export interface Violation {
  ruleId: string;
  description: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
  tags: string[];
}

export interface RuleResult {
  ruleId: string;
  description: string;
  help: string;
  helpUrl: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  tags: string[];
  nodes: Array<{
    target: string[];
    html: string;
    impact: "minor" | "moderate" | "serious" | "critical";
    any?: Array<{
      id: string;
      data: any;
      relatedNodes: Array<{
        target: string[];
        html: string;
      }>;
    }>;
    all?: Array<{
      id: string;
      data: any;
    }>;
    none?: Array<{
      id: string;
      data: any;
    }>;
  }>;
}

export interface AccessibilityResult {
  violations: Violation[];
  passes: RuleResult[];
  incomplete: RuleResult[];
  inapplicable: RuleResult[];
  testEngine: {
    name: string;
    version: string;
  };
  testRunner: {
    name: string;
  };
  testEnvironment: {
    userAgent: string;
    windowWidth: number;
    windowHeight: number;
    orientationAngle?: number;
    orientationType?: string;
  };
  timestamp: string;
  url: string;
  toolOptions: AccessibilityOptions;
  summary: {
    passed: number;
    failed: number;
    incomplete: number;
    inapplicable: number;
    total: number;
  };
}

export interface ContrastResult {
  element: string;
  selector: string;
  foreground: string;
  background: string;
  ratio: number;
  isLargeText: boolean;
  passes: boolean;
  suggestedColors?: {
    foreground?: string;
    background?: string;
  };
}

export interface KeyboardNavigationStep {
  element: string;
  tabIndex?: number;
  visible: boolean;
  focusable: boolean;
  accessibleName?: string;
  role?: string;
}

export interface KeyboardNavigationResult {
  steps: KeyboardNavigationStep[];
  totalElements: number;
  focusableElements: number;
  issues: string[];
  summary: {
    totalSteps: number;
    focusableSteps: number;
    visibleSteps: number;
    issuesCount: number;
  };
}

export interface AccessibilityReport {
  pageAudit: AccessibilityResult;
  colorContrast?: ContrastResult[];
  keyboardNavigation?: KeyboardNavigationResult;
  overallScore: number;
  recommendations: string[];
}
