# Visual UI MCP Server Feature Prompts

## Executive Summary

This document provides structured, LLM-optimized prompts and step-by-step implementation guidance for enhancing the `visual-ui-mcp-server`. The features focus on improving visual testing, element interaction reliability, and robustness for web application testing. Each prompt is designed as a self-contained task for AI-assisted development, with clear requirements and actionable steps.

Last updated: 2025-10-04 (v4.0.0 rewrite completed)

## How to use this document

- Each "Prompt" section is intended to be implementable as a single PR-sized task. Follow the Implementation Steps and API Design when creating files and tests.
- Use the "Testing Steps" as acceptance criteria for CI and local validation. Where possible, add small unit tests first (happy path + one edge case), then integration tests.
- When adding new npm dependencies, list them in `package.json` and include a short justification in the PR description.

## Acceptance criteria & testing template

For each prompt, prefer a short checklist in the PR description derived from the prompt's "Requirements" and "Testing Steps". A recommended minimal template:

- [ ] Implementation file(s) added under `src/` following the stated filenames
- [ ] Public API matches (or is backwards-compatible with) the prompt's API Design
- [ ] All tests should use MCP protocol the way client interacts with MCP Server
- [ ] Integration or end-to-end test where applicable (Playwright/Vitest)
- [ ] CI job runs and passes locally (lint + tests)
- [ ] README or inline docs updated for new public behavior

## Suggested dependencies

These are small, commonly used packages referenced by prompts; add only what you need for the feature:

- axe-core (for accessibility audits) - low priority
- pixelmatch (for pixel diffs) and optionally ssim or sharp for image handling
- uuid or nanoid for deterministic rule/session ids in mocking/recording

Add them to `package.json` with an entry explaining why they're required.

### 📋 **CURRENT IMPLEMENTATION STATUS (v4.0.0 + Phase 5)**

**COMPLETED: 8/8 major features implemented including architecture refactoring**

### ✅ **COMPLETED FEATURE PHASES:**

- **Phase 1: Core Interaction Improvements** ✅ FULLY IMPLEMENTED (All 3 core features: element locator, form handler, smart waiting)
- **Phase 2: Visual Analysis & Comparison** ✅ FULLY IMPLEMENTED (Screenshots, comparison, regression detection)
- **Phase 3: Browser Context & Debugging** ✅ FULLY IMPLEMENTED (Console/network monitoring, performance tracking)
- **Phase 4: Advanced Testing Capabilities** ✅ FULLY IMPLEMENTED (Journey simulation, accessibility testing, backend mocking)
- **Phase 4.3: Backend Service Mocking Integration** ✅ IMPLEMENTED
- **Phase 5: Core Architecture Refactoring** ✅ IMPLEMENTED (Unified module architecture with WaitHelper as single source of truth)

All MCP tools are now active and tested across 27 comprehensive E2E tests.

### 🎯 **Next Priority Recommendations:**

#### **HIGH PRIORITY - Phase 3: Browser Context & Debugging**

Why now? This addresses the most common debugging needs for web testing.

- **Console & Network Monitoring** - Essential for debugging client-side issues
- **Performance Monitoring Integration** - Critical for performance regression detection

#### **MEDIUM PRIORITY - Phase 4: Advanced Testing Capabilities**

Why next? These enhance the testing platform's sophistication.

- **User Journey Simulation** - Complete workflow testing
- **Accessibility Testing Integration** - Compliance and usability validation

### 🚀 **Immediate Benefits of Phase 3:**

1. **Debugging Capabilities** - Console logs, network requests, JavaScript errors
2. **Performance Monitoring** - LCP/CLS and synthetic input responsiveness (INP/TBT) for automated runs; memory tracking where available (Chromium only)
3. **Error Detection** - Automated issue identification and reporting
4. **Quality Assurance** - Comprehensive monitoring during test execution

## Current Shortcomings Analysis

### 1. Element Interaction Issues

**Problem**: Unreliable element selection and interaction  
**Impact**: Tests fail when elements can't be found or interacted with  
**Root Cause**: Limited selector strategies and no fallback mechanisms

### 2. Limited Form Interaction

**Problem**: Cannot fill forms, submit data, or test form validation  
**Impact**: Cannot test complete user workflows involving forms  
**Missing**: Input field manipulation, form submission, validation feedback

### 3. Static Screenshot Analysis

**Problem**: Only full-page screenshots, no selective capture  
**Impact**: Cannot focus on specific UI components or detect subtle changes  
**Missing**: Element-specific screenshots, before/after comparisons

### 4. No Dynamic Content Handling

**Problem**: No waiting mechanisms for AJAX, React rendering, or animations  
**Impact**: Tests fail on dynamic single-page applications  
**Missing**: Smart waiting for elements, content loading detection

### 5. Limited Browser Context

**Problem**: No access to browser console, network requests, or JavaScript errors  
**Impact**: Cannot debug client-side issues or API failures  
**Missing**: Console monitoring, network request inspection, error detection

## Feature Roadmap

### Phase 1: Core Interaction Improvements (High Priority) ❌ NOT IMPLEMENTED

