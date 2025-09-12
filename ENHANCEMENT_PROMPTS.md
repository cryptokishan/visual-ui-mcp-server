# Visual UI MCP Server Enhancement Prompts

## Executive Summary

This document provides comprehensive prompts and implementation guidance for enhancing the `visual-ui-mcp-server` based on identified shortcomings and user requirements analysis. The enhancements focus on improving visual testing capabilities, element interaction reliability, and overall robustness for web application testing.

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

## Enhancement Roadmap

### Phase 1: Core Interaction Improvements (High Priority)

#### Prompt 1.1: Enhanced Element Selection System
```
You are implementing an Enhanced Element Selection System for the visual-ui-mcp-server. Create a robust element finding mechanism with multiple fallback strategies.

Requirements:
1. Multi-strategy element location with automatic fallback
2. Support for CSS selectors, XPath, text content, ARIA labels, and data attributes
3. Smart element waiting with configurable timeouts
4. Element visibility and interactability verification
5. Cross-browser compatibility handling

Implementation Details:
- Create a new `ElementLocator` class in `src/element-locator.ts`
- Implement multiple location strategies with priority ordering
- Add element state verification (visible, enabled, in viewport)
- Include retry mechanisms with exponential backoff
- Support for shadow DOM and iframe content

API Design:
```typescript
interface ElementQuery {
  selectors: Array<{
    type: 'css' | 'xpath' | 'text' | 'aria' | 'data';
    value: string;
    priority?: number;
  }>;
  timeout?: number;
  waitForVisible?: boolean;
  waitForEnabled?: boolean;
  retryCount?: number;
}

class ElementLocator {
  async findElement(query: ElementQuery): Promise<ElementHandle | null>
  async waitForElement(query: ElementQuery): Promise<ElementHandle>
  async findElements(query: ElementQuery): Promise<ElementHandle[]>
}
```

Testing Requirements:
- Test with various selector types and combinations
- Verify fallback behavior when primary selectors fail
- Test timeout and retry functionality
- Validate cross-browser compatibility
```

#### Prompt 1.2: Form Interaction Framework
```
You are implementing a comprehensive Form Interaction Framework for the visual-ui-mcp-server. Create tools for filling forms, submitting data, and validating form behavior.

Requirements:
1. Automated form field detection and population
2. Support for all input types (text, password, email, number, etc.)
3. Form submission with validation handling
4. File upload capabilities
5. Form reset and clearing functionality

Implementation Details:
- Create a new `FormHandler` class in `src/form-handler.ts`
- Implement field type detection and appropriate input methods
- Add form validation feedback capture
- Support for multi-step forms and wizards
- Handle file input and drag-and-drop uploads

API Design:
```typescript
interface FormField {
  selector: string;
  value: string | number | boolean | File;
  type?: 'text' | 'password' | 'email' | 'number' | 'checkbox' | 'radio' | 'select' | 'file';
  clearFirst?: boolean;
}

interface FormSubmission {
  submitSelector?: string;
  waitForNavigation?: boolean;
  expectValidationErrors?: boolean;
  captureScreenshot?: boolean;
}

class FormHandler {
  async fillForm(fields: FormField[]): Promise<void>
  async submitForm(submission: FormSubmission): Promise<Page>
  async resetForm(formSelector?: string): Promise<void>
  async getFormData(formSelector: string): Promise<Record<string, any>>
  async validateForm(formSelector: string): Promise<ValidationResult>
}
```

Testing Requirements:
- Test with various form types and input fields
- Verify form submission and navigation handling
- Test file upload functionality
- Validate error handling and recovery
```

#### Prompt 1.3: Smart Waiting Mechanisms
```
You are implementing Smart Waiting Mechanisms for the visual-ui-mcp-server. Create intelligent waiting strategies for dynamic web content.

Requirements:
1. Content loading detection and waiting
2. Network request completion monitoring
3. JavaScript execution completion detection
4. Animation and transition completion waiting
5. Custom condition evaluation

Implementation Details:
- Create a new `SmartWaiter` class in `src/smart-waiter.ts`
- Implement network idle detection
- Add JavaScript execution monitoring
- Support for custom wait conditions
- Handle SPA routing and content updates

API Design:
```typescript
interface WaitCondition {
  type: 'networkidle' | 'javascript' | 'custom' | 'animation' | 'navigation';
  timeout?: number;
  pollInterval?: number;
  condition?: () => Promise<boolean>;
}

