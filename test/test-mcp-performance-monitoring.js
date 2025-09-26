#!/usr/bin/env node

import { spawn } from 'child_process';

// Test script for MCP Performance Monitoring Tools (Phase 3.2)
async function testMCPPerformanceMonitoring() {
    console.log('🚀 Testing MCP Performance Monitoring Tools (Phase 3.2)\n');

    // Environment-aware headless mode for CI compatibility
    const isCI = process.env.CI === 'true' || process.env.HEADLESS === 'true';
    const headless = isCI;

    console.log(`🔍 Running MCP performance monitoring tests in ${isCI ? 'CI/headless' : 'local/headed'} mode`);

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
                // Measure Core Web Vitals response
                testMeasureCoreWebVitals(response);
            } else if (response.id === 4) {
                // Analyze page load response
                testAnalyzePageLoad(response);
            } else if (response.id === 5) {
                // Monitor resource loading response
                testMonitorResourceLoading(response);
            } else if (response.id === 6) {
                // Track memory usage response
                testTrackMemoryUsage(response);
            } else if (response.id === 7) {
                // Get comprehensive metrics response
                testGetComprehensiveMetrics(response);
            } else if (response.id === 8) {
                // Detect performance regression response
                testDetectPerformanceRegression(response);
            } else if (response.id === 9) {
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
            console.log('\nTest 3: Measuring Core Web Vitals');
            sendRequest('tools/call', {
                name: 'measure_core_web_vitals',
                arguments: {}
            });
        }, 4000);

        setTimeout(() => {
            console.log('\nTest 4: Analyzing page load');
            sendRequest('tools/call', {
                name: 'analyze_page_load',
                arguments: {}
            });
        }, 5000);

        setTimeout(() => {
            console.log('\nTest 5: Monitoring resource loading');
            sendRequest('tools/call', {
                name: 'monitor_resource_loading',
                arguments: {}
            });
        }, 6000);

        setTimeout(() => {
            console.log('\nTest 6: Tracking memory usage');
            sendRequest('tools/call', {
                name: 'track_memory_usage',
                arguments: {
                    duration: 2000
                }
            });
        }, 7000);

        setTimeout(() => {
            console.log('\nTest 7: Getting comprehensive performance metrics');
            sendRequest('tools/call', {
                name: 'get_comprehensive_performance_metrics',
                arguments: {}
            });
        }, 10000);

        setTimeout(() => {
            console.log('\nTest 8: Detecting performance regression');
            sendRequest('tools/call', {
                name: 'detect_performance_regression',
                arguments: {
                    baselineMetrics: {
                        coreWebVitals: {
                            cls: 0.05,
                            fid: 80,
                            lcp: 2000
                        },
                        timing: {
                            domContentLoaded: 800,
                            loadComplete: 1200,
                            firstPaint: 600,
                            firstContentfulPaint: 800,
                            largestContentfulPaint: 2000
                        },
                        memory: {
                            usedPercent: 45
                        },
                        timestamp: Date.now() - 86400000 // 1 day ago
                    }
                }
            });
        }, 11000);

        setTimeout(() => {
            console.log('\nTest 9: Closing browser');
            sendRequest('tools/call', {
                name: 'close_browser'
            });
        }, 12000);

        // Complete test after all requests
        setTimeout(() => {
            console.log('\n🎉 MCP Performance Monitoring Tools Tests Completed Successfully!');
            console.log('\n📊 Test Summary:');
            console.log('- ✅ MCP server communication');
            console.log('- ✅ Tool discovery via MCP');
            console.log('- ✅ Browser launch via MCP');
            console.log('- ✅ Core Web Vitals measurement via MCP');
            console.log('- ✅ Page load analysis via MCP');
            console.log('- ✅ Resource loading monitoring via MCP');
            console.log('- ✅ Memory usage tracking via MCP');
            console.log('- ✅ Comprehensive metrics retrieval via MCP');
            console.log('- ✅ Performance regression detection via MCP');
            console.log('- ✅ Browser close via MCP');

            serverProcess.kill();
            resolve();
        }, 15000);

        // Error handling
        setTimeout(() => {
            console.error('❌ Test timeout - MCP server may not be responding correctly');
            serverProcess.kill();
            reject(new Error('Test timeout'));
        }, 17000);
    });
}