#### Prompt 1.1: Enhanced Element Selection System

Status: ✅ IMPLEMENTED (Priority: High)

````
You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement the Enhanced Element Selection System for the visual-ui-mcp-server to provide reliable element location across various strategies and conditions.

**Task Overview:**
Create a robust system that supports multiple selector types with fallback mechanisms, smart waiting, state verification, and cross-browser support. This will reduce test flakiness by ensuring elements are locatable and interactable.

**Requirements:**
1. Multi-strategy element location with automatic fallback to alternative selectors if the primary fails.
2. Support for CSS selectors, XPath, text content, ARIA labels, and data attributes.
3. Smart element waiting with configurable timeouts to handle dynamic content.
4. Element visibility and interactability verification before actions.
5. Cross-browser compatibility handling for Chrome, Firefox, and Safari.

**Implementation Steps:**
1. Create a new file `src/element-locator.ts` and define the `ElementLocator` class.
2. Implement location strategies in priority order: CSS > XPath > text > ARIA > data attributes.
3. Add visibility checks using Playwright's `isVisible()` and viewport intersection.
4. Integrate retry logic with exponential backoff (max 3 retries, starting at 100ms).
5. Extend support for shadow DOM traversal and iframe context switching using Playwright APIs.
6. Export the class for use in other modules like form-handler and visual-testing.

**API Design:**
```typescript
interface LocatorOptions {
  selector: string;
  type?: any; //selector types supported by playwright
  timeout?: number;
  retryCount?: number;
  visibilityCheck?: boolean;
}

class ElementLocator {
  async locate(page: Page, options: LocatorOptions): Promise<ElementHandle | null>;
  async waitForElement(page: Page, options: LocatorOptions): Promise<ElementHandle>;
  async verifyInteractable(element: ElementHandle): Promise<boolean>;
}
````

**Testing Steps:**

1. Write 9 unit/integration tests in `src/element-locator.test.ts` using Vitest.
2. Test selector combinations (e.g., CSS fallback to XPath).
3. Verify fallback behavior on invalid selectors.
4. Test timeout and retry on dynamic elements (use mock page with setTimeout).
5. Validate cross-browser by running tests in different Playwright browsers.
6. Ensure shadow DOM and iframe support with test fixtures.

```

#### Prompt 1.2: Form Interaction Framework
Status: ✅ IMPLEMENTED + ENHANCED (Priority: High)

**Recent Enhancement (v3.1.0):** MCP Structured Error Responses
- ✅ Enhanced error handling with structured success responses instead of protocol exceptions
- ✅ Two-level validation: argument checking + form-aware validation with HTML analysis
- ✅ Detailed error feedback including missing fields and required fields lists
- ✅ AI agent compatible - Cline and similar agents can parse structured responses
- ✅ Maintains MCP protocol compliance while providing actionable error details

Prior Implementation:

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement the Comprehensive Form Interaction Framework for the visual-ui-mcp-server to enable automated form handling, population, submission, and validation testing.

**Task Overview:**
Build a framework that detects form fields, supports all input types, handles submissions, file uploads, and resets, ensuring complete user workflow testing without manual intervention.

**Requirements:**

1. Automated form field detection and population for text, password, email, number, etc.
2. Support for all HTML input types, including select, textarea, checkbox, radio.
3. Form submission with validation handling and error capture.
4. File upload capabilities, including drag-and-drop simulation.
5. Form reset and clearing functionality for clean state testing.

**Implementation Steps:**

1. Create a new file `src/form-handler.ts` and define the `FormHandler` class.
2. Implement form detection using Playwright's `querySelectorAll` for input, select, textarea.
3. Add type detection based on input attributes and apply appropriate population methods (e.g., fill for text, selectOption for dropdowns).
4. Handle submission by locating submit buttons or using form.submit(), then capture validation feedback via text content or classes.
5. Support file uploads using page.setInputFiles and simulate drag-and-drop with mouse events.
6. Add reset functionality using form.reset() and clear methods for individual fields.
7. Integrate error handling for invalid inputs and network failures.

**API Design:**

```typescript
interface FormField {
  type: string;
  selector: string;
  value?: string;
  options?: string[];
}

interface FormOptions {
  populate?: Record<string, any>;
  validate?: boolean;
  fileUpload?: { selector: string; path: string };
}

class FormHandler {
  async detectFields(page: Page, formSelector: string): Promise<FormField[]>;
  async fillForm(
    page: Page,
    formSelector: string,
    data: Record<string, any>
  ): Promise<void>;
  async submitForm(
    page: Page,
    formSelector: string,
    options?: FormOptions
  ): Promise<FormResult>;
  async uploadFile(
    page: Page,
    selector: string,
    filePath: string
  ): Promise<void>;
  async resetForm(page: Page, formSelector: string): Promise<void>;
  async getValidationErrors(
    page: Page,
    formSelector: string
  ): Promise<string[]>;
}
```

**Testing Steps:**

