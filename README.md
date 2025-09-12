# Visual UI Testing MCP Server v2.0.0

A comprehensive Model Context Protocol (MCP) server that provides advanced visual UI testing, browser automation, and intelligent element interaction capabilities. This server enables AI agents to autonomously perform sophisticated web testing, form automation, and visual regression detection.

## 🚀 What's New in v2.0.0

### ✨ Major Enhancements
- **Enhanced Element Locator** - Multi-strategy element finding with intelligent fallback
- **Advanced Form Automation** - Complete form handling with all input types
- **Visual Regression Testing** - Pixel-perfect comparison with diff generation
- **Responsive Testing** - Multi-breakpoint screenshot testing
- **Comprehensive Test Suite** - 41 tests covering all functionality

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

## Project Structure

```
visual-ui-mcp-server/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── browser-manager.ts       # Browser lifecycle management
│   ├── element-locator.ts       # Enhanced element location with fallback
│   ├── form-handler.ts          # Advanced form automation
│   ├── ui-interactions.ts       # UI interaction helpers
│   ├── visual-testing.ts        # Advanced visual testing & regression
│   ├── dev-tools-monitor.ts     # Console and network monitoring
│   └── wait-retry.ts           # Wait and retry mechanisms
├── test/                        # Comprehensive test suite
│   ├── test-element-locator.html    # Element locator test page
│   ├── test-element-locator.js      # Element locator tests
│   ├── test-form-handler.html       # Form handler test page
│   ├── test-form-handler.js         # Form handler tests
│   ├── test-mcp-tools.js            # MCP integration tests
│   ├── test-visual-testing.js       # Visual testing tests
│   └── test-mcp-visual-tools.js     # Advanced visual MCP tests
├── screenshots/                 # Screenshot storage directory
│   ├── baselines/              # Baseline screenshots
│   ├── current/                # Current screenshots
│   └── diffs/                  # Difference images
├── dist/                       # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── mcp-config.json
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
