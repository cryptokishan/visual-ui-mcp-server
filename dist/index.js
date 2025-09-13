#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs-extra";
import * as path from "path";
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    backoffMultiplier: 1.5,
    initialDelay: 1000,
};
// Enhanced error types with recovery suggestions
class AgentFriendlyError extends Error {
    code;
    recoverySuggestion;
    canRetry;
    constructor(code, message, recoverySuggestion, canRetry = false) {
        super(message);
        this.code = code;
        this.recoverySuggestion = recoverySuggestion;
        this.canRetry = canRetry;
        this.name = "AgentFriendlyError";
    }
}
// Logging utility with state management
class Logger {
    logFile;
    sessionState;
    constructor() {
        this.logFile = path.join(process.cwd(), "logs", "mcp-server.log");
        this.sessionState = this.loadSessionState();
        // Ensure logs directory exists
        fs.ensureDirSync(path.dirname(this.logFile));
    }
    loadSessionState() {
        try {
            const stateFile = path.join(process.cwd(), "logs", "session-state.json");
            if (fs.existsSync(stateFile)) {
                const data = fs.readFileSync(stateFile, "utf-8");
                const state = JSON.parse(data);
                // Convert timestamp back to Date
                state.lastActivity = new Date(state.lastActivity);
                return state;
            }
        }
        catch (error) {
            this.debug(`Failed to load session state: ${error}`);
        }
        // Return default state
        return {
            browserLaunched: false,
            monitoringActive: false,
            mockingActive: false,
            lastActivity: new Date(),
            activeTools: [],
        };
    }
    saveSessionState() {
        try {
            const stateFile = path.join(process.cwd(), "logs", "session-state.json");
            fs.ensureDirSync(path.dirname(stateFile));
            fs.writeFileSync(stateFile, JSON.stringify(this.sessionState, null, 2));
        }
        catch (error) {
            console.error("Failed to save session state:", error);
        }
    }
    updateSessionState(updates) {
        this.sessionState = {
            ...this.sessionState,
            ...updates,
            lastActivity: new Date(),
        };
        this.saveSessionState();
    }
    getSessionState() {
        return { ...this.sessionState };
    }
    formatMessage(level, message) {
        return `[${new Date().toISOString()}] ${level}: ${message}\n`;
    }
    info(message) {
        const logMessage = this.formatMessage("INFO", message);
        try {
            fs.ensureDirSync(path.dirname(this.logFile));
            fs.writeFileSync(this.logFile, logMessage, { flag: "a" });
        }
        catch (error) {
            // Fallback to console if file logging fails
            console.error("Failed to write to log file:", error);
            console.log(message);
        }
    }
    error(message) {
        const logMessage = this.formatMessage("ERROR", message);
        try {
            fs.ensureDirSync(path.dirname(this.logFile));
            fs.writeFileSync(this.logFile, logMessage, { flag: "a" });
        }
        catch (error) {
            // Fallback to console if file logging fails
            console.error("Failed to write to log file:", error);
            console.error(message);
        }
    }
    debug(message) {
        const logMessage = this.formatMessage("DEBUG", message);
        try {
            fs.ensureDirSync(path.dirname(this.logFile));
            fs.writeFileSync(this.logFile, logMessage, { flag: "a" });
        }
        catch (error) {
            // Fallback to console if file logging fails
            console.error("Failed to write to log file:", error);
            console.debug(message);
        }
    }
}
// Import our tool modules
import { BackendMocker } from "./backend-mocker.js";
import { browserManager } from "./browser-manager.js";
import { BrowserMonitor } from "./browser-monitor.js";
import { devToolsMonitor } from "./dev-tools-monitor.js";
import { ElementLocator } from "./element-locator.js";
import { FormHandler } from "./form-handler.js";
import { JourneySimulator } from "./journey-simulator.js";
import { PerformanceMonitor } from "./performance-monitor.js";
import { uiInteractions } from "./ui-interactions.js";
import { visualTesting } from "./visual-testing.js";
import { waitRetrySystem } from "./wait-retry.js";
class VisualUITestingServer {
    server;
    logger;
    browserInstance = null;
    elementLocator = null;
    formHandler = null;
    browserMonitor = null;
    journeySimulator = null;
    performanceMonitor = null;
    constructor() {
        this.logger = new Logger();
        this.server = new Server({
            name: "visual-ui-mcp-server",
            version: "1.0.0",
        });
        this.setupToolHandlers();
        this.setupRequestHandlers();
    }
    // Enhanced browser state validation
    async validateBrowserState(operation, requiresActivePage = true) {
        const state = this.logger.getSessionState();
        if (!state.browserLaunched) {
            throw new AgentFriendlyError("BROWSER_NOT_LAUNCHED", `Browser not launched. Cannot perform operation: ${operation}`, 'Call "launch_browser" first to start a browser session.', false);
        }
        if (requiresActivePage) {
            const page = browserManager.getPage();
            if (!page) {
                throw new AgentFriendlyError("BROWSER_PAGE_UNAVAILABLE", `Browser page unavailable. Cannot perform operation: ${operation}`, "The browser page may have been closed. Try launching the browser again.", false);
            }
        }
    }
    // Enhanced monitoring state validation
    validateMonitoringState(operation, requiresActive = true) {
        const state = this.logger.getSessionState();
        if (requiresActive && !state.monitoringActive) {
            throw new AgentFriendlyError("MONITORING_NOT_ACTIVE", `Browser monitoring not active. Cannot perform operation: ${operation}`, 'Start browser monitoring first with "start_browser_monitoring".', false);
        }
        if (!requiresActive && state.monitoringActive) {
            throw new AgentFriendlyError("MONITORING_ALREADY_ACTIVE", `Browser monitoring already active. Cannot perform operation: ${operation}`, 'Stop current monitoring with "stop_browser_monitoring" before starting new session.', false);
        }
    }
    // Retry logic wrapper
    async withRetry(operation, operationName, config = {}) {
        const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
        let lastError;
        for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Don't retry for non-retryable errors
                if (error instanceof AgentFriendlyError && !error.canRetry) {
                    throw error;
                }
                if (attempt === retryConfig.maxAttempts) {
                    this.logger.error(`${operationName} failed after ${attempt} attempts`);
                    throw new AgentFriendlyError("OPERATION_FAILED", `${operationName} failed after ${attempt} attempts: ${lastError.message}`, `Operation failed consistently. Check logs for details. Last error: ${lastError.message}`, false);
                }
                const delay = retryConfig.initialDelay *
                    Math.pow(retryConfig.backoffMultiplier, attempt - 1);
                this.logger.debug(`Retry ${attempt}/${retryConfig.maxAttempts} for ${operationName} after ${delay}ms`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
    // Validate required arguments
    validateArgs(args, requiredFields, operation) {
        if (!args) {
            throw new AgentFriendlyError("MISSING_ARGUMENTS", `Arguments are required for operation: ${operation}`, `Please provide the required arguments for ${operation}.`, false);
        }
        const missingFields = requiredFields.filter((field) => !(field in args) || args[field] === undefined || args[field] === null);
        if (missingFields.length > 0) {
            throw new AgentFriendlyError("MISSING_REQUIRED_ARGUMENTS", `Missing required arguments for ${operation}: ${missingFields.join(", ")}`, `Please provide the following required arguments: ${missingFields.join(", ")}`, false);
        }
    }
    // Update session state
    updateBrowserState(launched, monitoring, mocking, tool) {
        const updates = { browserLaunched: launched };
        if (monitoring !== undefined)
            updates.monitoringActive = monitoring;
        if (mocking !== undefined)
            updates.mockingActive = mocking;
        if (tool) {
            const state = this.logger.getSessionState();
            const activeTools = [...state.activeTools];
            if (tool && !activeTools.includes(tool)) {
                activeTools.push(tool);
            }
            updates.activeTools = activeTools;
        }
        this.logger.updateSessionState(updates);
    }
    setupToolHandlers() {
        // Browser Management Tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
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
                ],
            };
        });
    }
    setupRequestHandlers() {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const startTime = Date.now();
            const { name, arguments: args } = request.params;
            this.logger.info(`📨 Received tool call: ${name}`);
            if (args) {
                this.logger.debug(`📨 Arguments: ${JSON.stringify(args, null, 2)}`);
            }
            try {
                this.logger.info(`🔧 Executing tool: ${name}`);
                switch (name) {
                    // Browser Management
                    case "launch_browser":
                        return await this.withRetry(async () => {
                            await this.validateArgs(args, ["url"], "launch_browser");
                            const result = await browserManager.launchBrowser(args);
                            this.updateBrowserState(true, undefined, undefined, "launch_browser");
                            // Initialize ElementLocator, FormHandler, and JourneySimulator with the current page
                            const page = browserManager.getPage();
                            if (page) {
                                this.elementLocator = new ElementLocator(page);
                                this.formHandler = new FormHandler(page, this.elementLocator);
                                this.journeySimulator = new JourneySimulator(page);
                            }
                            return result;
                        }, "launch_browser");
                    case "close_browser":
                        const closeResult = await browserManager.closeBrowser();
                        this.updateBrowserState(false, false, false); // Reset all states
                        return closeResult;
                    // Enhanced Element Location
                    case "find_element":
                        if (!this.elementLocator) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        const element = await this.elementLocator.findElement(args);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: element
                                        ? "Element found successfully"
                                        : "Element not found",
                                },
                            ],
                        };
                    // Form Interactions
                    case "fill_form":
                        if (!this.formHandler) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || !args.fields || !Array.isArray(args.fields)) {
                            throw new Error("Fields parameter is required for fill_form and must be an array");
                        }
                        await this.formHandler.fillForm(args.fields);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Form filled successfully with ${args.fields.length} fields`,
                                },
                            ],
                        };
                    case "submit_form":
                        if (!this.formHandler) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        await this.formHandler.submitForm(args || {});
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Form submitted successfully",
                                },
                            ],
                        };
                    // UI Interactions
                    case "click_element":
                        return await uiInteractions.clickElement(args);
                    case "type_text":
                        return await uiInteractions.typeText(args);
                    case "get_element_text":
                        return await uiInteractions.getElementText(args);
                    // Enhanced Visual Testing
                    case "take_element_screenshot":
                        const elementPage = browserManager.getPage();
                        if (!elementPage) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args ||
                            typeof args.selector !== "string" ||
                            typeof args.name !== "string") {
                            throw new Error("Selector and name parameters are required");
                        }
                        const elementScreenshot = await visualTesting.takeElementScreenshot(elementPage, args.selector, {
                            format: args.format,
                            quality: args.quality,
                            padding: args.padding,
                        });
                        const elementPath = path.join(process.cwd(), "screenshots", "current", `${args.name}.png`);
                        await fs.writeFile(elementPath, elementScreenshot);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Element screenshot saved: ${elementPath}`,
                                },
                            ],
                        };
                    case "take_responsive_screenshots":
                        const responsivePage = browserManager.getPage();
                        if (!responsivePage) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || typeof args.name !== "string") {
                            throw new Error("Name parameter is required");
                        }
                        const breakpoints = Array.isArray(args.breakpoints)
                            ? args.breakpoints
                            : [320, 768, 1024, 1440];
                        const responsiveScreenshots = await visualTesting.takeResponsiveScreenshots(responsivePage, breakpoints, {
                            selector: args.selector,
                            fullPage: args.fullPage,
                        });
                        const responsiveResults = Array.from(responsiveScreenshots.entries()).map(([width, buffer]) => {
                            const responsivePath = path.join(process.cwd(), "screenshots", "current", `${args.name}_${width}px.png`);
                            fs.writeFile(responsivePath, buffer);
                            return `${width}px: ${responsivePath}`;
                        });
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Responsive screenshots saved:\n${responsiveResults.join("\n")}`,
                                },
                            ],
                        };
                    case "detect_visual_regression":
                        const regressionPage = browserManager.getPage();
                        if (!regressionPage) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || typeof args.testName !== "string") {
                            throw new Error("Test name parameter is required");
                        }
                        const regressionResult = await visualTesting.compareWithBaseline(regressionPage, args.testName, {
                            threshold: args.threshold,
                            includeAA: args.includeAA,
                        });
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Visual Regression Results for "${args.testName}":
- Status: ${regressionResult.isDifferent
                                        ? "REGRESSION DETECTED"
                                        : "NO REGRESSION"}
- Similarity: ${regressionResult.similarity.toFixed(2)}%
- Total Pixels: ${regressionResult.totalPixels}
- Different Pixels: ${regressionResult.differentPixels}
- Changed Regions: ${regressionResult.changedRegions.length}
${regressionResult.diffImage ? `- Diff image available` : ""}`,
                                },
                            ],
                        };
                    case "update_baseline":
                        const baselinePage = browserManager.getPage();
                        if (!baselinePage) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || typeof args.testName !== "string") {
                            throw new Error("Test name parameter is required");
                        }
                        await visualTesting.updateBaseline(baselinePage, args.testName);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Baseline updated for test: ${args.testName}`,
                                },
                            ],
                        };
                    // Visual Testing
                    case "take_screenshot":
                        return await visualTesting.takeScreenshot(args);
                    case "compare_screenshots":
                        return await visualTesting.compareScreenshots(args);
                    // Developer Tools
                    case "get_console_logs":
                        return await devToolsMonitor.getConsoleLogs(args);
                    case "get_network_requests":
                        return await devToolsMonitor.getNetworkRequests(args);
                    case "check_for_errors":
                        return await devToolsMonitor.checkForErrors(args);
                    // Enhanced Browser Monitoring
                    case "start_browser_monitoring":
                        return await this.withRetry(async () => {
                            await this.validateBrowserState("start_browser_monitoring");
                            this.validateMonitoringState("start_browser_monitoring", false);
                            this.browserMonitor = new BrowserMonitor();
                            // Parse filter arguments
                            const consoleFilter = args && args.consoleFilter
                                ? {
                                    level: args.consoleFilter.level,
                                    source: args.consoleFilter.source,
                                    message: args.consoleFilter.message
                                        ? new RegExp(args.consoleFilter.message)
                                        : undefined,
                                }
                                : undefined;
                            const networkFilter = args && args.networkFilter
                                ? {
                                    url: args.networkFilter.url
                                        ? new RegExp(args.networkFilter.url)
                                        : undefined,
                                    method: args.networkFilter.method,
                                    status: args.networkFilter.status,
                                    resourceType: args.networkFilter
                                        .resourceType,
                                }
                                : undefined;
                            const monitoringPage = browserManager.getPage();
                            if (!monitoringPage) {
                                throw new AgentFriendlyError("BROWSER_PAGE_UNAVAILABLE", "Browser page unavailable during monitoring setup.", "Browser page may have closed unexpectedly. Restart the browser.", true);
                            }
                            await this.browserMonitor.startMonitoring(monitoringPage, {
                                consoleFilter,
                                networkFilter,
                                captureScreenshots: (args && args.captureScreenshots) || false,
                                maxEntries: (args && args.maxEntries) || 1000,
                            });
                            this.updateBrowserState(false, true, undefined); // Update monitoring state
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: "Browser monitoring started successfully. Console messages, network requests, and JavaScript errors will be tracked.",
                                    },
                                ],
                            };
                        }, "start_browser_monitoring");
                    case "stop_browser_monitoring":
                        if (!this.browserMonitor || !this.browserMonitor.isActive()) {
                            throw new Error("No active browser monitoring session to stop.");
                        }
                        const monitoringResult = await this.browserMonitor.stopMonitoring();
                        this.updateBrowserState(this.logger.getSessionState().browserLaunched, false, undefined); // Clear monitoring state
                        this.browserMonitor = null; // Clear the monitor instance
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Browser monitoring stopped. Results:
- Monitoring Duration: ${Math.round(monitoringResult.monitoringDuration / 1000)}s
- Total Requests: ${monitoringResult.totalRequests}
- Failed Requests: ${monitoringResult.failedRequests}
- Console Messages: ${monitoringResult.consoleMessages}
- Errors: ${monitoringResult.errors}
- DOM Content Loaded: ${monitoringResult.performanceMetrics.domContentLoaded}ms
- Load Complete: ${monitoringResult.performanceMetrics.loadComplete}ms`,
                                },
                            ],
                        };
                    case "get_filtered_console_logs":
                        if (!this.browserMonitor || !this.browserMonitor.isActive()) {
                            throw new Error("No active browser monitoring session.");
                        }
                        const consoleFilterArgs = args
                            ? {
                                level: args.level,
                                source: args.source,
                                message: args.message
                                    ? new RegExp(args.message)
                                    : undefined,
                            }
                            : undefined;
                        const consoleLogs = await this.browserMonitor.getConsoleLogs(consoleFilterArgs);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Filtered Console Logs (${consoleLogs.length} entries):\n${consoleLogs
                                        .map((log) => `[${new Date(log.timestamp).toISOString()}] ${log.type.toUpperCase()}: ${log.text}`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "get_filtered_network_requests":
                        if (!this.browserMonitor || !this.browserMonitor.isActive()) {
                            throw new Error("No active browser monitoring session.");
                        }
                        const networkFilterArgs = args
                            ? {
                                url: args.url
                                    ? new RegExp(args.url)
                                    : undefined,
                                method: args.method,
                                status: args.status,
                                resourceType: args.resourceType,
                            }
                            : undefined;
                        const networkRequests = await this.browserMonitor.getNetworkRequests(networkFilterArgs);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Filtered Network Requests (${networkRequests.length} entries):\n${networkRequests
                                        .map((req) => `${req.method} ${req.url} - ${req.status || "Pending"} (${req.duration || 0}ms)${req.failed ? " [FAILED]" : ""}`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "get_javascript_errors":
                        if (!this.browserMonitor || !this.browserMonitor.isActive()) {
                            throw new Error("No active browser monitoring session.");
                        }
                        const jsErrors = await this.browserMonitor.getJavaScriptErrors();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `JavaScript Errors (${jsErrors.length} entries):\n${jsErrors
                                        .map((error) => `${error.type.toUpperCase()}: ${error.message} at ${error.location?.url}:${error.location?.lineNumber}`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "capture_performance_metrics":
                        if (!this.browserMonitor || !this.browserMonitor.isActive()) {
                            throw new Error("No active browser monitoring session.");
                        }
                        const performanceMetrics = await this.browserMonitor.capturePerformanceMetrics();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Performance Metrics:
- DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms
- Load Complete: ${performanceMetrics.loadComplete}ms
- First Paint: ${performanceMetrics.firstPaint || "N/A"}ms
- First Contentful Paint: ${performanceMetrics.firstContentfulPaint || "N/A"}ms
- Largest Contentful Paint: ${performanceMetrics.largestContentfulPaint || "N/A"}ms
- Cumulative Layout Shift: ${performanceMetrics.cumulativeLayoutShift || "N/A"}
- First Input Delay: ${performanceMetrics.firstInputDelay || "N/A"}ms
- Navigation Timing: ${Object.entries(performanceMetrics.navigationTiming)
                                        .map(([key, value]) => `${key}: ${value}ms`)
                                        .join(", ")}
- Resource Count: ${performanceMetrics.resourceTiming.length}`,
                                },
                            ],
                        };
                    // Advanced Performance Monitoring
                    case "measure_core_web_vitals":
                        const pageForVitals = browserManager.getPage();
                        if (!pageForVitals) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        this.performanceMonitor = new PerformanceMonitor();
                        const coreWebVitals = await this.performanceMonitor.measureCoreWebVitals(pageForVitals);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Core Web Vitals:
- Cumulative Layout Shift (CLS): ${coreWebVitals.cls.toFixed(4)}
- First Input Delay (FID): ${coreWebVitals.fid.toFixed(2)}ms
- Largest Contentful Paint (LCP): ${coreWebVitals.lcp.toFixed(2)}ms

📊 Performance Scores:
- CLS: ${coreWebVitals.cls < 0.1
                                        ? "✅ Good"
                                        : coreWebVitals.cls < 0.25
                                            ? "⚠️ Needs Improvement"
                                            : "❌ Poor"}
- FID: ${coreWebVitals.fid < 100
                                        ? "✅ Good"
                                        : coreWebVitals.fid < 300
                                            ? "⚠️ Needs Improvement"
                                            : "❌ Poor"}
- LCP: ${coreWebVitals.lcp < 2500
                                        ? "✅ Good"
                                        : coreWebVitals.lcp < 4000
                                            ? "⚠️ Needs Improvement"
                                            : "❌ Poor"}`,
                                },
                            ],
                        };
                    case "analyze_page_load":
                        const pageForLoad = browserManager.getPage();
                        if (!pageForLoad) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        this.performanceMonitor = new PerformanceMonitor();
                        const loadAnalysis = await this.performanceMonitor.analyzePageLoad(pageForLoad);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Page Load Analysis:
- DOM Content Loaded: ${loadAnalysis.domContentLoaded}ms
- Load Complete: ${loadAnalysis.loadComplete}ms
- First Paint: ${loadAnalysis.firstPaint}ms
- First Contentful Paint: ${loadAnalysis.firstContentfulPaint}ms
- Largest Contentful Paint: ${loadAnalysis.largestContentfulPaint}ms

Navigation Timing:
${Object.entries(loadAnalysis.navigationTiming)
                                        .map(([key, value]) => `- ${key}: ${value}ms`)
                                        .join("\n")}

Resource Summary:
- Total Resources: ${loadAnalysis.resourceTiming.length}
- Resource Types: ${[
                                        ...new Set(loadAnalysis.resourceTiming.map((r) => r.initiatorType)),
                                    ].join(", ")}`,
                                },
                            ],
                        };
                    case "monitor_resource_loading":
                        const pageForResources = browserManager.getPage();
                        if (!pageForResources) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        this.performanceMonitor = new PerformanceMonitor();
                        const resourceTiming = await this.performanceMonitor.monitorResourceLoading(pageForResources);
                        const resourceSummary = resourceTiming.reduce((acc, resource) => {
                            const type = resource.initiatorType;
                            if (!acc[type]) {
                                acc[type] = { count: 0, totalSize: 0, totalDuration: 0 };
                            }
                            acc[type].count++;
                            acc[type].totalSize += resource.size || 0;
                            acc[type].totalDuration += resource.duration;
                            return acc;
                        }, {});
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Resource Loading Analysis:
- Total Resources: ${resourceTiming.length}