interface WaitOptions {
  conditions: WaitCondition[];
  timeout?: number;
  throwOnTimeout?: boolean;
}

class SmartWaiter {
  async waitForPageLoad(options?: WaitOptions): Promise<void>
  async waitForNetworkIdle(timeout?: number): Promise<void>
  async waitForJavaScriptExecution(): Promise<void>
  async waitForCustomCondition(condition: () => Promise<boolean>, timeout?: number): Promise<void>
  async waitForAnimation(selector?: string, timeout?: number): Promise<void>
}
```

Testing Requirements:
- Test with various loading scenarios (AJAX, SPA routing, lazy loading)
- Verify timeout handling and error recovery
- Test custom condition evaluation
- Validate performance impact of waiting strategies
```

### Phase 2: Visual Analysis & Comparison (Medium Priority)

#### Prompt 2.1: Selective Screenshot Capture
```
You are implementing Selective Screenshot Capture for the visual-ui-mcp-server. Create tools for capturing specific elements and regions with advanced options.

Requirements:
1. Element-specific screenshot capture
2. Custom region selection and cropping
3. Multiple format support (PNG, JPEG, WebP)
4. Screenshot comparison and diffing
5. Responsive breakpoint testing

Implementation Details:
- Extend the existing screenshot functionality in `src/visual-testing.ts`
- Add element boundary detection and cropping
- Implement responsive screenshot capture
- Support for screenshot annotations and highlighting

API Design:
```typescript
interface ScreenshotOptions {
  selector?: string;
  region?: { x: number; y: number; width: number; height: number };
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  fullPage?: boolean;
  clipToElement?: boolean;
  padding?: number;
  highlightElements?: string[];
}

interface ScreenshotComparison {
  baseline: Buffer;
  current: Buffer;
  diff?: Buffer;
  similarity: number;
  differences: PixelDifference[];
}

class EnhancedScreenshot {
  async takeElementScreenshot(page: Page, selector: string, options?: ScreenshotOptions): Promise<Buffer>
  async takeResponsiveScreenshots(page: Page, breakpoints: number[], options?: ScreenshotOptions): Promise<Map<number, Buffer>>
  async compareScreenshots(baseline: Buffer, current: Buffer): Promise<ScreenshotComparison>
  async highlightElement(page: Page, selector: string, options?: HighlightOptions): Promise<void>
}
```

Testing Requirements:
- Test element-specific screenshot capture
- Verify responsive breakpoint screenshots
- Test screenshot comparison accuracy
- Validate file format and quality options
```

#### Prompt 2.2: Visual Regression Detection
```
You are implementing Visual Regression Detection for the visual-ui-mcp-server. Create automated visual comparison and change detection capabilities.

Requirements:
1. Baseline screenshot management
2. Automated comparison algorithms
3. Change detection and highlighting
4. False positive reduction
5. Historical comparison tracking

Implementation Details:
- Create a new `VisualRegression` class in `src/visual-regression.ts`
- Implement pixel-level comparison algorithms
- Add change detection with bounding boxes
- Support for baseline management and updates

API Design:
```typescript
interface RegressionOptions {
  threshold?: number;
  includeAA?: boolean;
  diffColor?: { r: number; g: number; b: number; a: number };
  outputFormat?: 'png' | 'jpeg';
}

interface RegressionResult {
  isDifferent: boolean;
  similarity: number;
  diffImage?: Buffer;
  changedRegions: BoundingBox[];
  totalPixels: number;
  differentPixels: number;
}

