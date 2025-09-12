#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
// Import our tool modules
import { browserManager } from "./browser-manager.js";
import { devToolsMonitor } from "./dev-tools-monitor.js";
import { uiInteractions } from "./ui-interactions.js";
import { visualTesting } from "./visual-testing.js";
import { waitRetrySystem } from "./wait-retry.js";
class VisualUITestingServer {
    server;
    browserInstance = null;
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
                        return await browserManager.launchBrowser(args);
                    case "close_browser":
                        return await browserManager.closeBrowser();
                    // UI Interactions
                    case "click_element":
                        return await uiInteractions.clickElement(args);
                    case "type_text":
                        return await uiInteractions.typeText(args);
                    case "get_element_text":
                        return await uiInteractions.getElementText(args);
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