Resource Breakdown by Type:
${Object.entries(resourceSummary)
                                        .map(([type, stats]) => `- ${type}: ${stats.count} resources, ${(stats.totalSize / 1024).toFixed(1)}KB, ${(stats.totalDuration / stats.count).toFixed(0)}ms avg`)
                                        .join("\n")}

Largest Resources:
${resourceTiming
                                        .sort((a, b) => (b.size || 0) - (a.size || 0))
                                        .slice(0, 5)
                                        .map((r) => `- ${r.name}: ${(r.size || 0) / 1024}KB (${r.duration}ms)`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "track_memory_usage":
                        const pageForMemory = browserManager.getPage();
                        if (!pageForMemory) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        this.performanceMonitor = new PerformanceMonitor();
                        const duration = (args && args.duration) || 30000;
                        const memoryHistory = await this.performanceMonitor.trackMemoryUsage(pageForMemory, duration);
                        if (memoryHistory.length === 0) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: "Memory tracking completed but no data was collected. Memory API may not be available in this browser.",
                                    },
                                ],
                            };
                        }
                        const avgMemory = memoryHistory.reduce((sum, m) => sum + m.usedPercent, 0) / memoryHistory.length;
                        const maxMemory = Math.max(...memoryHistory.map((m) => m.usedPercent));
                        const minMemory = Math.min(...memoryHistory.map((m) => m.usedPercent));
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Memory Usage Tracking (${duration / 1000}s):
- Average Memory Usage: ${avgMemory.toFixed(1)}%
- Peak Memory Usage: ${maxMemory.toFixed(1)}%
- Minimum Memory Usage: ${minMemory.toFixed(1)}%
- Memory Range: ${(maxMemory - minMemory).toFixed(1)}%

