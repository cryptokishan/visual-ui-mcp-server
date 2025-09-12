# Visual UI Testing MCP Server v2.2.0

A comprehensive Model Context Protocol (MCP) server that provides advanced visual UI testing, browser automation, intelligent element interaction, comprehensive monitoring capabilities, and performance analysis. This server enables AI agents to autonomously perform sophisticated web testing, form automation, visual regression detection, real-time browser monitoring, and detailed performance analysis.

## 🚀 What's New in v2.2.0

### ✨ Major Enhancements
- **Enhanced Element Locator** - Multi-strategy element finding with intelligent fallback
- **Advanced Form Automation** - Complete form handling with all input types
- **Visual Regression Testing** - Pixel-perfect comparison with diff generation
- **Responsive Testing** - Multi-breakpoint screenshot testing
- **Browser Monitoring System** - Real-time console, network, and error monitoring
- **Performance Monitoring Integration** - Core Web Vitals, load times, memory tracking
- **Advanced Filtering** - Regex-based filtering for logs and network requests
- **Comprehensive Test Suite** - 54+ tests covering all functionality

### 🎯 **Phase 3.2: Performance Monitoring Integration - COMPLETE ✅**

#### **New Performance Monitoring Capabilities:**
- **Core Web Vitals Measurement** (CLS, FID, LCP) with performance scoring and recommendations
- **Page Load Time Analysis** with detailed navigation timing and resource breakdown
- **Resource Loading Monitoring** with performance metrics per resource type
- **Memory Usage Tracking** with real-time monitoring and health assessment
- **Performance Regression Detection** with baseline comparison and change analysis
- **Comprehensive Performance Metrics** reporting with all key indicators

#### **New MCP Tools Added:**
- `measure_core_web_vitals` - Measure Core Web Vitals with scoring
- `analyze_page_load` - Analyze detailed page load timing and navigation metrics
- `monitor_resource_loading` - Monitor and analyze resource loading performance
- `track_memory_usage` - Track JavaScript heap memory usage over time
- `detect_performance_regression` - Compare current vs baseline performance metrics
- `get_comprehensive_performance_metrics` - Get comprehensive performance report

#### **Technical Implementation:**
- **PerformanceMonitor Class** (400+ lines) with full TypeScript support
- **Core Web Vitals Calculation** with industry-standard scoring thresholds
- **Resource Timing Analysis** with detailed performance breakdown
- **Memory Monitoring** with health assessment and leak detection
- **Regression Detection** with statistical analysis and change tracking
- **MCP Protocol Compliance** with JSON-RPC 2.0 standard
- **Comprehensive Test Coverage** with dedicated performance monitoring test suite

### 🎯 **Phase 3.1: Console & Network Monitoring - COMPLETE ✅**

#### **New Monitoring Capabilities:**
- **Real-time Console Monitoring** with advanced filtering by level, source, and regex patterns
- **Network Request Tracking** with HTTP method, status code, timing, and resource type filtering
- **JavaScript Error Detection** with stack trace capture and categorization
- **Performance Metrics Collection** including DOM timing, navigation timing, and paint metrics
- **Configurable Entry Limits** with automatic cleanup to prevent memory issues
- **Session-based Monitoring** with proper lifecycle management

#### **New MCP Tools Added:**
- `start_browser_monitoring` - Start comprehensive monitoring with filters
- `stop_browser_monitoring` - Stop monitoring and get detailed results
- `get_filtered_console_logs` - Retrieve filtered console messages
- `get_filtered_network_requests` - Retrieve filtered network requests
- `get_javascript_errors` - Get captured JavaScript errors
- `capture_performance_metrics` - Capture comprehensive performance data

#### **Technical Implementation:**
- **BrowserMonitor Class** (650+ lines) with full TypeScript support
- **MCP Protocol Compliance** with JSON-RPC 2.0 standard
- **Advanced Filtering System** using regex patterns and multiple criteria
- **Memory Management** with configurable entry limits and cleanup
- **Error Handling** with proper cleanup and resource management
- **Comprehensive Test Coverage** with 50+ tests including MCP protocol verification

### 🏆 Key Features

#### 🎯 **Intelligent Element Location**
- Multi-strategy element finding (CSS, XPath, text, ARIA, data attributes)
- Smart fallback mechanisms with priority-based selection
- Element state verification (visible, enabled, in viewport)
- Dynamic element waiting with exponential backoff

#### 📝 **Complete Form Automation**
- Support for all input types (text, password, email, number, checkbox, radio, select, textarea)
- Automatic field type detection and validation
- Form submission with navigation handling and screenshot capture
- Form data extraction and reset capabilities

