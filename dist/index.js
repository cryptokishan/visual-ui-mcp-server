#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs-extra";
import * as path from "path";
// Import our tool modules
import { browserManager } from "./browser-manager.js";
import { BrowserMonitor } from "./browser-monitor.js";
import { devToolsMonitor } from "./dev-tools-monitor.js";
import { ElementLocator } from "./element-locator.js";
import { FormHandler } from "./form-handler.js";
import { uiInteractions } from "./ui-interactions.js";
import { visualTesting } from "./visual-testing.js";
import { waitRetrySystem } from "./wait-retry.js";
class VisualUITestingServer {
    server;
    browserInstance = null;
    elementLocator = null;
    formHandler = null;
    browserMonitor = null;
    constructor() {
        this.server = new Server({
            name: "visual-ui-mcp-server",
            version: "1.0.0",
        });
        this.setupToolHandlers();
        this.setupRequestHandlers();
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
                ],
            };
        });
    }
    setupRequestHandlers() {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                switch (name) {
                    // Browser Management
                    case "launch_browser":
                        const result = await browserManager.launchBrowser(args);
                        // Initialize ElementLocator and FormHandler with the current page
                        const page = browserManager.getPage();
                        if (page) {
                            this.elementLocator = new ElementLocator(page);
                            this.formHandler = new FormHandler(page, this.elementLocator);
                        }
                        return result;
                    case "close_browser":
                        return await browserManager.closeBrowser();
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
                        const monitoringPage = browserManager.getPage();
                        if (!monitoringPage) {
                            throw new Error("Browser not launched. Please launch browser first.");
                        }
                        if (this.browserMonitor && this.browserMonitor.isActive()) {
                            throw new Error("Browser monitoring is already active. Stop current monitoring first.");
                        }
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
                        await this.browserMonitor.startMonitoring(monitoringPage, {
                            consoleFilter,
                            networkFilter,
                            captureScreenshots: (args && args.captureScreenshots) || false,
                            maxEntries: (args && args.maxEntries) || 1000,
                        });
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Browser monitoring started successfully. Console messages, network requests, and JavaScript errors will be tracked.",
                                },
                            ],
                        };
                    case "stop_browser_monitoring":
                        if (!this.browserMonitor || !this.browserMonitor.isActive()) {
                            throw new Error("No active browser monitoring session to stop.");
                        }
                        const monitoringResult = await this.browserMonitor.stopMonitoring();
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
                                url: args.url ? new RegExp(args.url) : undefined,
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
- Navigation Timing: ${Object.entries(performanceMetrics.navigationTiming)
                                        .map(([key, value]) => `${key}: ${value}ms`)
                                        .join(", ")}
- Resource Count: ${performanceMetrics.resourceTiming.length}`,
                                },
                            ],
                        };
                    // Wait/Retry System
                    case "wait_for_element":
                        return await waitRetrySystem.waitForElement(args);
                    case "wait_for_condition":
                        return await waitRetrySystem.waitForCondition(args);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
            }
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Visual UI Testing MCP Server started");
    }
}
// Start the server
const server = new VisualUITestingServer();
server.start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