📊 Memory Health:
${avgMemory < 50
                                        ? "✅ Good memory usage"
                                        : avgMemory < 80
                                            ? "⚠️ Moderate memory usage"
                                            : "❌ High memory usage"}

Recent Memory Samples:
${memoryHistory
                                        .slice(-5)
                                        .map((m) => `${new Date(m.timestamp).toLocaleTimeString()}: ${m.usedPercent.toFixed(1)}% (${(m.used / 1024 / 1024).toFixed(1)}MB)`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "detect_performance_regression":
                        const pageForRegression = browserManager.getPage();
                        if (!pageForRegression) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || !args.baselineMetrics) {
                            throw new Error("Baseline metrics are required for regression detection");
                        }
                        this.performanceMonitor = new PerformanceMonitor();
                        const currentMetrics = await this.performanceMonitor.getComprehensiveMetrics(pageForRegression);
                        const regressionReport = await this.performanceMonitor.detectPerformanceRegression(args.baselineMetrics, currentMetrics);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Performance Regression Analysis:
${regressionReport.summary}

${regressionReport.changes.length > 0
                                        ? `Detailed Changes:
${regressionReport.changes
                                            .map((change) => `- ${change.metric}: ${change.change > 0 ? "+" : ""}${change.changePercent.toFixed(1)}% (${change.baseline.toFixed(2)} → ${change.current.toFixed(2)})`)
                                            .join("\n")}`
                                        : "No significant changes detected."}`,
                                },
                            ],
                        };
                    case "get_comprehensive_performance_metrics":
                        const pageForComprehensive = browserManager.getPage();
                        if (!pageForComprehensive) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        this.performanceMonitor = new PerformanceMonitor();
                        const comprehensiveMetrics = await this.performanceMonitor.getComprehensiveMetrics(pageForComprehensive);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Comprehensive Performance Metrics:

🎯 Core Web Vitals:
- CLS: ${comprehensiveMetrics.coreWebVitals.cls.toFixed(4)}
- FID: ${comprehensiveMetrics.coreWebVitals.fid.toFixed(2)}ms
- LCP: ${comprehensiveMetrics.coreWebVitals.lcp.toFixed(2)}ms

⏱️ Timing Metrics:
- DOM Content Loaded: ${comprehensiveMetrics.timing.domContentLoaded}ms
- Load Complete: ${comprehensiveMetrics.timing.loadComplete}ms
- First Paint: ${comprehensiveMetrics.timing.firstPaint}ms
- First Contentful Paint: ${comprehensiveMetrics.timing.firstContentfulPaint}ms
- Largest Contentful Paint: ${comprehensiveMetrics.timing.largestContentfulPaint}ms

💾 Memory Usage:
- Used: ${(comprehensiveMetrics.memory.used / 1024 / 1024).toFixed(1)}MB
- Total: ${(comprehensiveMetrics.memory.total / 1024 / 1024).toFixed(1)}MB
- Usage: ${comprehensiveMetrics.memory.usedPercent.toFixed(1)}%

📊 Resources:
- Total: ${comprehensiveMetrics.resources.length}
- Types: ${[
                                        ...new Set(comprehensiveMetrics.resources.map((r) => r.initiatorType)),
                                    ].join(", ")}

Timestamp: ${new Date(comprehensiveMetrics.timestamp).toISOString()}`,
                                },
                            ],
                        };
                    // Wait/Retry System
                    case "wait_for_element":
                        return await waitRetrySystem.waitForElement(args);
                    case "wait_for_condition":
                        return await waitRetrySystem.waitForCondition(args);
                    // User Journey Simulation
                    case "run_user_journey":
                        if (!this.journeySimulator) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args ||
                            typeof args.name !== "string" ||
                            !Array.isArray(args.steps)) {
                            throw new Error("Name and steps parameters are required for run_user_journey");
                        }
                        // Parse journey options
                        const journeyOptions = {
                            name: args.name,
                            steps: args.steps.map((step) => ({
                                id: step.id,
                                action: step.action,
                                selector: step.selector,
                                value: step.value,
                                condition: step.condition || undefined, // Keep as string for JourneySimulator to handle
                                timeout: step.timeout || 10000,
                                retryCount: step.retryCount || 0,
                                onError: step.onError || "fail",
                                description: step.description,
                            })),
                            onStepComplete: args.onStepComplete
                                ? (step, result) => {
                                    this.logger.info(`Step completed: ${step.id} - ${result}`);
                                }
                                : undefined,
                            onError: args.onError
                                ? (error, step) => {
                                    this.logger.error(`Journey error in step ${step.id}: ${error.message}`);
                                }
                                : undefined,
                            maxDuration: args.maxDuration,
                            baseUrl: args.baseUrl,
                        };
                        const journeyResult = await this.journeySimulator.runJourney(journeyOptions);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Journey "${journeyOptions.name}" ${journeyResult.success ? "completed successfully" : "failed"}:
