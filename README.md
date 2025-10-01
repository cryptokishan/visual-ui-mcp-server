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

## Testing

This project includes a robust, comprehensive MCP protocol testing framework:

### Test Modes

#### Comprehensive Testing (`npm run test:comprehensive`)
- Complete MCP protocol validation through full client-server simulation
- Systematic testing of all 58+ MCP tools and functions
- Protocol compliance verification
- Error handling and recovery testing
- Session state management validation
- Schema compliance checking

**Key Benefits:**
- ✅ **Full Coverage**: Tests every MCP tool systematically
- ✅ **Protocol Compliance**: Validates MCP protocol implementation
- ✅ **Stability**: Isolated test environments prevent state pollution
- ✅ **Reliability**: Robust error handling and recovery testing
- ✅ **Performance**: Efficient testing with proper resource cleanup

#### Regression Testing (`npm run test:regression`)
- Runs all existing MCP-related tests for backward compatibility
- Faster execution for CI/CD pipelines
- Validates existing functionality

### Running Tests

```bash
# Full comprehensive MCP protocol testing
npm run test:comprehensive

# Regression testing (existing tests)
npm run test:regression

# Run with headless browser (default)
npm run test:ci

# Run with visible browser
npm run test:headed
```

### Test Architecture

The new testing solution addresses previous limitations:

#### Previous Issues (Fixed):
- ❌ Fragmented test coverage across multiple files
- ❌ No systematic protocol validation
- ❌ Global server state pollution between tests
- ❌ Limited error scenario coverage
- ❌ Manual test organization

#### New Solution:
- ✅ **Centralized Protocol Suite**: Single comprehensive test suite for all MCP functionality
- ✅ **Complete Coverage**: 58+ MCP tools tested systematically
- ✅ **Isolated Environments**: Test-scoped server instances prevent state pollution
- ✅ **Error Resilience**: Comprehensive error handling and recovery validation
- ✅ **State Management**: Persistent session state tracking and validation
- ✅ **Schema Validation**: Automatic parameter validation for all tools

### Test Structure

```
test/
├── mcp-protocol-comprehensive.test.ts    # Main comprehensive test suite
├── mcp-protocol-test-suite.ts           # Test suite implementation
├── mcp-test-setup.ts                    # MCP server setup utilities
├── server-fixture.ts                    # Test fixtures for server lifecycle
└── [legacy tests]                       # Existing regression tests
```

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
- `measure_core_web_vitals` - Core Web Vitals measurement
- `capture_performance_metrics` - Performance metrics collection
- `analyze_page_load` - Page load analysis
- `track_memory_usage` - Memory usage tracking
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

## Contributing

1. Run comprehensive tests: `npm run test:comprehensive`
2. Run regression tests: `npm run test:regression`
3. Add new functionality with corresponding MCP protocol tests
4. Ensure all existing tests continue to pass

## License

MIT