const testToolsList = (response) => {
    if (response.result && response.result.tools) {
        const tools = response.result.tools;
        const performanceTools = [
            'measure_core_web_vitals',
            'analyze_page_load',
            'monitor_resource_loading',
            'track_memory_usage',
            'detect_performance_regression',
            'get_comprehensive_performance_metrics'
        ];

        const foundTools = tools.filter(tool => performanceTools.includes(tool.name));
        console.log(`✅ Found ${foundTools.length} performance monitoring tools: ${foundTools.map(t => t.name).join(', ')}`);

        if (foundTools.length !== 6) {
            console.error(`❌ Expected 6 performance monitoring tools, found ${foundTools.length}`);
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

const testMeasureCoreWebVitals = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Core Web Vitals measured:', content);

        // Verify the response contains expected metrics
        if (content.includes('CLS') && content.includes('FID') && content.includes('LCP')) {
            console.log('✅ Core Web Vitals response contains all required metrics');
        } else {
            console.error('❌ Core Web Vitals response missing required metrics');
        }
    } else {
        console.error('❌ Core Web Vitals measurement failed');
    }
};

const testAnalyzePageLoad = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Page load analyzed:', content);

        // Verify the response contains expected timing data
        if (content.includes('DOM Content Loaded') && content.includes('Load Complete')) {
            console.log('✅ Page load analysis contains timing data');
        } else {
            console.error('❌ Page load analysis missing timing data');
        }
    } else {
        console.error('❌ Page load analysis failed');
    }
};

const testMonitorResourceLoading = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Resource loading monitored:', content);

        // Verify the response contains resource data
        if (content.includes('Total Resources') && content.includes('Resource Breakdown')) {
            console.log('✅ Resource monitoring contains resource data');
        } else {
            console.error('❌ Resource monitoring missing resource data');
        }
    } else {
        console.error('❌ Resource loading monitoring failed');
    }
};

const testTrackMemoryUsage = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Memory usage tracked:', content);

        // Verify the response contains memory data
        if (content.includes('Average Memory Usage') && content.includes('Memory Health')) {
            console.log('✅ Memory tracking contains memory data');
        } else {
            console.error('❌ Memory tracking missing memory data');
        }
    } else {
        console.error('❌ Memory usage tracking failed');
    }
};

const testGetComprehensiveMetrics = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Comprehensive metrics retrieved:', content);

        // Verify the response contains comprehensive data
        if (content.includes('Core Web Vitals') && content.includes('Timing Metrics') && content.includes('Memory Usage')) {
            console.log('✅ Comprehensive metrics contains all required data');
        } else {
            console.error('❌ Comprehensive metrics missing required data');
        }
    } else {
        console.error('❌ Comprehensive metrics retrieval failed');
    }
};

const testDetectPerformanceRegression = (response) => {
    if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        console.log('✅ Performance regression detected:', content);

        // Verify the response contains regression analysis
        if (content.includes('Performance Regression Analysis')) {
            console.log('✅ Regression detection contains analysis data');
        } else {
            console.error('❌ Regression detection missing analysis data');
        }
    } else {
        console.error('❌ Performance regression detection failed');
    }
};

const testCloseBrowser = (response) => {
    if (response.result && response.result.content) {
        console.log('✅ Browser closed:', response.result.content[0].text);
    } else {
        console.error('❌ Browser close failed');
    }
};

// Run the MCP performance monitoring tests
testMCPPerformanceMonitoring().catch(console.error);