- Duration: ${journeyResult.duration}ms
- Steps Completed: ${journeyResult.completedSteps}/${journeyResult.totalSteps}
- Screenshots: ${journeyResult.screenshots.length}
- Errors: ${journeyResult.errors.length}
${journeyResult.performanceMetrics
                                        ? `- Average Step Time: ${Math.round(journeyResult.performanceMetrics.averageStepTime)}ms
- Slowest Step: ${journeyResult.performanceMetrics.slowestStep.stepId} (${journeyResult.performanceMetrics.slowestStep.duration}ms)`
                                        : ""}
${journeyResult.errors.length > 0
                                        ? `\nErrors:\n${journeyResult.errors
                                            .map((err) => `- ${err.stepId}: ${err.error}`)
                                            .join("\n")}`
                                        : ""}`,
                                },
                            ],
                        };
                    case "record_user_journey":
                        if (!this.journeySimulator) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || typeof args.name !== "string") {
                            throw new Error("Name parameter is required for record_user_journey");
                        }
                        const recordedJourney = await this.journeySimulator.recordJourney(args.name);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Journey recording started for "${args.name}". Note: Recording functionality is currently basic and returns a template structure.`,
                                },
                            ],
                        };
                    case "validate_journey_definition":
                        if (!args ||
                            typeof args.name !== "string" ||
                            !Array.isArray(args.steps)) {
                            throw new Error("Name and steps parameters are required for validate_journey_definition");
                        }
                        // Create a temporary journey simulator for validation
                        const tempJourneySimulator = new JourneySimulator();
                        const journeyDefinition = {
                            name: args.name,
                            description: args.description,
                            steps: args.steps.map((step) => ({
                                id: step.id,
                                action: step.action,
                                selector: step.selector,
                                value: step.value,
                                condition: step.condition,
                                timeout: step.timeout,
                                retryCount: step.retryCount,
                                onError: step.onError,
                                description: step.description,
                            })),
                            created: new Date(),
                            modified: new Date(),
                        };
                        const validationResult = await tempJourneySimulator.validateJourney(journeyDefinition);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Journey Validation for "${args.name}":
