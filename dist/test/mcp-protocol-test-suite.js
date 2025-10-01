import { expect } from "@playwright/test";
import { getMCPTools, initializeMCPConnection, sendMCPRequest, } from "./mcp-test-setup";
/**
 * Comprehensive MCP Protocol Test Suite
 *
 * This suite provides systematic testing of all MCP server functionality
 * through the complete MCP protocol simulation.
 */
export class MCPProtocolTestSuite {
    server;
    validationResults = [];
    startTime = Date.now();
    constructor(server) {
        this.server = server;
    }
    /**
     * Validates MCP protocol initialization and basic communication
     */
    async testProtocolInitialization() {
        console.log("🔍 Testing MCP protocol initialization...");
        // Test connection initialization
        const initResult = await initializeMCPConnection(this.server);
        expect(initResult).toBeDefined();
        expect(initResult.protocolVersion).toBe("2024-11-05");
        expect(initResult.capabilities).toBeDefined();
        // Test tools listing
        const tools = await getMCPTools(this.server);
        expect(Array.isArray(tools.tools)).toBe(true);
        expect(tools.tools.length).toBeGreaterThan(0);
        console.log(`✅ Protocol initialization valid - ${tools.tools.length} tools available`);
    }
    /**
     * Tests state management and session handling
     */
    async testStateManagement() {
        console.log("🔍 Testing state management...");
        // Test get_server_state
        const serverState = await sendMCPRequest(this.server, "tools/call", {
            name: "get_server_state",
        });
        expect(serverState.result?.content?.[0]?.text).toBeDefined();
        // Test get_session_info
        const sessionInfo = await sendMCPRequest(this.server, "tools/call", {
            name: "get_session_info",
        });
        expect(sessionInfo.result?.content?.[0]?.text).toBeDefined();
        console.log("✅ State management validated");
    }
    /**
     * Comprehensive browser lifecycle testing
     */
    async testBrowserManagement() {
        console.log("🔍 Testing browser management...");
        const browserUrl = "data:text/html,<html><body><h1>Test Page</h1><p>Browser management test</p></body></html>";
        // Launch browser
        const launchResult = await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: browserUrl,
                headless: true,
            },
        });
        expect(launchResult.result).toBeDefined();
        // Verify state change
        const stateAfterLaunch = await sendMCPRequest(this.server, "tools/call", {
            name: "get_server_state",
        });
        expect(stateAfterLaunch.result?.content?.[0]?.text).toContain("browserLaunched");
        // Close browser
        const closeResult = await sendMCPRequest(this.server, "tools/call", {
            name: "close_browser",
        });
        expect(closeResult.result).toBeDefined();
        console.log("✅ Browser management validated");
    }
    /**
     * Tests all element interaction tools in sequence
     */
    async testElementInteractions() {
        console.log("🔍 Testing element interactions...");
        // Setup browser with test content
        const testHtml = `
      <html>
        <body>
          <h1 id="title">Test Page</h1>
          <input id="username" type="text" placeholder="Username" />
          <input id="password" type="password" placeholder="Password" />
          <button id="submit-btn">Submit</button>
          <div class="result"></div>
        </body>
      </html>
    `;
        const browserUrl = `data:text/html,${encodeURIComponent(testHtml)}`;
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: { url: browserUrl, headless: true },
        });
        try {
            // Test find_element
            const findResult = await sendMCPRequest(this.server, "tools/call", {
                name: "find_element",
                arguments: {
                    selectors: [{ type: "css", value: "#title", priority: 1 }],
                },
            });
            expect(findResult.result).toBeDefined();
            // Test type_text
            const typeResult = await sendMCPRequest(this.server, "tools/call", {
                name: "type_text",
                arguments: {
                    selector: "#username",
                    text: "testuser",
                },
            });
            expect(typeResult.result).toBeDefined();
            // Test get_element_text
            const textResult = await sendMCPRequest(this.server, "tools/call", {
                name: "get_element_text",
                arguments: {
                    selector: "#title",
                },
            });
            expect(textResult.result?.content?.[0]?.text).toContain("Test Page");
            // Test click_element
            const clickResult = await sendMCPRequest(this.server, "tools/call", {
                name: "click_element",
                arguments: {
                    selector: "#submit-btn",
                },
            });
            expect(clickResult.result).toBeDefined();
            console.log("✅ Element interactions validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Tests form interaction capabilities
     */
    async testFormInteractions() {
        console.log("🔍 Testing form interactions...");
        const formHtml = `
      <html>
        <body>
          <form id="test-form">
            <input name="username" type="text" id="username" />
            <input name="email" type="email" id="email" />
            <input name="terms" type="checkbox" id="terms" />
            <button type="submit" id="submit-btn">Submit</button>
          </form>
        </body>
      </html>
    `;
        const browserUrl = `data:text/html,${encodeURIComponent(formHtml)}`;
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: { url: browserUrl, headless: true },
        });
        try {
            // Test fill_form
            const fillResult = await sendMCPRequest(this.server, "tools/call", {
                name: "fill_form",
                arguments: {
                    fields: [
                        { selector: "#username", value: "testuser" },
                        { selector: "#email", value: "test@example.com" },
                        { selector: "#terms", value: true, type: "checkbox" },
                    ],
                },
            });
            expect(fillResult.result).toBeDefined();
            // Test submit_form
            const submitResult = await sendMCPRequest(this.server, "tools/call", {
                name: "submit_form",
                arguments: {
                    submitSelector: "#submit-btn",
                },
            });
            expect(submitResult.result).toBeDefined();
            console.log("✅ Form interactions validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Tests visual testing tools
     */
    async testVisualTesting() {
        console.log("🔍 Testing visual testing capabilities...");
        const visualHtml = `
      <html>
        <body>
          <h1>Visual Test Page</h1>
          <div style="background: red; width: 100px; height: 100px;"></div>
          <p>Test content</p>
        </body>
      </html>
    `;
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `data:text/html,${encodeURIComponent(visualHtml)}`,
                headless: true,
            },
        });
        try {
            // Test take_screenshot
            const screenshotResult = await sendMCPRequest(this.server, "tools/call", {
                name: "take_screenshot",
                arguments: {
                    name: "test_screenshot",
                    fullPage: false,
                },
            });
            expect(screenshotResult.result?.content?.[0]?.text).toContain("screenshot");
            // Test take_element_screenshot
            const elementScreenshot = await sendMCPRequest(this.server, "tools/call", {
                name: "take_element_screenshot",
                arguments: {
                    selector: "h1",
                    name: "heading_screenshot",
                },
            });
            expect(elementScreenshot.result).toBeDefined();
            console.log("✅ Visual testing validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Tests developer tools and monitoring
     */
    async testDeveloperTools() {
        console.log("🔍 Testing developer tools...");
        const devToolsHtml = `
      <html>
        <body>
          <script>console.log("Test log"); console.error("Test error");</script>
          <h1>Dev Tools Test</h1>
        </body>
      </html>
    `;
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `data:text/html,${encodeURIComponent(devToolsHtml)}`,
                headless: true,
            },
        });
        // Start monitoring
        await sendMCPRequest(this.server, "tools/call", {
            name: "start_browser_monitoring",
        });
        try {
            // Allow time for monitoring to collect data
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Test get_console_logs
            const consoleResult = await sendMCPRequest(this.server, "tools/call", {
                name: "get_console_logs",
            });
            expect(consoleResult.result).toBeDefined();
            // Test get_network_requests
            const networkResult = await sendMCPRequest(this.server, "tools/call", {
                name: "get_network_requests",
            });
            expect(networkResult.result).toBeDefined();
            console.log("✅ Developer tools validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "stop_browser_monitoring",
            });
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Tests performance monitoring capabilities
     */
    async testPerformanceMonitoring() {
        console.log("🔍 Testing performance monitoring...");
        const perfHtml = `
      <html>
        <head><title>Performance Test</title></head>
        <body><h1>Perf Test</h1><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" /></body>
      </html>
    `;
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `data:text/html,${encodeURIComponent(perfHtml)}`,
                headless: true,
            },
        });
        try {
            // Allow page to load
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Test measure_core_web_vitals
            const vitalsResult = await sendMCPRequest(this.server, "tools/call", {
                name: "measure_core_web_vitals",
            });
            expect(vitalsResult.result).toBeDefined();
            // Test capture_performance_metrics
            const metricsResult = await sendMCPRequest(this.server, "tools/call", {
                name: "capture_performance_metrics",
            });
            expect(metricsResult.result).toBeDefined();
            console.log("✅ Performance monitoring validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Tests backend mocking functionality
     */
    async testBackendMocking() {
        console.log("🔍 Testing backend mocking...");
        const mockHtml = `
      <html>
        <body>
          <div id="result"></div>
          <script>
            fetch('/api/test').then(r => r.text()).then(t => {
              document.getElementById('result').textContent = t;
            });
          </script>
        </body>
      </html>
    `;
        // Setup journey mocks first
        const setupMocksResult = await sendMCPRequest(this.server, "tools/call", {
            name: "setup_journey_mocks",
            arguments: {
                journeyId: "test-journey",
                mocks: [
                    {
                        url: "/api/test",
                        method: "GET",
                        response: { status: 200, body: "Mocked response" },
                    },
                ],
            },
        });
        expect(setupMocksResult.result).toBeDefined();
        // Enable backend mocking
        const enableResult = await sendMCPRequest(this.server, "tools/call", {
            name: "enable_backend_mocking",
            arguments: { journeyId: "test-journey" },
        });
        expect(enableResult.result).toBeDefined();
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `data:text/html,${encodeURIComponent(mockHtml)}`,
                headless: true,
            },
        });
        try {
            // Allow AJAX call to complete
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Test get_mocked_requests
            const mockedRequests = await sendMCPRequest(this.server, "tools/call", {
                name: "get_mocked_requests",
            });
            expect(mockedRequests.result).toBeDefined();
            console.log("✅ Backend mocking validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "disable_backend_mocking",
            });
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Tests user journey capabilities
     */
    async testJourneyCapabilities() {
        console.log("🔍 Testing journey capabilities...");
        const journeyDefinition = {
            name: "test-journey",
            steps: [
                {
                    name: "navigate",
                    action: "navigate",
                    url: "data:text/html,<html><body><h1>Journey Test</h1></body></html>",
                },
                {
                    name: "wait",
                    action: "wait",
                    selector: "h1",
                },
            ],
        };
        // Validate journey definition
        const validateResult = await sendMCPRequest(this.server, "tools/call", {
            name: "validate_journey_definition",
            arguments: { journey: journeyDefinition },
        });
        expect(validateResult.result?.content?.[0]?.text).toContain("valid");
        // Run user journey
        const runResult = await sendMCPRequest(this.server, "tools/call", {
            name: "run_user_journey",
            arguments: { journey: journeyDefinition },
        });
        expect(runResult.result).toBeDefined();
        console.log("✅ Journey capabilities validated");
    }
    /**
     * Tests waiting and conditional operations
     */
    async testWaitAndRetry() {
        console.log("🔍 Testing wait and retry capabilities...");
        const waitHtml = `
      <html>
        <body>
          <div id="delayed" style="display:none">Delayed Content</div>
          <script>
            setTimeout(() => {
              document.getElementById('delayed').style.display = 'block';
            }, 1000);
          </script>
        </body>
      </html>
    `;
        await sendMCPRequest(this.server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: `data:text/html,${encodeURIComponent(waitHtml)}`,
                headless: true,
            },
        });
        try {
            // Test wait_for_element
            const waitResult = await sendMCPRequest(this.server, "tools/call", {
                name: "wait_for_element",
                arguments: {
                    selector: "#delayed",
                    timeout: 5000,
                    visible: true,
                },
            });
            expect(waitResult.result?.content?.[0]?.text).toContain("Delayed Content");
            // Test wait_for_condition
            const conditionResult = await sendMCPRequest(this.server, "tools/call", {
                name: "wait_for_condition",
                arguments: {
                    condition: "document.querySelector('#delayed').textContent.includes('Delayed')",
                    timeout: 3000,
                },
            });
            expect(conditionResult.result).toBeDefined();
            console.log("✅ Wait and retry validated");
        }
        finally {
            await sendMCPRequest(this.server, "tools/call", {
                name: "close_browser",
            });
        }
    }
    /**
     * Runs comprehensive protocol compliance test
     */
    async runComprehensiveTestSuite() {
        console.log("🚀 Starting comprehensive MCP protocol test suite...");
        try {
            // Run all test categories
            await this.testProtocolInitialization();
            await this.testStateManagement();
            await this.testBrowserManagement();
            await this.testElementInteractions();
            await this.testFormInteractions();
            await this.testVisualTesting();
            await this.testDeveloperTools();
            await this.testPerformanceMonitoring();
            await this.testBackendMocking();
            await this.testJourneyCapabilities();
            await this.testWaitAndRetry();
            const duration = Date.now() - this.startTime;
            console.log(`✅ Comprehensive MCP protocol test suite completed in ${duration}ms`);
        }
        catch (error) {
            console.error("❌ Comprehensive test suite failed:", error);
            throw error;
        }
    }
    /**
     * Generates test coverage report
     */
    generateCoverageReport() {
        console.log("📊 MCP Protocol Test Coverage Report");
        console.log("=".repeat(50));
        const totalTests = this.validationResults.length;
        const passedTests = this.validationResults.filter((r) => r.success).length;
        const coverage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : "0.0";
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Coverage: ${coverage}%`);
        if (totalTests === 0) {
            console.log("⚠️ No tests were executed");
            return;
        }
        console.log("\nFailed Tests:");
        const failedTests = this.validationResults.filter((r) => !r.success);
        if (failedTests.length === 0) {
            console.log("✅ All tests passed!");
        }
        else {
            failedTests.forEach((test) => {
                console.log(`❌ ${test.name}: ${test.errors.join(", ")}`);
            });
        }
    }
}
/**
 * Factory function to create and configure test suite
 */
export async function createMCPProtocolTestSuite(server) {
    const suite = new MCPProtocolTestSuite(server);
    return suite;
}