class VisualRegression {
  async compareWithBaseline(page: Page, testName: string, options?: RegressionOptions): Promise<RegressionResult>
  async updateBaseline(page: Page, testName: string): Promise<void>
  async getBaseline(testName: string): Promise<Buffer | null>
  async listBaselines(): Promise<string[]>
  async deleteBaseline(testName: string): Promise<void>
}
```

Testing Requirements:
- Test with various UI changes (text, layout, colors)
- Verify false positive reduction
- Test baseline management operations
- Validate change detection accuracy
```

### Phase 3: Browser Context & Debugging (Medium Priority)

#### Prompt 3.1: Console & Network Monitoring
```
You are implementing Console & Network Monitoring for the visual-ui-mcp-server. Create comprehensive browser debugging and monitoring capabilities.

Requirements:
1. Console log capture and filtering
2. Network request/response monitoring
3. JavaScript error detection and reporting
4. Performance metric collection
5. Real-time event streaming

Implementation Details:
- Create a new `BrowserMonitor` class in `src/browser-monitor.ts`
- Implement console message capture with filtering
- Add network request/response interception
- Monitor JavaScript errors and exceptions

API Design:
```typescript
interface ConsoleFilter {
  level?: 'log' | 'info' | 'warn' | 'error';
  source?: string;
  message?: RegExp;
}

interface NetworkFilter {
  url?: RegExp;
  method?: string;
  status?: number;
  resourceType?: string;
}

interface MonitoringOptions {
  consoleFilter?: ConsoleFilter;
  networkFilter?: NetworkFilter;
  captureScreenshots?: boolean;
  maxEntries?: number;
}

class BrowserMonitor {
  async startMonitoring(page: Page, options?: MonitoringOptions): Promise<void>
  async stopMonitoring(): Promise<MonitoringResult>
  async getConsoleLogs(filter?: ConsoleFilter): Promise<ConsoleEntry[]>
  async getNetworkRequests(filter?: NetworkFilter): Promise<NetworkEntry[]>
  async getJavaScriptErrors(): Promise<ErrorEntry[]>
  async capturePerformanceMetrics(): Promise<PerformanceMetrics>
}
```

Testing Requirements:
- Test console log capture and filtering
- Verify network request monitoring
- Test JavaScript error detection
- Validate performance metric collection
```