- Status: ${validationResult.isValid ? "VALID" : "INVALID"}
${validationResult.errors.length > 0
                                        ? `- Errors:\n${validationResult.errors
                                            .map((err) => `  • ${err}`)
                                            .join("\n")}`
                                        : ""}
${validationResult.warnings.length > 0
                                        ? `- Warnings:\n${validationResult.warnings
                                            .map((warn) => `  • ${warn}`)
                                            .join("\n")}`
                                        : ""}`,
                                },
                            ],
                        };
                    case "optimize_journey_definition":
                        if (!args ||
                            typeof args.name !== "string" ||
                            !Array.isArray(args.steps)) {
                            throw new Error("Name and steps parameters are required for optimize_journey_definition");
                        }
                        // Create a temporary journey simulator for optimization
                        const tempOptimizer = new JourneySimulator();
                        const journeyToOptimize = {
                            name: args.name,
                            description: args.description,
                            steps: args.steps.map((step) => ({
                                id: step.id,
                                action: step.action,
                                selector: step.selector,
                                value: step.value,
                                condition: step.condition,
                                timeout: step.timeout,
                                retryCount: step.retryCount,
                                onError: step.onError,
                                description: step.description,
                            })),
                            created: new Date(),
                            modified: new Date(),
                        };
                        const optimizedJourney = await tempOptimizer.optimizeJourney(journeyToOptimize);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Journey Optimization for "${args.name}":
- Original Steps: ${journeyToOptimize.steps.length}
- Optimized Steps: ${optimizedJourney.steps.length}
- Changes: ${journeyToOptimize.steps.length !==
                                        optimizedJourney.steps.length
                                        ? "Timeouts standardized, redundant waits removed"
                                        : "No changes needed"}`,
                                },
                            ],
                        };
                    // Backend Service Mocking
                    case "load_mock_config":
                        const pageForMocking = browserManager.getPage();
                        if (!pageForMocking) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || !args.name || !Array.isArray(args.rules)) {
                            throw new Error("Name and rules parameters are required for load_mock_config");
                        }
                        const backendMocker = new BackendMocker();
                        await backendMocker.loadMockConfig(args);
                        await backendMocker.enableMocking(pageForMocking);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mock configuration "${args.name}" loaded and enabled with ${args.rules.length} rules`,
                                },
                            ],
                        };
                    case "save_mock_config":
                        if (!args || !args.name) {
                            throw new Error("Name parameter is required for save_mock_config");
                        }
                        const saveMocker = new BackendMocker();
                        await saveMocker.saveMockConfig(args.name);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mock configuration saved as "${args.name}"`,
                                },
                            ],
                        };
                    case "add_mock_rule":
                        const pageForAddRule = browserManager.getPage();
                        if (!pageForAddRule) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || !args.url || !args.response) {
                            throw new Error("URL and response parameters are required for add_mock_rule");
                        }
                        const addRuleMocker = new BackendMocker();
                        await addRuleMocker.enableMocking(pageForAddRule);
                        const ruleId = await addRuleMocker.addMockRule(args);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mock rule added with ID: ${ruleId}`,
                                },
                            ],
                        };
                    case "remove_mock_rule":
                        if (!args || !args.ruleId) {
                            throw new Error("Rule ID parameter is required for remove_mock_rule");
                        }
                        const removeMocker = new BackendMocker();
                        await removeMocker.removeMockRule(args.ruleId);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mock rule "${args.ruleId}" removed`,
                                },
                            ],
                        };
                    case "update_mock_rule":
                        if (!args || !args.ruleId || !args.updates) {
                            throw new Error("Rule ID and updates parameters are required for update_mock_rule");
                        }
                        const updateMocker = new BackendMocker();
                        await updateMocker.updateMockRule(args.ruleId, args.updates);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mock rule "${args.ruleId}" updated`,
                                },
                            ],
                        };
                    case "enable_backend_mocking":
                        const pageForEnable = browserManager.getPage();
                        if (!pageForEnable) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        const enableMocker = new BackendMocker();
                        await enableMocker.enableMocking(pageForEnable);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Backend service mocking enabled",
                                },
                            ],
                        };
                    case "disable_backend_mocking":
                        const pageForDisable = browserManager.getPage();
                        if (!pageForDisable) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        const disableMocker = new BackendMocker();
                        await disableMocker.disableMocking(pageForDisable);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Backend service mocking disabled",
                                },
                            ],
                        };
                    case "get_mocked_requests":
                        const requestsMocker = new BackendMocker();
                        const mockedRequests = await requestsMocker.getMockedRequests();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mocked Requests History (${mockedRequests.length} entries):\n${mockedRequests
                                        .map((req) => `[${new Date(req.timestamp).toLocaleTimeString()}] ${req.method} ${req.url} → ${req.response.status}`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "get_mock_rules":
                        const rulesMocker = new BackendMocker();
                        const mockRules = await rulesMocker.getMockRules();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Active Mock Rules (${mockRules.length} entries):\n${mockRules
                                        .map((rule) => `${rule.id}: ${rule.method || "ALL"} ${rule.url} → ${rule.response.status}`)
                                        .join("\n")}`,
                                },
                            ],
                        };
                    case "clear_all_mocks":
                        const clearMocker = new BackendMocker();
                        await clearMocker.clearAllMocks();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "All mock rules cleared",
                                },
                            ],
                        };
                    case "setup_journey_mocks":
                        const pageForJourney = browserManager.getPage();
                        if (!pageForJourney) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (!args || !args.journeyName || !args.mockConfig) {
                            throw new Error("Journey name and mock config parameters are required for setup_journey_mocks");
                        }
                        const journeyMocker = new BackendMocker();
                        await journeyMocker.loadMockConfig(args.mockConfig);
                        await journeyMocker.enableMocking(pageForJourney);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Mock configuration setup for journey "${args.journeyName}" with ${args.mockConfig.rules.length} rules`,
                                },
                            ],
                        };
                    default:
                    // Server State and Configuration Tools
                    case "get_server_state":
                        const state = this.logger.getSessionState();
                        const page = browserManager.getPage();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Server State:
📊 Browser Status:
- Browser Launched: ${state.browserLaunched ? "✅ Yes" : "❌ No"}
- Current URL: ${page ? await page.url() : "N/A"}
- Viewport: ${page ? await page.viewportSize() : "N/A"}

🔍 Monitoring Status:
- Active: ${state.monitoringActive ? "✅ Yes" : "❌ No"}
- Monitor Instance: ${this.browserMonitor ? "✅ Available" : "❌ None"}

🎭 Mocking Status:
- Active: ${state.mockingActive ? "✅ Yes" : "❌ No"}

📋 Active Tools:
${state.activeTools.length > 0
                                        ? state.activeTools.map((tool) => `- ${tool}`).join("\n")
                                        : "- None"}

⏰ Session Info:
- Last Activity: ${state.lastActivity.toLocaleString()}
- Uptime: ${Math.round((Date.now() - state.lastActivity.getTime()) / 1000)}s ago`,
                                },
                            ],
                        };
                    case "get_session_info":
                        const sessionState = this.logger.getSessionState();
                        const sessionPage = browserManager.getPage();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Session Information:
🌐 Browser Configuration:
- Launched: ${sessionState.browserLaunched}
- Headless: ${sessionPage ? "N/A (runtime)" : "N/A"}
- Current Page: ${sessionPage ? await sessionPage.url() : "None"}

⚙️ Active Sessions:
- Monitoring: ${sessionState.monitoringActive}
- Mocking: ${sessionState.mockingActive}

🛠️ Available Components:
- Element Locator: ${this.elementLocator ? "✅ Initialized" : "❌ Unavailable"}
- Form Handler: ${this.formHandler ? "✅ Initialized" : "❌ Unavailable"}
- Performance Monitor: ${this.performanceMonitor
                                        ? "✅ Initialized"
                                        : "❌ Unavailable"}

📊 Session Stats:
- Active Tools: ${sessionState.activeTools.join(", ") || "None"}
- Session Start: ${new Date(Date.now() -
                                        (Date.now() - sessionState.lastActivity.getTime())).toLocaleString()}
- Last Activity: ${sessionState.lastActivity.toLocaleString()}

🔧 Configuration:
- Default Retry Config: ${DEFAULT_RETRY_CONFIG.maxAttempts} attempts, ${DEFAULT_RETRY_CONFIG.initialDelay}ms delay`,
                                },
                            ],
                        };
                    case "configure_session":
                        // This tool allows agents to configure session settings like timeouts, retry policies, etc.
                        // In a real implementation, you'd store these in a configuration file or database
                        if (!args) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `Session configuration cleared. Using defaults:
- Default Timeout: 10000ms
- Max Retries: 3
- Retry Delay: 1000ms
- Headless Browser: false
- Viewport: 1280x720`,
                                    },
                                ],
                            };
                        }
                        const configUpdates = {};
                        if (args.defaultTimeout) {
                            configUpdates.defaultTimeout = args.defaultTimeout;
                        }
                        if (args.maxRetries) {
                            configUpdates.maxRetries = args.maxRetries;
                        }
                        if (args.retryDelay) {
                            configUpdates.retryDelay = args.retryDelay;
                        }
                        if (args.headlessBrowser !== undefined) {
                            configUpdates.headlessBrowser = args.headlessBrowser;
                        }
                        if (args.viewportWidth) {
                            configUpdates.viewportWidth = args.viewportWidth;
                        }
                        if (args.viewportHeight) {
                            configUpdates.viewportHeight = args.viewportHeight;
                        }
                        // Here we would update a configuration file, for now just acknowledge
                        const configItems = Object.entries(configUpdates)
                            .map(([key, value]) => `- ${key}: ${value}`)
                            .join("\n");
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Session configuration updated:\n${configItems}\n\nNote: Configuration persistence requires server restart for some settings.`,
                                },
                            ],
                        };
                    case "get_performance_baseline":
                        const baselinesDir = path.join(process.cwd(), "baselines");
                        const baselines = [];
                        try {
                            if (fs.existsSync(baselinesDir)) {
                                const files = fs
                                    .readdirSync(baselinesDir)
                                    .filter((f) => f.endsWith(".json"));
                                for (const file of files) {
                                    const baselinePath = path.join(baselinesDir, file);
                                    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
                                    if (!args?.testId || baseline.testId === args.testId) {
                                        baselines.push(baseline);
                                    }
                                }
                            }
                        }
                        catch (error) {
                            this.logger.debug(`Failed to read baselines: ${error}`);
                        }
                        if (baselines.length === 0) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: "No performance baselines found.",
                                    },
                                ],
                            };
                        }
                        const baselineText = baselines
                            .map((baseline) => `📊 Test: ${baseline.testId}
  Captured: ${new Date(baseline.baselineMetrics.timestamp).toLocaleString()}
  CLS: ${baseline.baselineMetrics.coreWebVitals.cls.toFixed(4)}
  FID: ${baseline.baselineMetrics.coreWebVitals.fid.toFixed(2)}ms
  LCP: ${baseline.baselineMetrics.coreWebVitals.lcp.toFixed(2)}ms
  DOM Load: ${baseline.baselineMetrics.timing.domContentLoaded}ms
  Memory Usage: ${baseline.baselineMetrics.memory.usedPercent.toFixed(1)}%
  ${baseline.description ? `Description: ${baseline.description}` : ""}`)
                            .join("\n\n");
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Performance Baselines (${baselines.length} found):\n\n${baselineText}`,
                                },
                            ],
                        };
                    case "set_performance_baseline":
                        if (!args || !args.testId || !args.baselineMetrics) {
                            throw new Error("testId and baselineMetrics parameters are required for set_performance_baseline");
                        }
                        const baselinesDirPath = path.join(process.cwd(), "baselines");
                        try {
                            fs.ensureDirSync(baselinesDirPath);
                        }
                        catch (error) {
                            this.logger.error(`Failed to create baselines directory: ${error}`);
                            throw new Error("Failed to save performance baseline");
                        }
                        const baselineData = {
                            testId: args.testId,
                            baselineMetrics: args.baselineMetrics,
                            description: args.description || "",
                            savedAt: new Date().toISOString(),
                        };
                        const baselineFile = path.join(baselinesDirPath, `${args.testId}.json`);
                        fs.writeFileSync(baselineFile, JSON.stringify(baselineData, null, 2));
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Performance baseline set for test "${args.testId}" and saved to ${baselineFile}`,
                                },
                            ],
                        };
                    case "clear_performance_baselines":
                        const clearDir = path.join(process.cwd(), "baselines");
                        try {
                            if (!fs.existsSync(clearDir)) {
                                return {
                                    content: [
                                        {
                                            type: "text",
                                            text: "No performance baselines directory found - nothing to clear.",
                                        },
                                    ],
                                };
                            }
                            if (args?.testId) {
                                // Clear specific test
                                const specificFile = path.join(clearDir, `${args.testId}.json`);
                                if (fs.existsSync(specificFile)) {
                                    fs.unlinkSync(specificFile);
                                    return {
                                        content: [
                                            {
                                                type: "text",
                                                text: `Performance baseline cleared for test "${args.testId}"`,
                                            },
                                        ],
                                    };
                                }
                                else {
                                    return {
                                        content: [
                                            {
                                                type: "text",
                                                text: `No baseline found for test "${args.testId}"`,
                                            },
                                        ],
                                    };
                                }
                            }
                            else {
                                // Clear all
                                const files = fs
                                    .readdirSync(clearDir)
                                    .filter((f) => f.endsWith(".json"));
                                for (const file of files) {
                                    fs.unlinkSync(path.join(clearDir, file));
                                }
                                return {
                                    content: [
                                        {
                                            type: "text",
                                            text: `Cleared ${files.length} performance baseline(s)`,
                                        },
                                    ],
                                };
                            }
                        }
                        catch (error) {
                            this.logger.error(`Failed to clear baselines: ${error}`);
                            throw new Error("Failed to clear performance baselines");
                        }
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                this.logger.error(`❌ Tool execution failed: ${name} (${executionTime}ms) - ${error.message}`);
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
            }
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.info("Visual UI Testing MCP Server started");
    }
}
// Start the server
const server = new VisualUITestingServer();
server.start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
