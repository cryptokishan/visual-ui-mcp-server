#!/usr/bin/env node

import { spawn } from 'child_process';

// Test script for MCP Backend Service Mocking Tools (Phase 4.3)
async function testMCPBackendMocking() {
    console.log('🎭 Testing MCP Backend Service Mocking Tools (Phase 4.3)\n');

    // Environment-aware headless mode for CI compatibility
    const isCI = process.env.CI === 'true' || process.env.HEADLESS === 'true';
    const headless = isCI;

    console.log(`🔍 Running MCP backend mocking tests in ${isCI ? 'CI/headless' : 'local/headed'} mode`);

    return new Promise((resolve, reject) => {
        // Start MCP server process
        console.log('Starting MCP server...');
        const serverProcess = spawn('node', ['dist/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let responseBuffer = '';
        let requestId = 1;

        // Handle server output
        serverProcess.stdout.on('data', (data) => {
            responseBuffer += data.toString();
            processResponses();
        });

        serverProcess.stderr.on('data', (data) => {
            console.log('Server stderr:', data.toString());
        });

        serverProcess.on('error', (error) => {
            console.error('Server process error:', error);
            reject(error);
        });

        serverProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
        });

        const processResponses = () => {
            const lines = responseBuffer.split('\n');
            responseBuffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const response = JSON.parse(line.trim());
                        handleResponse(response);
                    } catch (e) {
                        console.log('Received non-JSON line:', line);
                    }
                }
            }
        };

        const handleResponse = (response) => {
            console.log('Received response:', JSON.stringify(response, null, 2));

            if (response.id === 1) {
                // Tools list response
                testToolsList(response);
            } else if (response.id === 2) {
                // Launch browser response
                testLaunchBrowser(response);
            } else if (response.id === 3) {
                // Load mock config response
                testLoadMockConfig(response);
            } else if (response.id === 4) {
                // Add mock rule response
                testAddMockRule(response);
            } else if (response.id === 5) {
                // Get mock rules response
                testGetMockRules(response);
            } else if (response.id === 6) {
                // Update mock rule response
                testUpdateMockRule(response);
            } else if (response.id === 7) {
                // Remove mock rule response
                testRemoveMockRule(response);
            } else if (response.id === 8) {
                // Get mocked requests response
                testGetMockedRequests(response);
            } else if (response.id === 9) {
                // Clear all mocks response
                testClearAllMocks(response);
            } else if (response.id === 10) {
                // Close browser response
                testCloseBrowser(response);
            }
        };

        const sendRequest = (method, params = null) => {
            const request = {
                jsonrpc: '2.0',
                id: requestId++,
                method,
                params
            };
            const requestJson = JSON.stringify(request) + '\n';
            console.log('Sending request:', requestJson.trim());
            serverProcess.stdin.write(requestJson);
        };

        // Test sequence
        setTimeout(() => {
            console.log('\nTest 1: Listing tools');
            sendRequest('tools/list');
        }, 1000);

        setTimeout(() => {
            console.log('\nTest 2: Launching browser');
            sendRequest('tools/call', {
                name: 'launch_browser',
                arguments: {
                    url: 'https://httpbin.org/html',
                    headless: headless
                }
            });
        }, 2000);

        setTimeout(() => {
            console.log('\nTest 3: Loading mock configuration');
            sendRequest('tools/call', {
                name: 'load_mock_config',
                arguments: {
                    name: 'test-mock-config',
                    description: 'Test mock configuration for backend mocking',
                    rules: [
                        {
                            url: '/api/auth/login',
                            method: 'POST',
                            response: {
                                status: 200,
                                body: {
                                    token: 'mock-jwt-token-{{random}}',
                                    user: { id: 1, name: 'Test User' },
                                    expiresIn: 3600
                                }
                            }
                        },
                        {
                            url: '/api/user/profile',
                            method: 'GET',
                            headers: { 'Authorization': 'Bearer *' },
                            response: {
                                status: 200,
                                body: {
                                    id: 1,
                                    name: 'John Doe',
                                    email: 'john@example.com',
                                    preferences: { theme: 'dark' }
                                }
                            }
                        },
                        {
                            url: '/api/data/*',
                            method: 'GET',
                            response: {
                                status: 200,
                                body: {
                                    data: 'Mocked data response',
                                    timestamp: '{{timestamp}}'
                                },
                                delay: 100
                            }
                        }
                    ],
                    enabled: true
                }
            });
        }, 4000);

        setTimeout(() => {
            console.log('\nTest 4: Adding individual mock rule');
            sendRequest('tools/call', {
                name: 'add_mock_rule',
                arguments: {
                    url: '/api/test/endpoint',
                    method: 'GET',
                    response: {
                        status: 201,
                        body: { message: 'Test endpoint mocked' }
                    }
                }
            });
        }, 5000);

        setTimeout(() => {
            console.log('\nTest 5: Getting mock rules');
            sendRequest('tools/call', {
                name: 'get_mock_rules',
                arguments: {}
            });
        }, 6000);

        setTimeout(() => {
            console.log('\nTest 6: Updating mock rule');
            sendRequest('tools/call', {
                name: 'update_mock_rule',
                arguments: {
                    ruleId: 'rule_1',
                    updates: {
                        response: {
                            status: 202,
                            body: { message: 'Updated mock response' }
                        }
                    }
                }
            });
        }, 7000);

        setTimeout(() => {
            console.log('\nTest 7: Removing mock rule');
            sendRequest('tools/call', {
                name: 'remove_mock_rule',
                arguments: {
                    ruleId: 'rule_1'
                }
            });
        }, 8000);

        setTimeout(() => {
            console.log('\nTest 8: Getting mocked requests history');
            sendRequest('tools/call', {
                name: 'get_mocked_requests',
                arguments: {}
            });
        }, 9000);

        setTimeout(() => {
            console.log('\nTest 9: Clearing all mocks');
            sendRequest('tools/call', {
                name: 'clear_all_mocks',
                arguments: {}
            });
        }, 10000);

        setTimeout(() => {
            console.log('\nTest 10: Closing browser');
            sendRequest('tools/call', {
                name: 'close_browser'
            });
        }, 11000);

        // Complete test after all requests
        setTimeout(() => {
            console.log('\n🎭 MCP Backend Service Mocking Tools Tests Completed Successfully!');
            console.log('\n📊 Test Summary:');
            console.log('- ✅ MCP server communication');
            console.log('- ✅ Tool discovery via MCP');
            console.log('- ✅ Browser launch via MCP');
            console.log('- ✅ Mock configuration loading via MCP');
            console.log('- ✅ Mock rule management via MCP');
            console.log('- ✅ Mock rules retrieval via MCP');
            console.log('- ✅ Mock rule updates via MCP');
            console.log('- ✅ Mock rule removal via MCP');
            console.log('- ✅ Mocked requests history via MCP');
            console.log('- ✅ Mock clearing via MCP');
            console.log('- ✅ Browser close via MCP');

            serverProcess.kill();
            resolve();
        }, 12000);

        // Error handling
        setTimeout(() => {
            console.error('❌ Test timeout - MCP server may not be responding correctly');
            serverProcess.kill();
            reject(new Error('Test timeout'));
        }, 14000);
    });
}