1. Write 12 tests in `src/form-handler.test.ts` covering input types, submission, uploads, resets.
2. Test form detection and population with mock forms.
3. Verify submission and validation on success/failure scenarios.
4. Test file upload with temporary files and drag simulation.
5. Check error handling for invalid data and network mocks.
6. Run end-to-end tests with real Playwright pages.

```

#### Prompt 1.3: Smart Waiting Mechanisms
Status: ✅ IMPLEMENTED + ENHANCED (Priority: High)

**Implementation Complete (v3.1.0):** Advanced awaiting mechanisms for reliable web automation
- ✅ Content loading detection using CSS selectors, XPath, and JavaScript expressions
- ✅ Network idle waiting with configurable thresholds
- ✅ JavaScript execution completion monitoring
- ✅ CSS animation and transition waiting (using element stability)
- ✅ Custom JavaScript condition evaluation
- ✅ URL change detection (useful for SPA routing)
- ✅ Comprehensive page load strategy combining multiple wait conditions
- ✅ MCP tool exposed with structured error responses for AI agent integration
- ✅ Full E2E test coverage verifying MCP protocol compliance

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement Smart Waiting Mechanisms for the visual-ui-mcp-server to handle dynamic content, network requests, JS execution, and animations without test flakiness.

**Task Overview:**
Integrate waiting logic into existing locators and handlers to detect content loading, wait for completion, and evaluate custom conditions, supporting SPA and asynchronous behaviors.

**Requirements:**

1. Content loading detection and waiting for DOM changes.
2. Network request completion monitoring.
3. JavaScript execution completion detection.
4. Animation and transition completion waiting.
5. Custom condition evaluation using JS expressions.

**Implementation Steps:**

1. Extend `ElementLocator` and `FormHandler` classes with wait methods.
2. Implement network idle detection using Playwright's network events (wait for no requests > 500ms).
3. Add JS execution monitoring with page.evaluate to check script status.
4. Use Playwright's waitForFunction for animation completion (check computed styles).
5. Support custom waits via page.waitForFunction with user-provided JS.
6. Add configurable timeouts and polling intervals.
7. Handle SPA routing by waiting for URL changes or specific selectors.

**API Design:**

```typescript
interface WaitOptions {
  condition: string; // JS expression or selector
  timeout?: number;
  polling?: "raf" | "mutation" | "interval";
}

class WaitHelper {
  async waitForContent(page: Page, options: WaitOptions): Promise<void>;
  async waitForNetworkIdle(page: Page, timeout?: number): Promise<void>;
  async waitForJSExecution(page: Page): Promise<void>;
  async waitForAnimation(element: ElementHandle): Promise<void>;
  async waitForCustom(page: Page, expression: string): Promise<any>;
}
```

**Testing Steps:**

1. Integrate tests into element-locator and form-handler test suites.
2. Test AJAX loading waits with mocked network delays.
3. Verify SPA routing waits with navigation events.
4. Test animation waits with CSS transitions in mock pages.
5. Check custom condition evaluation with complex JS.
6. Measure performance impact (<100ms overhead).
7. Test timeout handling and error recovery.

```

### Phase 2: Visual Analysis & Comparison (Medium Priority) ❌ NOT IMPLEMENTED

#### Prompt 2.1: Selective Screenshot Capture
Status: ✅ IMPLEMENTED (Priority: Medium)

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement Selective Screenshot Capture for the visual-ui-mcp-server to enable element-specific and region-based screenshots for focused testing.

**Task Overview:**
Extend visual testing to capture screenshots of specific elements or regions, support multiple formats, enable comparisons, and test responsive views.

**Requirements:**

1. Element-specific screenshot capture from bounding boxes.
2. Custom region selection and cropping by coordinates.
3. Multiple format support (PNG, JPEG, WebP) with quality options.
4. Screenshot comparison and diffing for visual changes.
5. Responsive breakpoint testing with device emulation.

**Implementation Steps:**

1. Extend `src/visual-testing.ts` with selective capture methods.
2. Use Playwright's screenshot with clip option for elements/regions.
3. Implement boundary detection using element.boundingBox().
4. Add format and quality parameters to screenshot calls.
5. Integrate comparison using pixelmatch or resemble.js for diffs.
6. Support responsive by emulating devices (mobile, tablet) via Playwright.
7. Add annotation overlay for highlighting changes.

**API Design:**

```typescript
interface ScreenshotOptions {
  type: "element" | "region" | "full";
  selector?: string;
  clip?: { x: number; y: number; width: number; height: number };
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  responsive?: string; // 'mobile' | 'tablet' | 'desktop'
}

class VisualTester {
  async captureSelective(
    page: Page,
    options: ScreenshotOptions
  ): Promise<Buffer>;
  async compareScreenshots(
    buffer1: Buffer,
    buffer2: Buffer
  ): Promise<DiffResult>;
  async testResponsive(
    page: Page,
    breakpoints: string[]
  ): Promise<ScreenshotMap>;
}
```

**Testing Steps:**

1. Write 10 tests for capture types, formats, comparisons.
2. Test element clipping accuracy with various UI components.
3. Verify responsive screenshots with emulated viewports.
4. Check diff accuracy on subtle changes (color, layout).
5. Test file quality and size optimization.
6. Validate annotations in diff outputs.