#### 📸 **Advanced Visual Testing**
- Element-specific screenshots with padding and format options
- Responsive breakpoint testing (320px, 768px, 1024px, 1440px)
- Visual regression detection with baseline management
- Pixel-level comparison with diff image generation
- Changed region detection using intelligent clustering
- Multiple image formats (PNG, JPEG, WebP) with quality control

#### 🖥️ **Browser Management**
- Launch and control browser instances
- Navigate to web applications
- Configure viewport and browser settings
- Session management and cleanup

#### 🛠️ **Developer Tools Integration**
- Monitor console logs (errors, warnings, info, logs)
- Track network requests and responses
- Detect JavaScript errors and failed network requests
- Real-time error monitoring

#### ⏳ **Wait & Retry Mechanisms**
- Wait for elements to appear with retry logic
- Wait for custom conditions to be met
- Wait for text content in elements
- Wait for URL changes
- Wait for network idle state
- Retry failed actions

## Installation

1. **Install dependencies:**
   ```bash
   cd visual-ui-mcp-server
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npm run install-browsers
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Usage

### Starting the Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

### MCP Configuration

Add the following to your MCP client configuration:

```json
{
  "mcpServers": {
    "visual-ui-mcp-server": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/visual-ui-mcp-server"
    }
  }
}
```

## Available Tools

### Browser Management

#### `launch_browser`
Launch a browser instance and navigate to a URL.

**Parameters:**
- `url` (string, required): URL to navigate to
- `headless` (boolean, optional): Run in headless mode (default: false)
- `viewport` (object, optional): Viewport dimensions
  - `width` (number): Viewport width (default: 1280)
  - `height` (number): Viewport height (default: 720)

#### `close_browser`
Close the current browser instance.

### Enhanced Element Location

#### `find_element`
Find an element using multiple selector strategies with intelligent fallback.

**Parameters:**
- `selectors` (array, required): Array of selector strategies to try
  - `type` (string): Selector type - "css", "xpath", "text", "aria", "data"
  - `value` (string): Selector value
  - `priority` (number, optional): Priority order (lower = higher priority)
- `timeout` (number, optional): Timeout in milliseconds (default: 10000)
- `waitForVisible` (boolean, optional): Wait for element to be visible (default: true)
- `waitForEnabled` (boolean, optional): Wait for element to be enabled (default: false)
- `retryCount` (number, optional): Number of retry attempts (default: 3)

### Advanced Form Automation

#### `fill_form`
Fill multiple form fields with data.

**Parameters:**
- `fields` (array, required): Array of form fields to fill
  - `selector` (string): Field selector
  - `value` (string): Value to fill
  - `type` (string, optional): Field type - "text", "password", "email", "number", "checkbox", "radio", "select"
  - `clearFirst` (boolean, optional): Clear field before filling (default: true)

#### `submit_form`
Submit a form with navigation handling and screenshot capture.

**Parameters:**
- `submitSelector` (string, optional): Submit button selector
- `waitForNavigation` (boolean, optional): Wait for navigation after submit (default: false)
- `captureScreenshot` (boolean, optional): Capture screenshot before submit (default: false)

### UI Interactions

#### `click_element`
Click on a UI element using various selectors.

**Parameters:**
- `selector` (string, required): Element selector
- `selectorType` (string, optional): Selector type - "css", "text", "role", "label", "placeholder" (default: "css")
- `timeout` (number, optional): Timeout in milliseconds (default: 5000)

#### `type_text`
Type text into an input field.

**Parameters:**
- `selector` (string, required): Input field selector
- `text` (string, required): Text to type
- `clear` (boolean, optional): Clear field before typing (default: true)

#### `get_element_text`
Get text content from an element.

**Parameters:**
- `selector` (string, required): Element selector
- `selectorType` (string, optional): Selector type (default: "css")

#### `is_element_visible`
Check if an element is visible.

**Parameters:**
- `selector` (string, required): Element selector
- `selectorType` (string, optional): Selector type (default: "css")

### Advanced Visual Testing

#### `take_element_screenshot`
Take element-specific screenshot with advanced options.

**Parameters:**
- `name` (string, required): Screenshot name for reference
- `selector` (string, required): Element selector to screenshot
- `format` (string, optional): Image format - "png", "jpeg", "webp"
- `quality` (number, optional): Image quality (1-100)
- `padding` (number, optional): Padding around element in pixels

#### `take_responsive_screenshots`
Take responsive screenshots at multiple breakpoints.

**Parameters:**
- `breakpoints` (array, required): Array of breakpoint widths
- `selector` (string, optional): Element selector to screenshot
- `format` (string, optional): Image format - "png", "jpeg", "webp"
- `fullPage` (boolean, optional): Take full page screenshots (default: false)

#### `detect_visual_regression`
Compare screenshot with baseline and detect regressions.

**Parameters:**
- `testName` (string, required): Test name for baseline comparison
- `threshold` (number, optional): Difference threshold (0-1, default: 0.1)
- `includeAA` (boolean, optional): Include anti-aliasing in comparison (default: false)

#### `update_baseline`
Update baseline screenshot for regression testing.

**Parameters:**
- `testName` (string, required): Test name for baseline update

#### `take_screenshot`
Take a screenshot of the current page or element.

**Parameters:**
- `name` (string, required): Screenshot name for reference
- `selector` (string, optional): Element selector to screenshot
- `fullPage` (boolean, optional): Take full page screenshot (default: false)

#### `compare_screenshots`
Compare two screenshots for visual differences.

**Parameters:**
- `baselineName` (string, required): Baseline screenshot name
- `currentName` (string, required): Current screenshot name
- `threshold` (number, optional): Difference threshold (0-1, default: 0.1)

### Developer Tools

#### `start_monitoring`
Start monitoring console and network activity.

#### `stop_monitoring`
Stop monitoring console and network activity.

#### `get_console_logs`
Get browser console logs.

**Parameters:**
- `level` (string, optional): Log level filter - "all", "error", "warning", "info", "log" (default: "all")
- `clear` (boolean, optional): Clear logs after retrieval (default: false)

#### `get_network_requests`
Get network request information.

**Parameters:**
- `filter` (string, optional): Filter requests by URL pattern
- `includeResponse` (boolean, optional): Include response data (default: false)

#### `check_for_errors`
Check for JavaScript errors and failed network requests.

**Parameters:**
- `includeNetworkErrors` (boolean, optional): Include network errors (default: true)
- `includeConsoleErrors` (boolean, optional): Include console errors (default: true)

### Enhanced Browser Monitoring

#### `start_browser_monitoring`
Start comprehensive browser monitoring with console, network, and error tracking.

**Parameters:**
- `consoleFilter` (object, optional): Filter for console messages
  - `level` (string): Console level - "log", "info", "warn", "error"
  - `source` (string): Source to filter by
  - `message` (string): Regex pattern to match message content
- `networkFilter` (object, optional): Filter for network requests
  - `url` (string): Regex pattern to match URLs
  - `method` (string): HTTP method to filter by
  - `status` (number): HTTP status code to filter by
  - `resourceType` (string): Resource type to filter by
- `captureScreenshots` (boolean, optional): Capture screenshots during monitoring (default: false)
- `maxEntries` (number, optional): Maximum number of entries to keep (default: 1000)

#### `stop_browser_monitoring`
Stop browser monitoring and get comprehensive results.

#### `get_filtered_console_logs`
Get filtered console logs from active monitoring session.

**Parameters:**
- `level` (string, optional): Console level to filter by
- `source` (string, optional): Source to filter by
- `message` (string, optional): Regex pattern to match message content

#### `get_filtered_network_requests`
Get filtered network requests from active monitoring session.

**Parameters:**
- `url` (string, optional): Regex pattern to match URLs
- `method` (string, optional): HTTP method to filter by
- `status` (number, optional): HTTP status code to filter by
- `resourceType` (string, optional): Resource type to filter by

#### `get_javascript_errors`
Get JavaScript errors from active monitoring session.

#### `capture_performance_metrics`
Capture comprehensive performance metrics.

### Advanced Performance Monitoring

#### `measure_core_web_vitals`
Measure Core Web Vitals (CLS, FID, LCP) for the current page.

**Parameters:**
- No parameters required

**Returns:**
- CLS (Cumulative Layout Shift) with performance score
- FID (First Input Delay) with performance score
- LCP (Largest Contentful Paint) with performance score

#### `analyze_page_load`
Analyze detailed page load timing and navigation metrics.

**Parameters:**
- No parameters required

**Returns:**
- DOM Content Loaded time
- Load Complete time
- First Paint time
- First Contentful Paint time
- Largest Contentful Paint time
- Navigation timing breakdown
- Resource summary

#### `monitor_resource_loading`
Monitor and analyze resource loading performance.

**Parameters:**
- No parameters required

**Returns:**
- Total resources loaded
- Resource breakdown by type (scripts, images, CSS, etc.)
- Performance metrics per resource type
- Largest resources identification

#### `track_memory_usage`
Track JavaScript heap memory usage over time.

**Parameters:**
- `duration` (number, optional): Duration to track in milliseconds (default: 30000)

**Returns:**
- Average memory usage percentage
- Peak memory usage
- Minimum memory usage
- Memory range
- Memory health assessment
- Historical memory samples

#### `detect_performance_regression`
Compare current performance metrics with baseline to detect regressions.

**Parameters:**
- `baselineMetrics` (object, required): Baseline performance metrics to compare against
  - `coreWebVitals`: CLS, FID, LCP baseline values
  - `timing`: DOM timing baseline values
  - `memory`: Memory usage baseline values
  - `timestamp`: Baseline timestamp

**Returns:**
- Performance regression analysis
- Detailed change metrics with percentages
- Regression alerts and recommendations

#### `get_comprehensive_performance_metrics`
Get comprehensive performance metrics including Core Web Vitals, timing, resources, and memory.

**Parameters:**
- No parameters required

**Returns:**
- Core Web Vitals (CLS, FID, LCP)
- Timing metrics (DOM, paint, navigation)
- Memory usage statistics
- Resource loading analysis
- Timestamp and performance health assessment

### Wait & Retry

#### `wait_for_element`
Wait for an element to appear with retry logic.

**Parameters:**
- `selector` (string, required): Element selector
- `timeout` (number, optional): Maximum wait time in ms (default: 10000)
- `retries` (number, optional): Number of retries (default: 3)
- `interval` (number, optional): Interval between retries in ms (default: 1000)

#### `wait_for_condition`
Wait for a custom condition to be met.

**Parameters:**
- `condition` (string, required): JavaScript condition to evaluate
- `timeout` (number, optional): Maximum wait time in ms (default: 10000)
- `retries` (number, optional): Number of retries (default: 3)

## Example Usage

### Enhanced Element Location with Fallback

```javascript
// Find element with multiple fallback strategies
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "find_element",
  arguments: {
    selectors: [
      { type: "css", value: "#submit-btn", priority: 0 },
      { type: "data", value: "submit-button", priority: 1 },
      { type: "text", value: "Submit Form", priority: 2 },
      { type: "aria", value: "submit", priority: 3 }
    ],
    timeout: 10000,
    waitForVisible: true,
    waitForEnabled: true
  }
});
```

### Advanced Form Automation

```javascript
// Fill complex form with multiple field types
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "fill_form",
  arguments: {
    fields: [
      { selector: "#username", value: "testuser", type: "text" },
      { selector: "#email", value: "user@example.com", type: "email" },
      { selector: "#age", value: "25", type: "number" },
      { selector: "#country", value: "us", type: "select" },
      { selector: "#newsletter", value: true, type: "checkbox" },
      { selector: "#terms", value: true, type: "checkbox" },
      { selector: "#gender-male", value: true, type: "radio" },
      { selector: "#comments", value: "Test feedback", type: "textarea" }
    ]
  }
});

