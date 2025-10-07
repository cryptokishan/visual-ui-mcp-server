# MCP Server Tools Testing Guide via VSCode MCP Client

## Role: Cline Agent / Manual MCP Client Tester

**Objective:** Systematically test all MCP (Model Context Protocol) server tools using a real MCP client configured in VSCode. The Cline agent will select and execute tools from the MCP client interface to interact with the visual-ui-mcp-server, performing real-world scenarios on the live React application. Verify outcomes through direct observation and result validation.

## Prerequisites

- Assume that MCP server running at `http://localhost:5173` (React test app)
- Assume that JSON Server mock API running (`npm run dev`) on port 3001 (already running)
- Assume that MCP client configured in VSCode, pointing to `visual-ui-mcp-server/dist/index.js`
- React test app with login, dashboard, and other pages fully functional
- Access to MCP server tools through VSCode MCP client interface
- No need to restart the servers between tools

## Testing Setup Architecture

The testing flow follows this chain:

1. **Cline Agent**: Selects and initiates tool calls via this interface
2. **MCP Client (VSCode)**: Relays tool calls to the server
3. **visual-ui-mcp-server**: Executes the tool operations on the target application
4. **React Application**: Receives interactions and provides responses for validation

## Available MCP Tools for Testing

- `accessibility_tester`: Runs accessibility audits, color contrast checks, keyboard navigation tests
- `locate_element`: Locates web elements using CSS, XPath, text, or ARIA selectors
- `form_handler`: Handles form filling, submission, validation, and file uploads
- `wait_helper`: Manages DOM waiting, network idle, and custom condition synchronization
- `browser_monitor`: Captures console logs, network requests, JS errors, and performance metrics
- `visual_testing`: Takes screenshots, performs visual diffing, and tests responsive layouts
- `journey_simulator`: Executes multi-step user journey simulations with recording and validation

## Real-World Test Scenarios

### Accessibility Testing Suite

**Objective:** Test accessibility features on the React app using accessibility_tester tool.

**Key Requirements:** Importantly, run accessibility audits on all possible pages across the application, in both light and dark modes to ensure comprehensive coverage.

- **Login Page WCAG Audit**: Run full WCAG 2.1 AA audit on login form, check for accessibility violations
- **Color Contrast Verification**: Analyze color contrast ratios on buttons and form elements
- **Keyboard Navigation Flow**: Test tab sequence through login form fields
- **ARIA Compliance Review**: Validate ARIA attributes and screen reader compatibility

### Element Location Suite

**Objective:** Verify element finding capabilities using locate_element tool.

- **Login Form Element Location**: Locate username/email and password input fields
- **Navigation Menu Items**: Find and interact with dashboard navigation links
- **Data Table Elements**: Locate table rows and headers in Users/Products lists
- **Button and CTA Discovery**: Identify submit buttons and call-to-actions

### Form Handling Suite

**Objective:** Test form interactions using form_handler tool.

- **Login Form Fill**: Populate username and password fields, submit for authentication
- **User Registration**: Fill registration form fields (if available), submit and verify
- **Search Functionality**: Enter search terms, submit and observe results
- **Form Error Handling**: Submit with invalid data, check error message display

### Wait and Synchronization Suite

**Objective:** Validate timing and sync operations using wait_helper tool.

- **Page Load Waiting**: Wait for dashboard to load after login
- **AJAX Response Wait**: Wait for data loading on lists/pages after navigation
- **Animation Completion**: Wait for loading spinners or transitions to finish
- **Custom State Waiting**: Wait for specific DOM changes or element states

### Browser Monitoring Suite

**Objective:** Observe application behavior using browser_monitor tool.

- **Console Log Review**: Monitor browser console during login and navigation
- **Network Request Tracking**: Track API calls during data interactions
- **Error Detection**: Identify JS errors during form submissions or page loads
- **Performance Monitoring**: Collect metrics during user flows

### Visual Testing Suite

**Objective:** Validate visual aspects using visual_testing tool.

- **Login Page Screenshots**: Capture baseline screenshot of login page
- **Post-Login State Comparison**: Take screenshot after login, compare views
- **Responsive Breakpoint Testing**: Test layouts on mobile, tablet, desktop
- **Interactive State Verification**: Capture hover/focus states on elements

### Journey Simulation Suite

**Objective:** Execute complete multi-step flows using journey_simulator tool.

- **Login to Dashboard Journey**: Simulate full login process and navigation
- **Product Interaction Flow**: Browse product lists, select items, view details
- **User Management Workflow**: Navigate to users page, filter/search users
- **Settings Update Process**: Access settings page, modify preferences

## Test Execution Process

### Execution Steps

1. **Select Tool**: Use Cline to choose the appropriate MCP tool from the interface
2. **Provide Parameters**: Input required parameters (URLs, selectors, data, etc.)
3. **Execute Tool**: Initiate the tool call through VSCode MCP client
4. **Observe Results**: Monitor the output and application response
5. **Verify Outcomes**: Confirm expected behavior on the React app
6. **Document Findings**: Note issues, failures, successes, and identified gaps in the MCP server
7. **Generate Report**: Produce a new test report for each testing session, overriding previous reports
8. **Continue Testing**: Proceed with subsequent tests even if some tool calls fail, and compile comprehensive test results into `mcp-protocol-test-results.md`

### Input Requirements for Each Test

- **URL**: Point to `http://localhost:5173` or specific page paths
- **Selector/Data**: Specific CSS selectors, form data, element descriptors
- **Expected Results**: Predictable outcomes for validation
- **Timeout/Retry Settings**: Appropriate wait times for operations

### Expected Outputs

- **Tool Response**: Structured output from the MCP server
- **Application State Changes**: Observable UI updates or behaviors
- **Success/Failure Indicators**: Clear pass/fail signals from execution
- **Error Messages**: Detailed error information if operations fail
- **Test Report**: Comprehensive report generated per testing session documenting all findings

## Quality Assurance Standards

### Coverage Expectations

- Test at least 3 distinct scenarios per MCP tool
- Include positive and negative test cases
- Cover edge cases and error conditions
- Validate tool functionality in real application context

### Success Metrics

- All major tool functions execute successfully
- React app responds predictably to tool interactions
- Clear visibility of tool capabilities and limitations
- Comprehensive documentation of test results

### Documentation Deliverables

1. Tool selection guide with parameter examples
2. Execution logs and observed outcomes
3. App state changes and interaction verification
4. Issues discovered and recommendations for improvement
5. Summary of tool effectiveness in real-world scenarios

## Notes for Cline Agent Execution

- When prompted, select the matching MCP tool for each scenario
- Provide accurate parameters based on the React app structure
- Verify results by observing the target application directly
- Document any unexpected behaviors or tool constraints
- Focus on practical usability within the VSCode MCP client environment

This guide enables hands-on testing of all visual-ui-mcp-server tools through real MCP client interactions, validating their effectiveness on live web applications.