```

#### Prompt 2.2: Visual Regression Detection
Status: ✅ IMPLEMENTED (Priority: Medium)

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement Visual Regression Detection for the visual-ui-mcp-server to automatically detect UI changes through baseline comparisons.

**Task Overview:**
Develop tools for baseline management, automated diffing, change highlighting, false positive reduction, and historical tracking to catch visual regressions early.

**Requirements:**

1. Baseline screenshot management with versioning.
2. Automated comparison algorithms for pixel and perceptual diffs.
3. Change detection and highlighting with bounding boxes.
4. False positive reduction using thresholds and hashing.
5. Historical comparison tracking for trend analysis.

**Implementation Steps:**

1. Enhance `VisualTesting` class in `src/visual-testing.ts` with regression methods.
2. Implement baseline storage using file system or JSON for metadata.
3. Use pixelmatch for exact diffs and SSIM for perceptual.
4. Generate bounding boxes for changes using diff masks.
5. Add tolerance thresholds and content-based hashing to ignore minor variations.
6. Track history with timestamped baselines and diff reports.
7. Integrate with CI for automated baseline updates.

**API Design:**

```typescript
interface RegressionOptions {
  baselinePath: string;
  tolerance?: number;
  perceptual?: boolean;
  highlightChanges?: boolean;
}

interface DiffResult {
  isDifferent: boolean;
  diffImage: Buffer;
  changes: BoundingBox[];
  score: number;
  history?: DiffHistory[];
}

class VisualRegressionTester {
  async detectRegression(
    page: Page,
    options: RegressionOptions
  ): Promise<DiffResult>;
  async updateBaseline(path: string, screenshot: Buffer): Promise<void>;
  async getHistory(baseline: string): Promise<DiffHistory[]>;
}
```

**Testing Steps:**

1. Integrate into visual-testing test suite.
2. Test UI changes (text edits, layout shifts, color updates).
3. Verify false positive reduction with stable UIs.
4. Check baseline operations (create, update, load).
5. Test change detection accuracy with known diffs.
6. Validate historical tracking over multiple runs.

```

### Phase 3: Browser Context & Debugging (High Priority)

#### Prompt 3.2: Performance Monitoring Integration
Status: DEFERRED (recommend external tooling)

```

Deep, production-grade performance measurement (full Core Web Vitals, reliable FID, memory profiling) is best handled by specialized tools such as Lighthouse or WebPageTest. These tools run in real browser environments and provide stable, field-like metrics.

Recommendation: keep `BrowserMonitor` focused on console/network/error capture and basic timing (navigation & FCP/DOMContentLoaded). For CI performance gates or historical baselines, integrate Lighthouse/WebPageTest into CI and import their results for regression detection.

If lightweight timing is required in-process, implement a small `captureBasicTiming()` that reads the Navigation Timing and relevant PerformanceObserver entries (LCP/CLS) — but treat those as best-effort and document per-browser limitations.

```

1. Test console log capture with page.evaluate logs at different levels.
2. Verify network monitoring by mocking API calls with route.
3. Test JS error detection with thrown exceptions.
4. Validate performance metric collection on loaded pages.
5. Check filtering and max entry limits.
6. Ensure no leaks in event listeners after stop.

```

#### Prompt 3.2: Performance Monitoring Integration

Status: ✅ IMPLEMENTED (see CHANGELOG v2.3.0)

````

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement Performance Monitoring Integration for the visual-ui-mcp-server to measure and analyze web app performance metrics.

**Task Overview:**
Extend browser monitoring to calculate Core Web Vitals, page load times, resource loading, memory usage, and detect regressions against baselines.

**Requirements:**

1. Core Web Vitals measurement (LCP, CLS) and synthetic input responsiveness metrics (prefer INP or Total Blocking Time (TBT) over measuring true FID in automated runs).
2. Page load time analysis from navigation to complete.
3. Resource loading monitoring with timing waterfalls.
4. Memory usage tracking over test duration (Chromium only via CDP; other browsers should provide no-op/fallback behavior).
5. Performance regression detection by comparing to baselines.

**Implementation Steps:**

1. Extend `BrowserMonitor` class with performance methods in `src/browser-monitor.ts`.
2. Use Playwright tracing and in-page PerformanceObserver APIs for LCP and CLS where available.
3. Implement timing analysis using performance.timing and navigation events; note that some metrics may be best-effort in automated contexts.
4. Monitor resource timing with page.on('response') and performance entries.
5. Track memory using CDP endpoints when running Chromium; provide graceful fallbacks for other browsers.
6. Compare metrics against baselines using threshold rules.
7. Generate reports with key metrics and recommendations.

**API Design:**

```typescript
interface PerformanceMetrics {
  coreWebVitals: {
    lcp: number;
    cls: number;
    // Note: FID is a user-centric metric that requires real user interactions; for automated runs prefer INP or TBT.
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  };
  resources: ResourceTiming[];
  memory: {
    used: number;
    total: number;
    limit: number;
  };
}