// Submit form with navigation handling
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "submit_form",
  arguments: {
    submitSelector: "#submit-btn",
    waitForNavigation: true,
    captureScreenshot: true
  }
});
```

### Visual Regression Testing

```javascript
// Take baseline screenshot
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "take_element_screenshot",
  arguments: {
    name: "login-form-baseline",
    selector: "#login-form",
    format: "png",
    quality: 90,
    padding: 10
  }
});

// Detect visual regression
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "detect_visual_regression",
  arguments: {
    testName: "login-form",
    threshold: 0.05,
    includeAA: false
  }
});

// Update baseline when changes are expected
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "update_baseline",
  arguments: { testName: "login-form" }
});
```

### Responsive Testing

```javascript
// Take responsive screenshots at multiple breakpoints
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "take_responsive_screenshots",
  arguments: {
    breakpoints: [320, 768, 1024, 1440],
    selector: "#main-navigation",
    format: "png",
    fullPage: false
  }
});
```

### Error Detection & Monitoring

```javascript
// Start comprehensive monitoring
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "start_monitoring"
});

// Perform actions that might cause errors...

// Check for JavaScript and network errors
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "check_for_errors"
});

// Get detailed console logs
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_console_logs",
  arguments: {
    level: "error",
    clear: false
  }
});

