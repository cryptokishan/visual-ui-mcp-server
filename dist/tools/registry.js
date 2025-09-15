// Tool definitions and schemas for the MCP server
export const getAllToolDefinitions = () => [
    // Browser Management
    {
        name: "launch_browser",
        description: "Launch a browser instance and navigate to a URL",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to navigate to" },
                headless: {
                    type: "boolean",
                    description: "Run in headless mode",
                    default: false,
                },
                viewport: {
                    type: "object",
                    properties: {
                        width: { type: "number", default: 1280 },
                        height: { type: "number", default: 720 },
                    },
                },
            },
            required: ["url"],
        },
    },
    {
        name: "close_browser",
        description: "Close the current browser instance",
        inputSchema: { type: "object", properties: {} },
    },
    // Enhanced Element Location
    {
        name: "find_element",
        description: "Find an element using multiple selector strategies with fallback",
        inputSchema: {
            type: "object",
            properties: {
                selectors: {
                    type: "array",
                    description: "Array of selector strategies to try",
                    items: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["css", "xpath", "text", "aria", "data"],
                                description: "Type of selector",
                            },
                            value: {
                                type: "string",
                                description: "Selector value",
                            },
                            priority: {
                                type: "number",
                                description: "Priority order (lower = higher priority)",
                                default: 0,
                            },
                        },
                        required: ["type", "value"],
                    },
                },
                timeout: {
                    type: "number",
                    description: "Timeout in milliseconds",
                    default: 10000,
                },
                waitForVisible: {
                    type: "boolean",
                    description: "Wait for element to be visible",
                    default: true,
                },
                waitForEnabled: {
                    type: "boolean",
                    description: "Wait for element to be enabled",
                    default: false,
                },
                retryCount: {
                    type: "number",
                    description: "Number of retry attempts",
                    default: 3,
                },
            },
            required: ["selectors"],
        },
    },
    // Form Interactions
    {
        name: "fill_form",
        description: "Fill multiple form fields with data",
        inputSchema: {
            type: "object",
            properties: {
                fields: {
                    type: "array",
                    description: "Array of form fields to fill",
                    items: {
                        type: "object",
                        properties: {
                            selector: {
                                type: "string",
                                description: "Field selector",
                            },
                            value: {
                                type: "string",
                                description: "Value to fill",
                            },
                            type: {
                                type: "string",
                                enum: [
                                    "text",
                                    "password",
                                    "email",
                                    "number",
                                    "checkbox",
                                    "radio",
                                    "select",
                                ],
                                description: "Field type",
                            },
                            clearFirst: {
                                type: "boolean",
                                description: "Clear field before filling",
                                default: true,
                            },
                        },
                        required: ["selector", "value"],
                    },
                },
            },
            required: ["fields"],
        },
    },
    {
        name: "submit_form",
        description: "Submit a form",
        inputSchema: {
            type: "object",
            properties: {
                submitSelector: {
                    type: "string",
                    description: "Submit button selector (optional)",
                },
                waitForNavigation: {
                    type: "boolean",
                    description: "Wait for navigation after submit",
                    default: false,
                },
                captureScreenshot: {
                    type: "boolean",
                    description: "Capture screenshot before submit",
                    default: false,
                },
            },
        },
    },
    // UI Interactions
    {
        name: "click_element",
        description: "Click on a UI element using various selectors",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Element selector (CSS, text, etc.)",
                },
                selectorType: {
                    type: "string",
                    enum: ["css", "text", "role", "label", "placeholder"],
                    default: "css",
                },
                timeout: {
                    type: "number",
                    description: "Timeout in milliseconds",
                    default: 5000,
                },
            },
            required: ["selector"],
        },
    },
    {
        name: "type_text",
        description: "Type text into an input field",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Input field selector",
                },
                text: { type: "string", description: "Text to type" },
                clear: {
                    type: "boolean",
                    description: "Clear field before typing",
                    default: true,
                },
            },
            required: ["selector", "text"],
        },
    },
    {
        name: "get_element_text",
        description: "Get text content from an element",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Element selector" },
                selectorType: {
                    type: "string",
                    enum: ["css", "text", "role", "label"],
                    default: "css",
                },
            },
            required: ["selector"],
        },
    },
    // Enhanced Visual Testing
    {
        name: "take_element_screenshot",
        description: "Take a screenshot of a specific element with advanced options",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Element selector to screenshot",
                },
                name: {
                    type: "string",
                    description: "Screenshot name for reference",
                },
                format: {
                    type: "string",
                    enum: ["png", "jpeg", "webp"],
                    description: "Image format",
                    default: "png",
                },
                quality: {
                    type: "number",
                    description: "Image quality (for JPEG/WebP)",
                    minimum: 0,
                    maximum: 100,
                },
                padding: {
                    type: "number",
                    description: "Padding around element in pixels",
                    default: 0,
                },
            },
            required: ["selector", "name"],
        },
    },
    {
        name: "take_responsive_screenshots",
        description: "Take screenshots at multiple responsive breakpoints",
        inputSchema: {
            type: "object",
            properties: {
                breakpoints: {
                    type: "array",
                    description: "Array of viewport widths",
                    items: { type: "number" },
                    default: [320, 768, 1024, 1440],
                },
                name: {
                    type: "string",
                    description: "Base name for screenshots",
                },
                selector: {
                    type: "string",
                    description: "Optional element selector to screenshot",
                },
                fullPage: {
                    type: "boolean",
                    description: "Take full page screenshots",
                    default: false,
                },
            },
            required: ["name"],
        },
    },
    {
        name: "detect_visual_regression",
        description: "Compare current screenshot with baseline and detect regressions",
        inputSchema: {
            type: "object",
            properties: {
                testName: {
                    type: "string",
                    description: "Test name for baseline comparison",
                },
                threshold: {
                    type: "number",
                    description: "Difference threshold (0-1)",
                    default: 0.1,
                },
                includeAA: {
                    type: "boolean",
                    description: "Include anti-aliasing in comparison",
                    default: false,
                },
            },
            required: ["testName"],
        },
    },
    {
        name: "update_baseline",
        description: "Update baseline screenshot for visual regression testing",
        inputSchema: {
            type: "object",
            properties: {
                testName: {
                    type: "string",
                    description: "Test name for baseline",
                },
            },
            required: ["testName"],
        },
    },
    // Visual Testing
    {
        name: "take_screenshot",
        description: "Take a screenshot of the current page or element",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Screenshot name for reference",
                },
                selector: {
                    type: "string",
                    description: "Optional element selector to screenshot",
                },
                fullPage: {
                    type: "boolean",
                    description: "Take full page screenshot",
                    default: false,
                },
            },
            required: ["name"],
        },
    },
    {
        name: "compare_screenshots",
        description: "Compare two screenshots for visual differences",
        inputSchema: {
            type: "object",
            properties: {
                baselineName: {
                    type: "string",
                    description: "Baseline screenshot name",
                },
                currentName: {
                    type: "string",
                    description: "Current screenshot name",
                },
                threshold: {
                    type: "number",
                    description: "Difference threshold (0-1)",
                    default: 0.1,
                },
            },
            required: ["baselineName", "currentName"],
        },
    },
    // Developer Tools
    {
        name: "get_console_logs",
        description: "Get browser console logs",
        inputSchema: {
            type: "object",
            properties: {
                level: {
                    type: "string",
                    enum: ["all", "error", "warning", "info", "log"],
                    default: "all",
                },
                clear: {
                    type: "boolean",
                    description: "Clear logs after retrieval",
                    default: false,
                },
            },
        },
    },
    {
        name: "get_network_requests",
        description: "Get network request information",
        inputSchema: {
            type: "object",
            properties: {
                filter: {
                    type: "string",
                    description: "Filter requests by URL pattern",
                },
                includeResponse: {
                    type: "boolean",
                    description: "Include response data",
                    default: false,
                },
            },
        },
    },
    {
        name: "check_for_errors",
        description: "Check for JavaScript errors and failed network requests",
        inputSchema: {
            type: "object",
            properties: {
                includeNetworkErrors: { type: "boolean", default: true },
                includeConsoleErrors: { type: "boolean", default: true },
            },
        },
    },
    // Enhanced Browser Monitoring
    {
        name: "start_browser_monitoring",
        description: "Start comprehensive browser monitoring with console, network, and error tracking",
        inputSchema: {
            type: "object",
            properties: {
                consoleFilter: {
                    type: "object",
                    description: "Filter for console messages",
                    properties: {
                        level: {
                            type: "string",
                            enum: ["log", "info", "warn", "error"],
                            description: "Console level to filter by",
                        },
                        source: {
                            type: "string",
                            description: "Source to filter by",
                        },
                        message: {
                            type: "string",
                            description: "Regex pattern to match message content",
                        },
                    },
                },
                networkFilter: {
                    type: "object",
                    description: "Filter for network requests",
                    properties: {
                        url: {
                            type: "string",
                            description: "Regex pattern to match URLs",
                        },
                        method: {
                            type: "string",
                            description: "HTTP method to filter by",
                        },
                        status: {
                            type: "number",
                            description: "HTTP status code to filter by",
                        },
                        resourceType: {
                            type: "string",
                            description: "Resource type to filter by",
                        },
                    },
                },
                captureScreenshots: {
                    type: "boolean",
                    description: "Capture screenshots during monitoring",
                    default: false,
                },
                maxEntries: {
                    type: "number",
                    description: "Maximum number of entries to keep",
                    default: 1000,
                },
            },
        },
    },
    {
        name: "stop_browser_monitoring",
        description: "Stop browser monitoring and get comprehensive results",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_filtered_console_logs",
        description: "Get filtered console logs from active monitoring session",
        inputSchema: {
            type: "object",
            properties: {
                level: {
                    type: "string",
                    enum: ["log", "info", "warn", "error"],
                    description: "Console level to filter by",
                },
                source: {
                    type: "string",
                    description: "Source to filter by",
                },
                message: {
                    type: "string",
                    description: "Regex pattern to match message content",
                },
            },
        },
    },
    {
        name: "get_filtered_network_requests",
        description: "Get filtered network requests from active monitoring session",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "Regex pattern to match URLs",
                },
                method: {
                    type: "string",
                    description: "HTTP method to filter by",
                },
                status: {
                    type: "number",
                    description: "HTTP status code to filter by",
                },
                resourceType: {
                    type: "string",
                    description: "Resource type to filter by",
                },
            },
        },
    },
    {
        name: "get_javascript_errors",
        description: "Get JavaScript errors from active monitoring session",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "capture_performance_metrics",
        description: "Capture comprehensive performance metrics",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    // Advanced Performance Monitoring
    {
        name: "measure_core_web_vitals",
        description: "Measure Core Web Vitals (CLS, FID, LCP) for the current page",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "analyze_page_load",
        description: "Analyze detailed page load timing and navigation metrics",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "monitor_resource_loading",
        description: "Monitor and analyze resource loading performance",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "track_memory_usage",
        description: "Track JavaScript heap memory usage over time",
        inputSchema: {
            type: "object",
            properties: {
                duration: {
                    type: "number",
                    description: "Duration to track memory usage in milliseconds",
                    default: 30000,
                },
            },
        },
    },
    {
        name: "detect_performance_regression",
        description: "Compare current performance metrics with baseline to detect regressions",
        inputSchema: {
            type: "object",
            properties: {
                baselineMetrics: {
                    type: "object",
                    description: "Baseline performance metrics to compare against",
                    properties: {
                        coreWebVitals: {
                            type: "object",
                            properties: {
                                cls: { type: "number" },
                                fid: { type: "number" },
                                lcp: { type: "number" },
                            },
                        },
                        timing: {
                            type: "object",
                            properties: {
                                domContentLoaded: { type: "number" },
                                loadComplete: { type: "number" },
                                firstPaint: { type: "number" },
                                firstContentfulPaint: { type: "number" },
                                largestContentfulPaint: { type: "number" },
                            },
                        },
                        memory: {
                            type: "object",
                            properties: {
                                usedPercent: { type: "number" },
                            },
                        },
                        timestamp: { type: "number" },
                    },
                    required: ["coreWebVitals", "timing", "memory", "timestamp"],
                },
            },
            required: ["baselineMetrics"],
        },
    },
    {
        name: "get_comprehensive_performance_metrics",
        description: "Get comprehensive performance metrics including Core Web Vitals, timing, resources, and memory",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    // Backend Service Mocking
    {
        name: "load_mock_config",
        description: "Load mock configuration from file or object",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the mock configuration",
                },
                description: {
                    type: "string",
                    description: "Description of the mock configuration",
                },
                rules: {
                    type: "array",
                    description: "Array of mock rules",
                    items: {
                        type: "object",
                        properties: {
                            url: {
                                type: "string",
                                description: "URL pattern to match (supports wildcards)",
                            },
                            method: {
                                type: "string",
                                enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                                description: "HTTP method to match",
                            },
                            headers: {
                                type: "object",
                                description: "Headers to match",
                                additionalProperties: { type: "string" },
                            },
                            response: {
                                type: "object",
                                description: "Mock response configuration",
                                properties: {
                                    status: {
                                        type: "number",
                                        description: "HTTP status code",
                                        default: 200,
                                    },
                                    headers: {
                                        type: "object",
                                        description: "Response headers",
                                        additionalProperties: { type: "string" },
                                    },
                                    body: {
                                        description: "Response body (JSON or string)",
                                    },
                                    delay: {
                                        type: "number",
                                        description: "Response delay in milliseconds",
                                    },
                                },
                                required: ["status"],
                            },
                            priority: {
                                type: "number",
                                description: "Rule priority (higher = matched first)",
                                default: 0,
                            },
                        },
                        required: ["url", "response"],
                    },
                },
                enabled: {
                    type: "boolean",
                    description: "Whether to enable mocking immediately",
                    default: true,
                },
            },
            required: ["name", "rules"],
        },
    },
    {
        name: "save_mock_config",
        description: "Save current mock configuration to file",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name for the saved configuration",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "add_mock_rule",
        description: "Add a new mock rule",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL pattern to match",
                },
                method: {
                    type: "string",
                    enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                    description: "HTTP method to match",
                },
                headers: {
                    type: "object",
                    description: "Headers to match",
                    additionalProperties: { type: "string" },
                },
                response: {
                    type: "object",
                    description: "Mock response configuration",
                    properties: {
                        status: {
                            type: "number",
                            description: "HTTP status code",
                            default: 200,
                        },
                        headers: {
                            type: "object",
                            description: "Response headers",
                            additionalProperties: { type: "string" },
                        },
                        body: {
                            description: "Response body",
                        },
                        delay: {
                            type: "number",
                            description: "Response delay in milliseconds",
                        },
                    },
                    required: ["status"],
                },
                priority: {
                    type: "number",
                    description: "Rule priority",
                    default: 0,
                },
            },
            required: ["url", "response"],
        },
    },
    {
        name: "remove_mock_rule",
        description: "Remove a mock rule by ID",
        inputSchema: {
            type: "object",
            properties: {
                ruleId: {
                    type: "string",
                    description: "ID of the mock rule to remove",
                },
            },
            required: ["ruleId"],
        },
    },
    {
        name: "update_mock_rule",
        description: "Update an existing mock rule",
        inputSchema: {
            type: "object",
            properties: {
                ruleId: {
                    type: "string",
                    description: "ID of the mock rule to update",
                },
                updates: {
                    type: "object",
                    description: "Updates to apply to the mock rule",
                    properties: {
                        url: { type: "string" },
                        method: {
                            type: "string",
                            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        },
                        headers: {
                            type: "object",
                            additionalProperties: { type: "string" },
                        },
                        response: {
                            type: "object",
                            properties: {
                                status: { type: "number" },
                                headers: {
                                    type: "object",
                                    additionalProperties: { type: "string" },
                                },
                                body: {},
                                delay: { type: "number" },
                            },
                        },
                        priority: { type: "number" },
                    },
                },
            },
            required: ["ruleId", "updates"],
        },
    },
    {
        name: "enable_backend_mocking",
        description: "Enable backend service mocking for the current page",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "disable_backend_mocking",
        description: "Disable backend service mocking",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_mocked_requests",
        description: "Get history of mocked requests",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_mock_rules",
        description: "Get all active mock rules",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "clear_all_mocks",
        description: "Clear all mock rules",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "setup_journey_mocks",
        description: "Setup mocks for a specific user journey",
        inputSchema: {
            type: "object",
            properties: {
                journeyName: {
                    type: "string",
                    description: "Name of the journey",
                },
                mockConfig: {
                    type: "object",
                    description: "Mock configuration for the journey",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        rules: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    url: { type: "string" },
                                    method: {
                                        type: "string",
                                        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                                    },
                                    response: {
                                        type: "object",
                                        properties: {
                                            status: { type: "number" },
                                            body: {},
                                        },
                                        required: ["status"],
                                    },
                                },
                                required: ["url", "response"],
                            },
                        },
                    },
                    required: ["name", "rules"],
                },
            },
            required: ["journeyName", "mockConfig"],
        },
    },
    // Wait/Retry System
    {
        name: "wait_for_element",
        description: "Wait for an element to appear with retry logic",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Element selector" },
                timeout: {
                    type: "number",
                    description: "Maximum wait time in ms",
                    default: 10000,
                },
                retries: {
                    type: "number",
                    description: "Number of retries",
                    default: 3,
                },
                interval: {
                    type: "number",
                    description: "Interval between retries in ms",
                    default: 1000,
                },
            },
            required: ["selector"],
        },
    },
    {
        name: "wait_for_condition",
        description: "Wait for a custom condition to be met",
        inputSchema: {
            type: "object",
            properties: {
                condition: {
                    type: "string",
                    description: "JavaScript condition to evaluate",
                },
                timeout: {
                    type: "number",
                    description: "Maximum wait time in ms",
                    default: 10000,
                },
                retries: {
                    type: "number",
                    description: "Number of retries",
                    default: 3,
                },
            },
            required: ["condition"],
        },
    },
    // User Journey Simulation
    {
        name: "run_user_journey",
        description: "Execute a predefined user journey with multiple steps",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the journey",
                },
                steps: {
                    type: "array",
                    description: "Array of journey steps to execute",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique identifier for the step",
                            },
                            action: {
                                type: "string",
                                enum: [
                                    "navigate",
                                    "click",
                                    "type",
                                    "wait",
                                    "assert",
                                    "screenshot",
                                ],
                                description: "Action to perform",
                            },
                            selector: {
                                type: "string",
                                description: "Element selector (for click, type, wait)",
                            },
                            value: {
                                type: "string",
                                description: "Value to use (for navigate, type, screenshot)",
                            },
                            condition: {
                                type: "string",
                                description: "JavaScript condition function (for wait, assert)",
                            },
                            timeout: {
                                type: "number",
                                description: "Timeout in milliseconds",
                                default: 10000,
                            },
                            retryCount: {
                                type: "number",
                                description: "Number of retry attempts",
                                default: 0,
                            },
                            onError: {
                                type: "string",
                                enum: ["continue", "retry", "fail"],
                                description: "Error handling strategy",
                                default: "fail",
                            },
                            description: {
                                type: "string",
                                description: "Description of the step",
                            },
                        },
                        required: ["id", "action"],
                    },
                },
                onStepComplete: {
                    type: "boolean",
                    description: "Whether to report completion of each step",
                    default: false,
                },
                onError: {
                    type: "boolean",
                    description: "Whether to report errors during journey",
                    default: true,
                },
                maxDuration: {
                    type: "number",
                    description: "Maximum duration for the entire journey in milliseconds",
                },
                baseUrl: {
                    type: "string",
                    description: "Base URL to prepend to relative navigation paths",
                },
            },
            required: ["name", "steps"],
        },
    },
    {
        name: "record_user_journey",
        description: "Start recording a user journey for later playback",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name for the recorded journey",
                },
                description: {
                    type: "string",
                    description: "Description of the journey",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "validate_journey_definition",
        description: "Validate a journey definition for correctness",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the journey",
                },
                description: {
                    type: "string",
                    description: "Description of the journey",
                },
                steps: {
                    type: "array",
                    description: "Array of journey steps to validate",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique identifier for the step",
                            },
                            action: {
                                type: "string",
                                enum: [
                                    "navigate",
                                    "click",
                                    "type",
                                    "wait",
                                    "assert",
                                    "screenshot",
                                ],
                                description: "Action to perform",
                            },
                            selector: {
                                type: "string",
                                description: "Element selector",
                            },
                            value: {
                                type: "string",
                                description: "Value to use",
                            },
                            condition: {
                                type: "string",
                                description: "JavaScript condition function",
                            },
                            timeout: {
                                type: "number",
                                description: "Timeout in milliseconds",
                            },
                            retryCount: {
                                type: "number",
                                description: "Number of retry attempts",
                            },
                            onError: {
                                type: "string",
                                enum: ["continue", "retry", "fail"],
                                description: "Error handling strategy",
                            },
                            description: {
                                type: "string",
                                description: "Description of the step",
                            },
                        },
                        required: ["id", "action"],
                    },
                },
            },
            required: ["name", "steps"],
        },
    },
    {
        name: "optimize_journey_definition",
        description: "Optimize a journey definition for better performance",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the journey",
                },
                description: {
                    type: "string",
                    description: "Description of the journey",
                },
                steps: {
                    type: "array",
                    description: "Array of journey steps to optimize",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique identifier for the step",
                            },
                            action: {
                                type: "string",
                                enum: [
                                    "navigate",
                                    "click",
                                    "type",
                                    "wait",
                                    "assert",
                                    "screenshot",
                                ],
                                description: "Action to perform",
                            },
                            selector: {
                                type: "string",
                                description: "Element selector",
                            },
                            value: {
                                type: "string",
                                description: "Value to use",
                            },
                            condition: {
                                type: "string",
                                description: "JavaScript condition function",
                            },
                            timeout: {
                                type: "number",
                                description: "Timeout in milliseconds",
                            },
                            retryCount: {
                                type: "number",
                                description: "Number of retry attempts",
                            },
                            onError: {
                                type: "string",
                                enum: ["continue", "retry", "fail"],
                                description: "Error handling strategy",
                            },
                            description: {
                                type: "string",
                                description: "Description of the step",
                            },
                        },
                        required: ["id", "action"],
                    },
                },
            },
            required: ["name", "steps"],
        },
    },
    // Server State and Configuration Tools
    {
        name: "get_server_state",
        description: "Get current server state including browser, monitoring, and mocking status",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_session_info",
        description: "Get detailed session information including configurations and active tools",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "configure_session",
        description: "Configure session settings like timeouts, retry policies, and browser options",
        inputSchema: {
            type: "object",
            properties: {
                defaultTimeout: {
                    type: "number",
                    description: "Default timeout in milliseconds for operations",
                },
                maxRetries: {
                    type: "number",
                    description: "Maximum number of retry attempts",
                },
                retryDelay: {
                    type: "number",
                    description: "Initial delay between retries in milliseconds",
                },
                headlessBrowser: {
                    type: "boolean",
                    description: "Run browser in headless mode by default",
                },
                viewportWidth: {
                    type: "number",
                    description: "Default viewport width",
                },
                viewportHeight: {
                    type: "number",
                    description: "Default viewport height",
                },
            },
        },
    },
    {
        name: "get_performance_baseline",
        description: "Get stored performance baseline metrics for regression testing",
        inputSchema: {
            type: "object",
            properties: {
                testId: {
                    type: "string",
                    description: "Test ID to retrieve baseline for (optional - returns all if not specified)",
                },
            },
        },
    },
    {
        name: "set_performance_baseline",
        description: "Set performance baseline for regression testing",
        inputSchema: {
            type: "object",
            properties: {
                testId: {
                    type: "string",
                    description: "Test ID for the baseline",
                },
                baselineMetrics: {
                    type: "object",
                    description: "Performance baseline metrics to store",
                    properties: {
                        coreWebVitals: {
                            type: "object",
                            properties: {
                                cls: {
                                    type: "number",
                                    description: "Cumulative Layout Shift",
                                },
                                fid: {
                                    type: "number",
                                    description: "First Input Delay (ms)",
                                },
                                lcp: {
                                    type: "number",
                                    description: "Largest Contentful Paint (ms)",
                                },
                            },
                        },
                        timing: {
                            type: "object",
                            properties: {
                                domContentLoaded: {
                                    type: "number",
                                    description: "DOM Content Loaded (ms)",
                                },
                                loadComplete: {
                                    type: "number",
                                    description: "Load Complete (ms)",
                                },
                                firstPaint: {
                                    type: "number",
                                    description: "First Paint (ms)",
                                },
                                firstContentfulPaint: {
                                    type: "number",
                                    description: "First Contentful Paint (ms)",
                                },
                                largestContentfulPaint: {
                                    type: "number",
                                    description: "Largest Contentful Paint (ms)",
                                },
                            },
                        },
                        memory: {
                            type: "object",
                            properties: {
                                usedPercent: {
                                    type: "number",
                                    description: "Memory usage percentage",
                                },
                            },
                        },
                        timestamp: {
                            type: "number",
                            description: "Timestamp when baseline was captured",
                        },
                    },
                    required: ["coreWebVitals", "timing", "memory", "timestamp"],
                },
                description: {
                    type: "string",
                    description: "Optional description of the baseline",
                },
            },
            required: ["testId", "baselineMetrics"],
        },
    },
    {
        name: "clear_performance_baselines",
        description: "Clear stored performance baselines",
        inputSchema: {
            type: "object",
            properties: {
                testId: {
                    type: "string",
                    description: "Specific test ID to clear (optional - clears all if not specified)",
                },
            },
        },
    },
    // Video Recording and Journey Screenshots Tools
    {
        name: "get_journey_screenshots",
        description: "Get comprehensive overview of all journey screenshots with metadata",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];