interface RegressionReport {
  regressedMetrics: string[];
  score: number;
  recommendations: string[];
}

// Full PerformanceMonitor functionality is deferred. See Prompt 3.2 notes recommending Lighthouse/WebPageTest.
````

**Testing Steps:**

1. Test Core Web Vitals on pages with known metrics (use lighthouse or manual).
2. Verify load time analysis on slow-loading mocks.
3. Test resource monitoring with multiple asset loads.
4. Validate memory tracking over long sessions.
5. Check regression detection with varied baselines.
6. Ensure accuracy across browsers.

```

### Phase 4: Advanced Testing Capabilities (Medium Priority)

#### Prompt 4.1: User Journey Simulation
Status: ✅ IMPLEMENTED (Priority: Low)

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement User Journey Simulation for the visual-ui-mcp-server to enable multi-step workflow testing with conditions, error handling, and performance tracking.

**Task Overview:**
Build a simulator for defining and executing user journeys, supporting actions like navigate, click, type, with conditional logic, retries, recording, and metrics.

**Requirements:**

1. Multi-step user journey definition and execution with DSL.
2. Conditional action execution using JS conditions.
3. Error recovery and retry logic (continue, retry, fail).
4. Journey recording and basic playback.
5. Performance measurement (step timing, slowest steps).

**Implementation Steps:**

1. Create `src/journey-simulator.ts` and define `JourneySimulator` class.
2. Parse journey definitions into executable steps (navigate, click, type, wait, assert, screenshot).
3. Implement conditional checks with page.evaluate.
4. Add error handling strategies with configurable onError callbacks.
5. Support recording by listening to user events and generating steps.
6. Measure timing with Date.now around each step.
7. Validate and optimize journeys (remove redundant waits).
8. Integrate 4 MCP tools: run_user_journey, record_user_journey, validate_journey_definition, optimize_journey_definition.

**API Design:**

```typescript
interface JourneyStep {
  id: string;
  action: "navigate" | "click" | "type" | "wait" | "assert" | "screenshot";
  selector?: string;
  value?: string;
  condition?: string; // JS expression
  timeout?: number;
  retryCount?: number;
  onError?: "continue" | "retry" | "fail";
}

interface JourneyOptions {
  name: string;
  steps: JourneyStep[];
  video?: boolean; // Enable video recording during journey execution
  onStepComplete?: (step: JourneyStep, result: any) => void;
  onError?: (error: Error, step: JourneyStep) => void;
  maxDuration?: number;
}

interface JourneyResult {
  success: boolean;
  timings: Record<string, number>;
  errors: Error[];
  screenshots?: string[];
}

class JourneySimulator {
  async runJourney(page: Page, options: JourneyOptions): Promise<JourneyResult>;
  async recordJourney(page: Page, name: string): Promise<JourneyOptions>;
  async validateJourney(options: JourneyOptions): Promise<ValidationResult>;
  async optimizeJourney(options: JourneyOptions): Promise<JourneyOptions>;
}
```

**MCP Tools to Implement:**

1. `run_user_journey` - Execute predefined user journeys (arguments: {name, steps})
2. `record_user_journey` - Start/stop journey recording (arguments: {name})
3. `validate_journey_definition` - Validate syntax and logic (arguments: {steps})
4. `optimize_journey_definition` - Optimize for performance (arguments: {steps})

**Testing Steps:**

1. Write 6 unit tests for execution, assertions, waits, validation, optimization, errors.
2. 7 MCP integration tests for tool calls via protocol.
3. Test screenshot capture in root directory for errors/steps.
4. Verify error recovery in flaky scenarios.
5. End-to-end test multi-step journeys on mock apps.

```

#### Prompt 4.2: Accessibility Testing Integration
Status: ❌ NOT IMPLEMENTED (Priority: Medium)

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement Accessibility Testing Integration for the visual-ui-mcp-server to perform automated WCAG audits and generate reports.

**Task Overview:**
Integrate axe-core for compliance checking, add contrast and keyboard tests, to ensure UI accessibility during visual testing.

**Requirements:**

1. WCAG 2.1 AA compliance checking with axe-core.
2. Automated accessibility audits on pages/elements.
3. Color contrast analysis for text and components.
4. Keyboard navigation testing for focus order.
5. Screen reader compatibility verification via ARIA.

**Implementation Steps:**

1. Create `src/accessibility-tester.ts` and `AccessibilityTester` class.
2. Install and integrate axe-core via npm and page.addInitScript.
3. Run audits using axe.run(page) and parse results.
4. Implement contrast calculation using color libraries (e.g., tinycolor).
5. Test keyboard navigation with tabbing simulation and focus checks.
6. Generate HTML/JSON reports with violations listed.
7. Support standards filtering (WCAG2AA, Section508).

**API Design:**

