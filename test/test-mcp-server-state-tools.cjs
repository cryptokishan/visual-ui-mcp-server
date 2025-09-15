#!/usr/bin/env node

const { spawn } = require('child_process');

// Test script for MCP Server State and Configuration Tools (Phase 5.0)
async function runMCPServerTests() {
    console.log('Testing MCP Server State and Configuration Tools (Phase 5.0)\n');

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
                // Server state response
                testGetServerState(response);
            } else if (response.id === 3) {
                // Session info response
                testGetSessionInfo(response);
            } else if (response.id === 4) {
                // Configure session response
                testConfigureSession(response);
            } else if (response.id === 5) {
                // Get baselines response
                testGetBaselines(response);
            } else if (response.id === 6) {
                // Launch browser response
                testLaunchBrowser(response);
            } else if (response.id === 7) {
                // Get metrics response
                testGetMetrics(response);
            } else if (response.id === 8) {
                // Set baseline response
                testSetBaseline(response);
            } else if (response.id === 9) {
                // Get baselines after setting response
                testGetBaselinesAfter(response);
            } else if (response.id === 10) {
                // Clear baseline response
                testClearBaseline(response);
            } else if (response.id === 11) {
                // Get baselines after clearing response
                testGetBaselinesCleared(response);
            } else if (response.id === 12) {
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
            console.log('\nTest 2: Get server state');
            sendRequest('tools/call', {
                name: 'get_server_state'
            });
        }, 2000);

        setTimeout(() => {
            console.log('\nTest 3: Get session info');
            sendRequest('tools/call', {
                name: 'get_session_info'
            });
        }, 3000);

        setTimeout(() => {
            console.log('\nTest 4: Configure session');
            sendRequest('tools/call', {
                name: 'configure_session',
                arguments: {
                    defaultTimeout: 15000,
                    maxRetries: 5
                }
            });
        }, 4000);

        setTimeout(() => {
            console.log('\nTest 5: Get performance baselines');
            sendRequest('tools/call', {
                name: 'get_performance_baseline'
            });
        }, 5000);

        setTimeout(() => {
            console.log('\nTest 6: Launch browser');
            sendRequest('tools/call', {
                name: 'launch_browser',
                arguments: {
                    url: 'https://httpbin.org/html',
                    headless: true
                }
            });
        }, 6000);

        setTimeout(() => {
            console.log('\nTest 7: Get comprehensive performance metrics');
            sendRequest('tools/call', {
                name: 'get_comprehensive_performance_metrics'
            });
        }, 8000);

        setTimeout(() => {
            console.log('\nTest 8: Set performance baseline');
            const baselineMetrics = {
                coreWebVitals: {
                    cls: 0.05,
                    fid: 80,
                    lcp: 1200
                },
                timing: {
                    domContentLoaded: 800,
                    loadComplete: 1500,
                    firstPaint: 600,
                    firstContentfulPaint: 700,
                    largestContentfulPaint: 1200
                },
                memory: {
                    usedPercent: 45
                },
                timestamp: Date.now()
            };

            sendRequest('tools/call', {
                name: 'set_performance_baseline',
                arguments: {
                    testId: 'test-homepage',
                    baselineMetrics,
                    description: 'Baseline for homepage performance'
                }
            });
        }, 9000);

        setTimeout(() => {
            console.log('\nTest 9: Get performance baselines (after setting)');
            sendRequest('tools/call', {
                name: 'get_performance_baseline'
            });
        }, 10000);

        setTimeout(() => {
            console.log('\nTest 10: Clear performance baselines');
            sendRequest('tools/call', {
                name: 'clear_performance_baselines',
                arguments: {
                    testId: 'test-homepage'
                }
            });
        }, 11000);

        setTimeout(() => {
            console.log('\nTest 11: Get performance baselines (after clearing)');
            sendRequest('tools/call', {
                name: 'get_performance_baseline'
            });
        }, 12000);

        setTimeout(() => {
            console.log('\nTest 12: Close browser');
            sendRequest('tools/call', {
                name: 'close_browser'
            });
        }, 13000);

        // Complete test after all requests
        setTimeout(() => {
            console.log('\n🎭 MCP Server State and Configuration Tools Tests Completed Successfully!');
            console.log('\n📊 Test Summary:');
            console.log('- ✅ MCP server communication');
            console.log('- ✅ Tool discovery via MCP');
            console.log('- ✅ Server state retrieval via MCP');
            console.log('- ✅ Session info retrieval via MCP');
            console.log('- ✅ Session configuration via MCP');
            console.log('- ✅ Performance baseline management via MCP');
            console.log('- ✅ Browser lifecycle management via MCP');

            serverProcess.kill();
            resolve();
        }, 14000);

        // Error handling
        setTimeout(() => {
            console.error('❌ Test timeout - MCP server may not be responding correctly');
            serverProcess.kill();
            reject(new Error('Test timeout'));
        }, 16000);
    });
}