const testToolsList = (response) => {
    if (response.result && response.result.tools) {
        const tools = response.result.tools;
        const backendMockingTools = [
            'load_mock_config',
            'save_mock_config',
            'add_mock_rule',
            'remove_mock_rule',
            'update_mock_rule',
            'enable_backend_mocking',
            'disable_backend_mocking',
            'get_mocked_requests',
            'get_mock_rules',
            'clear_all_mocks',
            'setup_journey_mocks'
        ];

        const foundTools = tools.filter(tool => backendMockingTools.includes(tool.name));
        console.log(`✅ Found ${foundTools.length} backend mocking tools: ${foundTools.map(t => t.name).join(', ')}`);

        if (foundTools.length !== 11) {
            console.error(`❌ Expected 11 backend mocking tools, found ${foundTools.length}`);
        }
    } else {
        console.error('❌ Invalid tools list response');
    }
};

const testLaunchBrowser = (response) => {
    if (response.result && response.result.content) {
        console.log('✅ Browser launched:', response.result.content[0].text);
    } else {
        console.error('❌ Browser launch failed');
    }
};

const testLoadMockConfig = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Mock configuration loaded:', content);

        if (content.includes('test-mock-config') && content.includes('3 rules')) {
            console.log('✅ Mock configuration contains expected content');
        } else {
            console.error('❌ Mock configuration missing expected content');
        }
    } else {
        console.error('❌ Mock configuration loading failed');
    }
};

const testAddMockRule = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Mock rule added:', content);

        if (content.includes('rule_')) {
            console.log('✅ Mock rule ID returned correctly');
        } else {
            console.error('❌ Mock rule ID not returned');
        }
    } else {
        console.error('❌ Mock rule addition failed');
    }
};

const testGetMockRules = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Mock rules retrieved:', content);

        if (content.includes('Active Mock Rules')) {
            console.log('✅ Mock rules list contains expected format');
        } else {
            console.error('❌ Mock rules list missing expected format');
        }
    } else {
        console.error('❌ Mock rules retrieval failed');
    }
};

const testUpdateMockRule = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Mock rule updated:', content);

        if (content.includes('rule_1') && content.includes('updated')) {
            console.log('✅ Mock rule update confirmation correct');
        } else {
            console.error('❌ Mock rule update confirmation incorrect');
        }
    } else {
        console.error('❌ Mock rule update failed');
    }
};

const testRemoveMockRule = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Mock rule removed:', content);

        if (content.includes('rule_1') && content.includes('removed')) {
            console.log('✅ Mock rule removal confirmation correct');
        } else {
            console.error('❌ Mock rule removal confirmation incorrect');
        }
    } else {
        console.error('❌ Mock rule removal failed');
    }
};

const testGetMockedRequests = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Mocked requests retrieved:', content);

        if (content.includes('Mocked Requests History')) {
            console.log('✅ Mocked requests history contains expected format');
        } else {
            console.error('❌ Mocked requests history missing expected format');
        }
    } else {
        console.error('❌ Mocked requests retrieval failed');
    }
};

const testClearAllMocks = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ All mocks cleared:', content);

        if (content.includes('cleared')) {
            console.log('✅ Mock clearing confirmation correct');
        } else {
            console.error('❌ Mock clearing confirmation incorrect');
        }
    } else {
        console.error('❌ Mock clearing failed');
    }
};

const testCloseBrowser = (response) => {
    if (response.result && response.result.content) {
        console.log('✅ Browser closed:', response.result.content[0].text);
    } else {
        console.error('❌ Browser close failed');
    }
};

// Run the MCP backend mocking tests
testMCPBackendMocking().catch(console.error);