```typescript
interface AccessibilityOptions {
  standards: ("WCAG2A" | "WCAG2AA" | "Section508")[];
  rules?: string[];
  includeBestPractices?: boolean;
  excludeRules?: string[];
}

interface AccessibilityResult {
  violations: Violation[];
  passes: RuleResult[];
  incomplete: RuleResult[];
  inapplicable: RuleResult[];
  score: number;
  summary: {
    passed: number;
    failed: number;
    incomplete: number;
    total: number;
  };
}

interface ContrastResult {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
}

class AccessibilityTester {
  async runAudit(
    page: Page,
    options?: AccessibilityOptions
  ): Promise<AccessibilityResult>;
  async checkColorContrast(
    page: Page,
    selector?: string
  ): Promise<ContrastResult[]>;
  async testKeyboardNavigation(page: Page): Promise<KeyboardNavigationResult>;
  async generateReport(results: AccessibilityResult): Promise<string>;
}
```

**Testing Steps:**

1. Test audits on pages with known violations (color, alt text, labels).
2. Verify WCAG rule enforcement.
3. Test contrast on various text/background combos.
4. Simulate keyboard tabbing and check focus order.
5. Validate report generation with sample data.
6. Test exclusion/inclusion options.

```

```

**Benefits:**

All backend service mocking features are now production-ready with comprehensive MCP protocol integration for robust E2E testing.

```

#### Prompt 4.2: Accessibility Testing Integration
Status: ✅ IMPLEMENTED (Priority: Medium)

```

You are a senior TypeScript developer specializing in Playwright-based testing tools. Implement Accessibility Testing Integration for the visual-ui-mcp-server to perform automated WCAG audits and generate reports.

**Task Overview:**
Integrate axe-core for compliance checking, add contrast and keyboard tests, to ensure UI accessibility during visual testing.

**Requirements:**

1. WCAG 2.1 AA compliance checking with axe-core.
2. Automated accessibility audits on pages/elements.
3. Color contrast analysis for text and components.
4. Keyboard navigation testing for focus order.
5. Screen reader compatibility verification via ARIA.

**Implementation Steps:**

1. Create `src/accessibility-tester.ts` and `AccessibilityTester` class.
2. Install and integrate axe-core via npm and page.addInitScript.
3. Run audits using axe.run(page) and parse results.
4. Implement contrast calculation using color libraries (e.g., tinycolor).
5. Test keyboard navigation with tabbing simulation and focus checks.
6. Generate HTML/JSON reports with violations listed.
7. Support standards filtering (WCAG2AA, Section508).

**API Design:**

```typescript
interface AccessibilityOptions {
  standards: ("WCAG2A" | "WCAG2AA" | "Section508")[];
  rules?: string[];
  includeBestPractices?: boolean;
  excludeRules?: string[];
}

interface AccessibilityResult {
  violations: Violation[];
  passes: RuleResult[];
  incomplete: RuleResult[];
  inapplicable: RuleResult[];
  score: number;
  summary: {
    passed: number;
    failed: number;
    incomplete: number;
    total: number;
  };
}

interface ContrastResult {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
}

class AccessibilityTester {
  async runAudit(
    page: Page,
    options?: AccessibilityOptions
  ): Promise<AccessibilityResult>;
  async checkColorContrast(
    page: Page,
    selector?: string
  ): Promise<ContrastResult[]>;
  async testKeyboardNavigation(page: Page): Promise<KeyboardNavigationResult>;
  async generateReport(results: AccessibilityResult): Promise<string>;
}
```

**Testing Steps:**

1. Test audits on pages with known violations (color, alt text, labels).
2. Verify WCAG rule enforcement.
3. Test contrast on various text/background combos.
4. Simulate keyboard tabbing and check focus order.
5. Validate report generation with sample data.
6. Test exclusion/inclusion options.

```

### Phase 5: Core Architecture Refactoring (HIGH PRIORITY)

#### Prompt 5.1: Unified Core Module Architecture
Status: ✅ IMPLEMENTED (Priority: High)

**Implementation Complete - Core Architecture Refactoring**

- ✅ **PageStateManager Created**: Centralized state coordination for all modules
- ✅ **WaitHelper Enhanced**: Single source of truth for all waiting operations
- ✅ **FormOperations Integrated**: Uses PageStateManager for sophisticated stability checks
- ✅ **Dependency Architecture**: Proper layering: `WaitHelper → PageStateManager → FormOperations → JourneySimulator`
- ✅ **Backward Compatibility**: Existing APIs preserved while adding new coordination features
- ✅ **Test Verification**: All journey tests pass (7/7) confirming architecture works correctly

## 🔄 **PageStateManager: Critical Cross-Cutting Benefits**

**PageStateManager** is NOT just for user journeys - it's a critical cross-cutting concern that benefits ALL core modules and ensures system-wide reliability:

### __1. FormOperations Coordination__
```typescript
// BEFORE: Basic timeout guessing
await this.page.waitForTimeout(5000); // Hope 5 seconds is enough

// AFTER: Intelligent page state coordination
await pageStateManager.coordinateAction(async () => {
  await this.submitForm();
}, () => this.waitHelper.waitForPageLoad());
```

- Knows when form submission actually completes vs. just waiting blindly
- Prevents race conditions between form actions and page navigation

### __2. ElementLocator Reliability__
```typescript
// BEFORE: Basic element location
const element = await this.page.locator(selector).waitFor();