// Monitor network requests
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_network_requests",
  arguments: {
    filter: "api/",
    includeResponse: true
  }
});
```

### Enhanced Browser Monitoring

```javascript
// Start comprehensive browser monitoring with filters
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "start_browser_monitoring",
  arguments: {
    consoleFilter: {
      level: "error",
      message: "TypeError|ReferenceError"
    },
    networkFilter: {
      url: "api/",
      status: 400
    },
    maxEntries: 500
  }
});

// Perform user interactions and page navigation...

// Get filtered console logs
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_filtered_console_logs",
  arguments: {
    level: "error",
    message: "failed|error"
  }
});

// Get filtered network requests
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_filtered_network_requests",
  arguments: {
    url: "api/user",
    status: 500
  }
});

// Get JavaScript errors
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_javascript_errors"
});

// Capture performance metrics
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "capture_performance_metrics"
});

// Stop monitoring and get comprehensive results
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "stop_browser_monitoring"
});
```

### Advanced Wait Conditions

```javascript
// Wait for complex element with retry
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "wait_for_element",
  arguments: {
    selector: ".dynamic-content[data-loaded='true']",
    timeout: 15000,
    retries: 5,
    interval: 2000
  }
});

// Wait for custom JavaScript condition
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "wait_for_condition",
  arguments: {
    condition: "window.app && window.app.isReady && document.querySelectorAll('.loaded').length > 5",
    timeout: 20000,
    retries: 4
  }
});
```

### Performance Monitoring

```javascript
// Measure Core Web Vitals
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "measure_core_web_vitals",
  arguments: {}
});
// Returns: CLS, FID, LCP with performance scores