#### Prompt 3.2: Performance Monitoring Integration
```
You are implementing Performance Monitoring Integration for the visual-ui-mcp-server. Create tools for measuring and analyzing web application performance.

Requirements:
1. Core Web Vitals measurement
2. Page load time analysis
3. Resource loading monitoring
4. Memory usage tracking
5. Performance regression detection

Implementation Details:
- Extend the `BrowserMonitor` class with performance capabilities
- Implement Core Web Vitals calculation
- Add resource timing analysis
- Monitor memory usage and leaks

API Design:
```typescript
interface PerformanceMetrics {
  coreWebVitals: {
    cls: number;
    fid: number;
    lcp: number;
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

class PerformanceMonitor {
  async measureCoreWebVitals(page: Page): Promise<CoreWebVitals>
  async analyzePageLoad(page: Page): Promise<PageLoadAnalysis>
  async monitorResourceLoading(page: Page): Promise<ResourceTiming[]>
  async trackMemoryUsage(page: Page, duration: number): Promise<MemoryUsage[]>
  async detectPerformanceRegression(baseline: PerformanceMetrics, current: PerformanceMetrics): Promise<RegressionReport>
}
```

Testing Requirements:
- Test Core Web Vitals measurement accuracy
- Verify page load time analysis
- Test resource loading monitoring
- Validate memory usage tracking
- Check performance regression detection
```

### Phase 4: Advanced Testing Capabilities (Low Priority)

#### Prompt 4.1: User Journey Simulation
```
You are implementing User Journey Simulation for the visual-ui-mcp-server. Create tools for simulating complete user workflows and interactions.

Requirements:
1. Multi-step user journey definition
2. Conditional action execution
3. Error recovery and retry logic
4. Journey recording and playback
5. Performance measurement during journeys

Implementation Details:
- Create a new `JourneySimulator` class in `src/journey-simulator.ts`
- Implement journey definition DSL
- Add conditional logic and error handling
- Support for journey recording from manual testing

API Design:
```typescript
interface JourneyStep {
  id: string;
  action: 'navigate' | 'click' | 'type' | 'wait' | 'assert' | 'screenshot';
  selector?: string;
  value?: string;
  condition?: () => Promise<boolean>;
  timeout?: number;
  retryCount?: number;
  onError?: 'continue' | 'retry' | 'fail';
}

interface JourneyOptions {
  name: string;
  steps: JourneyStep[];
  onStepComplete?: (step: JourneyStep, result: any) => void;
  onError?: (error: Error, step: JourneyStep) => void;
  maxDuration?: number;
}

class JourneySimulator {
  async runJourney(page: Page, options: JourneyOptions): Promise<JourneyResult>
  async recordJourney(page: Page, name: string): Promise<JourneyDefinition>
  async validateJourney(journey: JourneyDefinition): Promise<ValidationResult>
  async optimizeJourney(journey: JourneyDefinition): Promise<JourneyDefinition>
}
```

Testing Requirements:
- Test complex multi-step journeys
- Verify error recovery mechanisms
- Test conditional logic execution
- Validate journey recording and playback
```

#### Prompt 4.2: Accessibility Testing Integration
```
You are implementing Accessibility Testing Integration for the visual-ui-mcp-server. Create automated accessibility compliance checking and reporting.

Requirements:
1. WCAG 2.1 AA compliance checking
2. Automated accessibility audits
3. Color contrast analysis
4. Keyboard navigation testing
5. Screen reader compatibility verification

Implementation Details:
- Create a new `AccessibilityTester` class in `src/accessibility-tester.ts`
- Implement axe-core integration for automated testing
- Add color contrast calculation
- Support for keyboard navigation testing

API Design:
```typescript
interface AccessibilityOptions {
  standards: ('WCAG2A' | 'WCAG2AA' | 'Section508')[];
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

class AccessibilityTester {
  async runAudit(page: Page, options?: AccessibilityOptions): Promise<AccessibilityResult>
  async checkColorContrast(page: Page, selector?: string): Promise<ContrastResult[]>
  async testKeyboardNavigation(page: Page): Promise<KeyboardNavigationResult>
  async generateReport(results: AccessibilityResult): Promise<string>
}
```

Testing Requirements:
- Test with various accessibility violations
- Verify WCAG compliance checking
- Test color contrast analysis
- Validate keyboard navigation testing
- Check report generation accuracy
```

## Implementation Guidelines

### Development Best Practices
1. **Modular Architecture**: Keep enhancements in separate modules
2. **Backward Compatibility**: Ensure existing functionality remains intact
3. **Error Handling**: Implement comprehensive error handling and recovery
4. **Performance**: Optimize for minimal performance impact
5. **Documentation**: Provide clear API documentation and examples

### Testing Strategy
1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Validate performance impact
5. **Cross-Browser Tests**: Ensure compatibility across browsers

### Deployment Strategy
1. **Feature Flags**: Use feature flags for gradual rollout
2. **Version Compatibility**: Maintain backward compatibility
3. **Migration Path**: Provide clear migration instructions
4. **Rollback Plan**: Ensure easy rollback capabilities

## Success Metrics

### Functional Metrics
- ✅ Element selection success rate > 95%
- ✅ Form interaction completion rate > 98%
- ✅ Dynamic content waiting accuracy > 90%
- ✅ Visual regression detection accuracy > 95%

### Performance Metrics
- ✅ Screenshot capture time < 2 seconds
- ✅ Element location time < 1 second
- ✅ Memory usage increase < 50MB
- ✅ Network overhead < 10%

### Quality Metrics
- ✅ Test failure rate < 5%
- ✅ False positive rate < 2%
- ✅ User satisfaction score > 4.5/5
- ✅ Documentation completeness > 90%

## Conclusion

This enhancement roadmap provides a comprehensive plan for transforming the visual-ui-mcp-server from a basic screenshot tool into a sophisticated visual testing and automation platform. The phased approach ensures systematic improvement while maintaining stability and backward compatibility.

Each prompt includes detailed requirements, implementation guidance, API design specifications, and testing requirements to ensure successful implementation and validation.