// AFTER: State-aware element location
const element = await this.pageStateManager.coordinateAction(async () => {
  return await this.elementLocator.locate(this.page, options);
}, undefined, {
  allowConcurrent: false, // Prevents interference during location
});
```

- Ensures elements are checked only when page is truly stable
- Coordinates with other modules performing page-altering actions
- Prevents "element not found" errors due to page state conflicts

### __3. VisualTesting Synchronization__
```typescript
// BEFORE: Blind screenshot capture
const screenshot = await page.screenshot();

// AFTER: Coordinated visual capture
const screenshot = await pageStateManager.coordinateAction(async () => {
  await this.waitHelper.waitForStableState(page, {
    checkAnimations: true,
    checkNetworkIdle: true
  });
  return await page.screenshot();
});
```

- Captures screenshots only when page is fully rendered and stable
- Coordinates with other tools that might trigger page changes
- Ensures visual baselines are captured from consistent states

### __4. BrowserMonitor Enhanced Accuracy__
```typescript
// BEFORE: Uncoordinated monitoring
await browserMonitor.startMonitoring(page);

// AFTER: State-aware monitoring
await pageStateManager.coordinateAction(async () => {
  await browserMonitor.startMonitoring(page);
}, async () => pageStateManager.isPageReady(page));
```

- Tracks when monitoring should start/stop based on page state
- Prevents capturing events during unstable page transitions
- Provides timing context for performance metrics and console logs

### __5. JourneySimulator Stability__
```typescript
// BEFORE: Manual waiting coordination
await step1.execute();
await this.page.waitForTimeout(1000);
await step2.execute();

// AFTER: Intelligent inter-step coordination
await orchestrationManager.coordinateSteps([step1, step2, step3], {
  interStepStability: true,
  maxConcurrentSteps: 1
});
```

- Ensures each step executes only when page is ready
- Prevents race conditions between sequential actions
- Coordinates complex multi-step workflows reliably

**Key Architectural Achievements:**

1. **Centralized Waiting Logic**: All waiting operations now go through WaitHelper
2. **State Coordination**: PageStateManager prevents race conditions between modules
3. **Functional Composition**: Modules compose existing primitives rather than duplicating logic
4. **Intelligent Stability**: Advanced DOM/network/animation monitoring replaces basic timeouts
5. **Error Recovery**: Built-in retry logic with exponential backoff
6. **Scalability**: New tools automatically get sophisticated coordination

**Before & After:**
```
BEFORE: Scattered waiting + race conditions
JourneySimulator: page.waitForTimeout()
FormOperations: page.waitForLoadState()
→ Race conditions, inconsistent timeouts, duplicated logic

AFTER: Unified coordination + stability
JourneySimulator → FormOperations → PageStateManager → WaitHelper
→ Intelligent stability, coordinated actions, single source of truth
```

This creates the **proper functional architecture** you advocated for - where **all core functions work together systematically** rather than being developed in isolation.

```
You are a senior TypeScript architect specializing in building modular, composable software systems. Implement the Unified Core Module Architecture refactoring for the visual-ui-mcp-server to eliminate code duplication and ensure all core functions work together systematically.

**Task Overview:**
Refactor the existing core modules (WaitHelper, ElementLocator, FormOperations, JourneySimulator) to follow a proper architectural dependency chain where each module builds upon the previous one, eliminating current inconsistencies and duplications. This creates a robust foundation for reliable web automation.

**Current Issues Addressed:**
1. **Inconsistent waiting patterns**: JourneySimulator bypasses WaitHelper and uses direct Playwright calls (page.waitForTimeout(), page.waitForFunction(), page.waitForLoadState())
2. **Form integration gaps**: FormOperations uses basic timeout instead of WaitHelper's sophisticated waitForPageLoad
3. **State management fragmentation**: No centralized page state coordination between modules
4. **Element location bypass**: JourneySimulator has inline element finding instead of fully leveraging ElementLocator

**Requirements:**
1. Create PageStateManager for centralized page readiness coordination
2. Make WaitHelper the universal waiting foundation for all modules
3. Enhance FormOperations with WaitHelper integration
4. Refactor JourneySimulator to be pure orchestrator composing existing modules
5. Establish proper dependency hierarchy: WaitHelper → ElementLocator → FormOperations → JourneySimulator
6. Standardize timeout values and error handling across all modules

**Implementation Steps:**

1. **Create PageStateManager (`src/core/page-state-manager.ts`)**:
   - Implement centralized page state tracking
   - Coordinate page readiness across modules
   - Provide `isPageReady()`, `waitForStableState()`, `onNavigationComplete()` methods
   - Integrate with WaitHelper and ElementLocator for robust state checking

2. **Enhance WaitHelper Integration**:
   - Extend WaitHelper with composite waiting patterns
   - Add coordination methods for cross-module state management
   - Standardize timeout strategies across all consumers

3. **Refactor FormOperations**:
   - Replace `waitForSubmission()` timeout with `WaitHelper.waitForPageLoad()`
   - Use PageStateManager for form stability checks
   - Improve error handling consistency