// Analyze page load performance
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "analyze_page_load",
  arguments: {}
});
// Returns: Detailed timing metrics, navigation timing, resource summary

// Monitor resource loading
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "monitor_resource_loading",
  arguments: {}
});
// Returns: Resource breakdown by type, performance metrics, largest resources

// Track memory usage over time
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "track_memory_usage",
  arguments: {
    duration: 10000
  }
});
// Returns: Memory usage statistics, health assessment, historical samples

// Detect performance regression
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "detect_performance_regression",
  arguments: {
    baselineMetrics: {
      coreWebVitals: {
        cls: 0.05,
        fid: 80,
        lcp: 2000
      },
      timing: {
        domContentLoaded: 800,
        loadComplete: 1200,
        firstPaint: 600,
        firstContentfulPaint: 800,
        largestContentfulPaint: 2000
      },
      memory: {
        usedPercent: 45
      },
      timestamp: Date.now() - 86400000 // 1 day ago
    }
  }
});
// Returns: Regression analysis, change metrics, alerts

// Get comprehensive performance report
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_comprehensive_performance_metrics",
  arguments: {}
});
// Returns: All performance metrics in one comprehensive report
```

## Project Structure

```
visual-ui-mcp-server/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── browser-manager.ts       # Browser lifecycle management
│   ├── browser-monitor.ts       # Enhanced browser monitoring system
│   ├── performance-monitor.ts   # Performance monitoring and analysis
│   ├── element-locator.ts       # Enhanced element location with fallback
│   ├── form-handler.ts          # Advanced form automation
│   ├── ui-interactions.ts       # UI interaction helpers
│   ├── visual-testing.ts        # Advanced visual testing & regression
│   ├── dev-tools-monitor.ts     # Console and network monitoring
│   ├── journey-simulator.ts     # User journey simulation
│   └── wait-retry.ts           # Wait and retry mechanisms
├── test/                        # Comprehensive test suite
│   ├── test-browser-monitor.js          # BrowserMonitor integration tests
│   ├── test-mcp-monitoring.js           # MCP monitoring protocol tests
│   ├── test-mcp-performance-monitoring.js # Performance monitoring MCP tests
│   ├── test-element-locator.html        # Element locator test page
│   ├── test-element-locator.js          # Element locator tests
│   ├── test-form-handler.html           # Form handler test page
│   ├── test-form-handler.js             # Form handler tests
│   ├── test-mcp-tools.js                # MCP integration tests
│   ├── test-visual-testing.js           # Visual testing tests
│   ├── test-mcp-visual-tools.js         # Advanced visual MCP tests
│   ├── test-journey-simulator.js        # Journey simulator tests
│   └── test-mcp-journey.js              # Journey MCP integration tests
├── screenshots/                 # Screenshot storage directory
│   ├── baselines/              # Baseline screenshots
│   ├── current/                # Current screenshots
│   └── diffs/                  # Difference images
├── dist/                       # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── mcp-config.json
├── ENHANCEMENT_PROMPTS.md      # Enhancement roadmap and status
└── README.md
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

The server includes comprehensive error handling and logging. All tools return structured responses that can be easily parsed by agents.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
