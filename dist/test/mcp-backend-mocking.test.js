import { expect, test } from "@playwright/test";
import { sendMCPRequest, getMCPTools, validateToolsAvailability } from "./mcp-test-setup";
test.describe("MCP Backend Mocking Tools", () => {
    test("MCP backend service mocking tools work end-to-end", async () => {
        // Use the globally available MCP server
        const server = global.mcpServer;
        expect(server).toBeDefined();
        // Test 1: Listing tools
        const tools = await getMCPTools(server);
        expect(tools.length).toBeGreaterThan(0);
        const backendMockingTools = [
            "load_mock_config",
            "save_mock_config",
            "add_mock_rule",
            "remove_mock_rule",
            "update_mock_rule",
            "enable_backend_mocking",
            "disable_backend_mocking",
            "get_mocked_requests",
            "get_mock_rules",
            "clear_all_mocks",
            "setup_journey_mocks",
        ];
        validateToolsAvailability(tools, backendMockingTools);
        // Test 2: Launching browser
        const browserResponse = await sendMCPRequest(server, "tools/call", {
            name: "launch_browser",
            arguments: {
                url: "https://httpbin.org/html",
                headless: true,
            },
        });
        expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
        // Test 3: Loading mock configuration
        const mockConfigResponse = await sendMCPRequest(server, "tools/call", {
            name: "load_mock_config",
            arguments: {
                name: "test-mock-config",
                description: "Test mock configuration for backend mocking",
                rules: [
                    {
                        url: "/api/auth/login",
                        method: "POST",
                        response: {
                            status: 200,
                            body: {
                                token: "mock-jwt-token-{{random}}",
                                user: { id: 1, name: "Test User" },
                                expiresIn: 3600,
                            },
                        },
                    },
                    {
                        url: "/api/user/profile",
                        method: "GET",
                        headers: { Authorization: "Bearer *" },
                        response: {
                            status: 200,
                            body: {
                                id: 1,
                                name: "John Doe",
                                email: "john@example.com",
                                preferences: { theme: "dark" },
                            },
                        },
                    },
                    {
                        url: "/api/data/*",
                        method: "GET",
                        response: {
                            status: 200,
                            body: {
                                data: "Mocked data response",
                                timestamp: "{{timestamp}}",
                            },
                            delay: 100,
                        },
                    },
                ],
                enabled: true,
            },
        });
        const configContent = mockConfigResponse.result.content[0].text;
        expect(configContent).toContain("test-mock-config");
        expect(configContent).toContain("3 rules");
        // Test 4: Adding individual mock rule
        const addRuleResponse = await sendMCPRequest(server, "tools/call", {
            name: "add_mock_rule",
            arguments: {
                url: "/api/test/endpoint",
                method: "GET",
                response: {
                    status: 201,
                    body: { message: "Test endpoint mocked" },
                },
            },
        });
        const addContent = addRuleResponse.result.content[0].text;
        expect(addContent).toContain("rule_");
        // Test 5: Getting mock rules
        const getRulesResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_mock_rules",
            arguments: {},
        });
        const rulesContent = getRulesResponse.result.content[0].text;
        expect(rulesContent).toContain("Active mock rules");
        // Test 6: Updating mock rule
        const updateRuleResponse = await sendMCPRequest(server, "tools/call", {
            name: "update_mock_rule",
            arguments: {
                ruleId: "rule_1",
                updates: {
                    response: {
                        status: 202,
                        body: { message: "Updated mock response" },
                    },
                },
            },
        });
        const updateContent = updateRuleResponse.result.content[0].text;
        expect(updateContent).toContain("rule_1");
        expect(updateContent).toContain("updated");
        // Test 7: Removing mock rule
        const removeRuleResponse = await sendMCPRequest(server, "tools/call", {
            name: "remove_mock_rule",
            arguments: {
                ruleId: "rule_1",
            },
        });
        const removeContent = removeRuleResponse.result.content[0].text;
        expect(removeContent).toContain("rule_1");
        expect(removeContent).toContain("removed");
        // Test 8: Getting mocked requests history
        const mockedRequestsResponse = await sendMCPRequest(server, "tools/call", {
            name: "get_mocked_requests",
            arguments: {},
        });
        const requestsContent = mockedRequestsResponse.result.content[0].text;
        expect(requestsContent).toContain("Mocked Requests History");
        // Test 9: Clearing all mocks
        const clearMocksResponse = await sendMCPRequest(server, "tools/call", {
            name: "clear_all_mocks",
            arguments: {},
        });
        const clearContent = clearMocksResponse.result.content[0].text;
        expect(clearContent).toContain("cleared");
        // Test 10: Closing browser
        const closeResponse = await sendMCPRequest(server, "tools/call", {
            name: "close_browser",
            arguments: {},
        });
        expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
    });
});