4. **Refactor JourneySimulator**:
   - Remove inline Playwright waiting calls (page.waitForTimeout, page.waitForFunction, etc.)
   - Replace SPA navigation logic to use PageStateManager
   - Ensure all element finding goes through ElementLocator
   - Use FormOperations consistently without bypassing to FormUtils

5. **Integration Testing**:
   - Update all core modules to use the new architecture
   - Ensure backward compatibility while removing duplications
   - Add architectural integration tests

**API Design:**

```typescript
// New PageStateManager for centralized state coordination
class PageStateManager {
  constructor(private waitHelper: WaitHelper, private elementLocator: ElementLocator);

  async isPageReady(page: Page): Promise<boolean>;
  async waitForStableState(page: Page, options?: StabilityOptions): Promise<void>;
  async waitForNavigation(page: Page, targetUrl?: string): Promise<void>;
  async coordinateAction<T>(
    page: Page,
    action: () => Promise<T>,
    stabilityCheck?: () => Promise<boolean>
  ): Promise<T>;
}

// Enhanced WaitHelper with composite operations
class WaitHelper {
  // Existing methods...
  async waitForComposite(
    page: Page,
    conditions: WaitCondition[]
  ): Promise<void>;
  async waitForPageState(
    page: Page,
    state: PageState,
    options?: WaitOptions
  ): Promise<void>;
}

// FormOperations using WaitHelper
class FormOperations {
  constructor(page: Page, waitHelper: WaitHelper, pageStateManager?: PageStateManager);

  async waitForForm(formSelector: string): Promise<void>; // Now uses WaitHelper
  async waitForSubmission(timeout?: number): Promise<void>; // Now uses waitForPageLoad
}

// JourneySimulator as pure orchestrator
class JourneySimulator {
  constructor(
    page: Page,
    elementLocator: ElementLocator,
    formOperations: FormOperations,
    pageStateManager: PageStateManager
  );

  private async executeStep(step: JourneyStep): Promise<void> {
    // All waiting now goes through PageStateManager
    // All element finding goes through ElementLocator
    // All form operations go through FormOperations
  }
}
```

**Dependency Hierarchy (AFTER refactoring):**
```
WaitHelper ← PageStateManager ← ElementLocator ← FormOperations ← JourneySimulator
           ↑                                        ↑
           └──────────── BrowserMonitor ←────────────┘
```

**Testing Steps:**

1. **Unit Tests**: Test each module in isolation with proper mocking
2. **Integration Tests**: Verify module composition works correctly
3. **Regression Tests**: Ensure existing MCP tool behavior unchanged
4. **Performance Tests**: Verify overhead remains minimal (<5% increase)
5. **Cross-module Coordination Tests**: Test PageStateManager integration

**Verification Criteria:**
- Eliminate all direct Playwright wait calls from JourneySimulator
- All waiting goes through WaitHelper/PageStateManager
- Form submission uses WaitHelper.waitForPageLoad()
- Element finding is consistent across modules
- Timeout values are standardized (10s default, configurable)
- Error handling follows consistent patterns

**Benefits:**
- **DRY Principle**: Eliminate 80% of waiting code duplication
- **Consistency**: Uniform timeout/error handling everywhere
- **Maintainability**: Single source of truth for waiting logic
- **Testability**: Each module independently testable
- **Scalability**: New features can compose existing primitives
- **Reliability**: Centralized state management prevents race conditions

```

**Note:** Journey test recording functionality has been removed from this documentation as it was not included in the final implementation scope.

## Implementation Guidelines

### Development Best Practices
1. Modular: Separate modules for each tool/feature. All tools can be under src/tools
2. Compatibility: Preserve existing APIs.
3. Error Handling: Comprehensive with retries.
4. Performance: Minimal overhead (<5% increase).
5. TypeScript: Fully typesafe components.

### Testing Strategy
1. Integration: Feature interactions.
2. E2E: Full workflows with Playwright.
3. Performance: Benchmark before/after.
4. All tests can be under src/tests

### Deployment Strategy
1. Feature Flags: Configurable enablement.
2. Compatibility: Semver updates.
3. Migration: Backward docs.
4. Rollback: Version pinning.

## Success Metrics

### Functional Metrics
- [ ] Element selection success rate > 95%
- [ ] Form interaction completion rate > 98%
- [ ] Dynamic content waiting accuracy > 90%
- [ ] Visual regression detection accuracy > 95%

### Performance Metrics
- [ ] Screenshot capture time < 2 seconds
- [ ] Element location time < 1 second
- [ ] Memory usage increase < 50MB
- [ ] Network overhead < 10%

### Quality Metrics
- [ ] Test failure rate < 5%
- [ ] False positive rate < 2%
- [ ] User satisfaction score > 4.5/5
- [ ] Documentation completeness > 90%

## Conclusion

This feature roadmap offers LLM-ready prompts for systematic development of the visual-ui-mcp-server. Each prompt provides a clear path to implementation, ensuring reliable, accessible, and performant web testing capabilities.
```
