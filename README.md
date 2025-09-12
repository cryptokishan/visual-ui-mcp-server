# Visual UI Testing MCP Server

A Model Context Protocol (MCP) server that provides comprehensive visual UI testing capabilities for web applications. This server enables agents to autonomously perform browser automation, visual testing, and debugging tasks.

## Features

### 🖥️ Browser Management
- Launch and control browser instances
- Navigate to web applications
- Configure viewport and browser settings

### 🖱️ UI Interactions
- Click elements using various selectors (CSS, text, role, label, placeholder)
- Type text into input fields
- Get element text and attributes
- Check element visibility
- Scroll to elements

### 📸 Visual Testing
- Take screenshots of pages or specific elements
- Compare screenshots for visual regression testing
- Automatic baseline creation and management
- Pixel-perfect difference detection

### 🛠️ Developer Tools Integration
- Monitor console logs (errors, warnings, info, logs)
- Track network requests and responses
- Detect JavaScript errors and failed network requests
- Real-time error monitoring

### ⏳ Wait & Retry Mechanisms
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

### Visual Testing

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

### Basic Browser Automation

```javascript
// Launch browser and navigate
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "launch_browser",
  arguments: { url: "https://example.com" }
});

// Click a button
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "click_element",
  arguments: {
    selector: "Get Started",
    selectorType: "text"
  }
});

// Take a screenshot
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "take_screenshot",
  arguments: { name: "homepage" }
});
```

### Visual Regression Testing

```javascript
// Take baseline screenshot
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "take_screenshot",
  arguments: { name: "login-form" }
});

// Make changes to the application...

// Take current screenshot
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "take_screenshot",
  arguments: { name: "login-form-current" }
});

// Compare screenshots
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "compare_screenshots",
  arguments: {
    baselineName: "login-form",
    currentName: "login-form-current",
    threshold: 0.05
  }
});
```

### Error Detection

```javascript
// Start monitoring
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "start_monitoring"
});

// Perform actions that might cause errors...

// Check for errors
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "check_for_errors"
});

// Get console logs
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "get_console_logs",
  arguments: { level: "error" }
});
```

### Wait with Retry

```javascript
// Wait for element with retry
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "wait_for_element",
  arguments: {
    selector: ".loading-spinner",
    timeout: 15000,
    retries: 5,
    interval: 2000
  }
});

// Wait for custom condition
await use_mcp_tool({
  server_name: "visual-ui-mcp-server",
  tool_name: "wait_for_condition",
  arguments: {
    condition: "document.readyState === 'complete'",
    timeout: 10000,
    retries: 3
  }
});
```

## Project Structure

```
visual-ui-mcp-server/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── browser-manager.ts       # Browser lifecycle management
│   ├── ui-interactions.ts       # UI interaction helpers
│   ├── visual-testing.ts        # Screenshot and comparison tools
│   ├── dev-tools-monitor.ts     # Console and network monitoring
│   └── wait-retry.ts           # Wait and retry mechanisms
├── screenshots/                 # Screenshot storage directory
│   ├── baselines/              # Baseline screenshots
│   ├── current/                # Current screenshots
│   └── diffs/                  # Difference images
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
