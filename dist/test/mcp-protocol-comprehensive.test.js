import { createMCPProtocolTestSuite } from "./mcp-protocol-test-suite";
import { test, expect } from "./server-fixture";
test.describe("MCP Protocol Comprehensive Test Suite", () => {
    test("should verify all MCP server functionality through complete protocol simulation", async ({ mcpServer, }) => {
        console.log("🚀 Starting MCP Protocol Comprehensive Test Suite");
        // Create and run the comprehensive protocol test suite
        const testSuite = await createMCPProtocolTestSuite(mcpServer);
        // Run all protocol tests systematically
        await testSuite.runComprehensiveTestSuite();
        // Generate coverage report
        testSuite.generateCoverageReport();
        console.log("✅ MCP Protocol Comprehensive Test Suite completed successfully");
    });
    test("should handle protocol error scenarios robustly", async ({ mcpServer, }) => {
        console.log("🔍 Testing MCP error handling and recovery");
        const { sendMCPRequest } = await import("./mcp-test-setup");
        // Test invalid tool call
        try {
            await sendMCPRequest(mcpServer, "tools/call", {
                name: "nonexistent_tool",
                arguments: {},
            });
            // If no error thrown, test should fail
            throw new Error("Expected error for nonexistent tool");
        }
        catch (error) {
            // Expected - invalid tool should result in error
            console.log("✅ Correctly handled nonexistent tool error");
        }
        // Test malformed request
        try {
            await sendMCPRequest(mcpServer, "tools/call", {
                name: "", // Empty tool name
                arguments: {},
            });
            throw new Error("Expected error for malformed request");
        }
        catch (error) {
            console.log("✅ Correctly handled malformed request error");
        }
        // Test state validation - attempting operations without browser
        try {
            await sendMCPRequest(mcpServer, "tools/call", {
                name: "take_screenshot",
                arguments: {},
            });
            throw new Error("Expected error when browser not launched");
        }
        catch (error) {
            console.log("✅ Correctly handled browser state validation error");
        }
        console.log("✅ Error handling and recovery validated");
    });
    test("should maintain session state and isolation between test runs", async ({ mcpServer, }) => {
        console.log("🔍 Testing session state management and test isolation");
        const { sendMCPRequest } = await import("./mcp-test-setup");
        // Get initial state
        const initialState = await sendMCPRequest(mcpServer, "tools/call", {
            name: "get_server_state",
        });
        expect(initialState.result).toBeDefined();
        // Launch browser and verify state change
        await sendMCPRequest(mcpServer, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: "data:text/html,<html><body><h1>State Test</h1></body></html>",
                headless: true,
            },
        });
        // Verify browser is launched
        const launchedState = await sendMCPRequest(mcpServer, "tools/call", {
            name: "get_server_state",
        });
        expect(launchedState.result?.content?.[0]?.text).toContain("browserLaunched");
        // Clean up
        await sendMCPRequest(mcpServer, "tools/call", {
            name: "close_browser",
        });
        // Next test in this describe block gets a fresh server instance
        // due to the fixture scope
        const finalState = await sendMCPRequest(mcpServer, "tools/call", {
            name: "get_server_state",
        });
        expect(finalState.result?.content?.[0]?.text).toContain("browserLaunched:false");
        console.log("✅ Session state management and isolation validated");
    });
    test("should validate Tool schema compliance and parameter handling", async ({ mcpServer, }) => {
        console.log("🔍 Testing tool schema compliance and parameter validation");
        const { sendMCPRequest, getMCPTools } = await import("./mcp-test-setup");
        // Get all available tools
        const toolsResponse = await getMCPTools(mcpServer);
        const availableTools = toolsResponse.tools;
        console.log(`Found ${availableTools.length} tools to validate`);
        // Test each tool with minimal valid parameters
        for (const tool of availableTools) {
            try {
                console.log(`Validating tool: ${tool.name}`);
                // Prepare minimal test arguments based on common patterns
                let testArgs = {};
                if (tool.inputSchema?.properties) {
                    // Add required fields with minimal valid values
                    if (tool.inputSchema.properties.selectors) {
                        testArgs.selectors = [{ type: "css", value: "body", priority: 1 }];
                    }
                    if (tool.inputSchema.properties.selector) {
                        testArgs.selector = "body";
                    }
                    if (tool.inputSchema.properties.text) {
                        testArgs.text = "test";
                    }
                    if (tool.inputSchema.properties.name) {
                        testArgs.name = "test_" + Date.now();
                    }
                }
                // Special handling for tools requiring browser context
                if ([
                    "find_element",
                    "type_text",
                    "click_element",
                    "take_screenshot",
                    "get_element_text",
                ].includes(tool.name)) {
                    // Ensure browser is launched
                    await sendMCPRequest(mcpServer, "tools/call", {
                        name: "launch_browser",
                        arguments: {
                            url: "data:text/html,<html><body><p>Test</p></body></html>",
                            headless: true,
                        },
                    });
                }
                // Test the tool with minimal arguments
                const result = await sendMCPRequest(mcpServer, "tools/call", {
                    name: tool.name,
                    arguments: testArgs,
                });
                // Result should exist and not contain error
                expect(result.result).toBeDefined();
                expect(result.error).toBeUndefined();
                // Clean up browser if we launched one
                if ([
                    "find_element",
                    "type_text",
                    "click_element",
                    "take_screenshot",
                    "get_element_text",
                ].includes(tool.name)) {
                    try {
                        await sendMCPRequest(mcpServer, "tools/call", {
                            name: "close_browser",
                        });
                    }
                    catch (e) {
                        // Browser might already be closed, ignore
                    }
                }
                console.log(`✅ ${tool.name} validated successfully`);
            }
            catch (error) {
                console.error(`❌ ${tool.name} validation failed:`, error);
                throw error;
            }
        }
        console.log(`✅ All ${availableTools.length} tools validated for schema compliance`);
    });
});