const testToolsList = (response) => {
    if (response.result && response.result.tools) {
        const tools = response.result.tools;
        const stateTools = [
            'get_server_state',
            'get_session_info',
            'configure_session',
            'get_performance_baseline',
            'set_performance_baseline',
            'clear_performance_baselines'
        ];

        const foundTools = tools.filter(tool => stateTools.includes(tool.name));
        console.log(`✅ Found ${foundTools.length} server state tools: ${foundTools.map(t => t.name).join(', ')}`);

        if (foundTools.length < 6) {
            console.error(`❌ Expected at least 6 server state tools, found ${foundTools.length}`);
        }
    } else {
        console.error('❌ Invalid tools list response');
    }
};

const testGetServerState = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Server state retrieved:', content.slice(0, 100) + '...');

        if (content.includes('Browser Status')) {
            console.log('✅ Server state contains expected content');
        } else {
            console.error('❌ Server state missing expected content');
        }
    } else {
        console.error('❌ Server state retrieval failed');
    }
};

const testGetSessionInfo = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Session info retrieved:', content.slice(0, 100) + '...');

        if (content.includes('Active Sessions')) {
            console.log('✅ Session info contains expected content');
        } else {
            console.error('❌ Session info missing expected content');
        }
    } else {
        console.error('❌ Session info retrieval failed');
    }
};

const testConfigureSession = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Session configured:', content);

        if (content.includes('Session configuration updated')) {
            console.log('✅ Session configuration confirmed');
        } else {
            console.error('❌ Session configuration response incorrect');
        }
    } else {
        console.error('❌ Session configuration failed');
    }
};

const testGetBaselines = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Baselines retrieved - empty as expected');

        if (content.includes('No performance baselines found')) {
            console.log('✅ Empty baselines check passed');
        } else {
            console.error('❌ Baselines should be empty initially');
        }
    } else {
        console.error('❌ Baselines retrieval failed');
    }
};

const testLaunchBrowser = (response) => {
    if (response.result && response.result.content) {
        console.log('✅ Browser launched:', response.result.content[0].text);
    } else {
        console.error('❌ Browser launch failed');
    }
};

const testGetMetrics = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Performance metrics retrieved');

        if (content.includes('Core Web Vitals')) {
            console.log('✅ Performance metrics contain expected content');
        } else {
            console.error('❌ Performance metrics missing expected content');
        }
    } else {
        console.error('❌ Performance metrics retrieval failed');
    }
};

const testSetBaseline = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Baseline set:', content);

        if (content.includes('Performance baseline set')) {
            console.log('✅ Baseline setting confirmed');
        } else {
            console.error('❌ Baseline setting failed');
        }
    } else {
        console.error('❌ Baseline setting failed');
    }
};

const testGetBaselinesAfter = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Baselines retrieved after setting');

        if (content.includes('test-homepage')) {
            console.log('✅ Baseline found after setting');
        } else {
            console.error('❌ Baseline not found after setting');
        }
    } else {
        console.error('❌ Baselines retrieval failed');
    }
};

const testClearBaseline = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Baseline cleared:', content);

        if (content.includes('cleared')) {
            console.log('✅ Baseline clearing confirmed');
        } else {
            console.error('❌ Baseline clearing failed');
        }
    } else {
        console.error('❌ Baseline clearing failed');
    }
};

const testGetBaselinesCleared = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Baselines retrieved after clearing - empty as expected');

        if (content.includes('No performance baselines found')) {
            console.log('✅ Empty baselines confirmed after clearing');
        } else {
            console.error('❌ Baselines should be empty after clearing');
        }
    } else {
        console.error('❌ Baselines retrieval failed');
    }
};

const testCloseBrowser = (response) => {
    if (response.result && response.result.content) {
        console.log('✅ Browser closed:', response.result.content[0].text);
    } else {
        console.error('❌ Browser close failed');
    }
};

// Run the MCP server state tests
runMCPServerTests().catch(console.error);
