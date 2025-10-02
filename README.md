# Visual UI Testing MCP Server

A comprehensive Model Context Protocol (MCP) server for automated UI testing, browser automation, and web application testing.

## Features

- **Browser Management**: Launch, control, and manage browser instances
- **Element Interactions**: Find, click, type, and interact with web elements
- **Form Handling**: Fill and submit web forms with validation
- **Visual Testing**: Screenshots, visual regression detection, responsive testing
- **Performance Monitoring**: Core Web Vitals, metrics collection, regression tracking
- **Backend Mocking**: API mocking and request simulation for testing
- **User Journey Recording**: Record and replay user interactions
- **Developer Tools Integration**: Console logs, network monitoring, error detection

## MCP Tools (58+ Available)

### Browser Management

- `launch_browser` - Launch browser instance
- `close_browser` - Close browser instance
- `configure_session` - Configure session settings

### Element Interactions

- `find_element` - Locate elements using multiple strategies
- `click_element` - Click elements
- `type_text` - Type text into elements
- `get_element_text` - Get element text content

### Form Interactions

- `fill_form` - Fill form fields
- `submit_form` - Submit forms

### Visual Testing

- `take_screenshot` - Capture screenshots
- `take_element_screenshot` - Element-specific screenshots
- `take_responsive_screenshots` - Multi-device screenshots
- `detect_visual_regression` - Visual regression detection
- `update_baseline` - Update visual baselines

### Performance Monitoring

- `measure_core_web_vitals` - Measure LCP and CLS; for automated input responsiveness prefer INP or Total Blocking Time (TBT) rather than true FID
- `capture_performance_metrics` - Performance metrics collection (best-effort; some metrics are browser-specific)
- `analyze_page_load` - Page load analysis
- `track_memory_usage` - Memory usage tracking (Chromium/CDP only; other browsers may provide no-op/fallback)
- `detect_performance_regression` - Performance regression detection

### Backend Mocking

- `setup_journey_mocks` - Mock API responses for journeys
- `enable_backend_mocking` - Enable mock server
- `disable_backend_mocking` - Disable mock server
- `get_mocked_requests` - View mocked request history

### User Journey Testing

- `run_user_journey` - Execute user journey scripts
- `record_user_journey` - Record user interactions
- `validate_journey_definition` - Validate journey configuration

### Developer Tools

- `start_browser_monitoring` - Begin browser monitoring
- `stop_browser_monitoring` - End browser monitoring
- `get_console_logs` - Retrieve console output
- `get_network_requests` - Capture network traffic

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers
```

## Usage

```bash
# Start the MCP server
npm run dev

# The server communicates via stdio MCP protocol
# Can be used with MCP clients like Claude Desktop
```

## Configuration

The server can be configured through environment variables and MCP client initialization parameters.

## Test Strategy

### Protocol-Driven End-to-End Testing

All tests interact with the MCP server exclusively via the MCP protocol, simulating real client behavior. The test suite is designed to cover all MCP tools and their edge cases.

### Efficient Isolation with a Single Server Instance

To balance test isolation and performance, the test suite uses a **single MCP server instance** for the entire test run. Each test creates a new, isolated browser context or session to ensure no state leakage between tests.

- The MCP server is started **once before all tests** using Vitest's `beforeAll` hook.
- Each test uses MCP tools (e.g., `launch_browser`, `configure_session`) to create a fresh session or browser context.
- Cleanup is performed after each test to close sessions and remove any test artifacts.
- This approach provides fast execution while maintaining strong isolation at the session level.

#### Example Test Setup (Vitest)

```typescript
// test/utils/server-setup.ts
import { startServer, stopServer, sendMcpRequest } from "./mcp-utils";

let serverProcess: any;

beforeAll(async () => {
  serverProcess = await startServer();
});

afterAll(async () => {
  await stopServer(serverProcess);
});

// individual test files

beforeEach(async () => {
  // Create a new browser session/context for this test
});

afterEach(async () => {
  // Clean up session/context and artifacts
});
```

## Repository Structure

The project follows a modular structure to separate concerns for MCP tools, tests, and core logic:

```
visual-ui-mcp-server/
├── src/
│   ├── tools/              # MCP tools and feature modules (e.g., element-locator.ts, form-handler.ts, browser-monitor.ts, journey-simulator.ts)
│   ├── tests/              # All unit, integration, and E2E tests (Vitest + Playwright)
│   ├── index.ts            # Main server entry point
│   ├── mcp-server.ts       # MCP server setup and tool registration (if separate)
│   └── utils/              # Shared utilities (e.g., mcp-utils.ts)
├── CHANGELOG.md            # Version history and implemented features
├── feature_prompts.md      # LLM-optimized prompts and feature roadmap
├── mcp-config.json         # MCP server configuration
├── package.json            # Dependencies and scripts
├── README.md
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
└── .gitignore
```

This structure ensures easy extension: new features go in `src/tools/`, tests in `src/tests/`. See `feature_prompts.md` for detailed implementation guidance per phase.

## License

MIT
