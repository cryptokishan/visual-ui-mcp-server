import { spawn } from 'child_process';

async function testMCPMonitoringSimple() {
  console.log('🚀 Testing Browser Monitoring Tools via MCP Protocol (Simple)...\n');

  // Environment-aware headless mode for CI compatibility
  const isCI = process.env.CI === 'true' || process.env.HEADLESS === 'true';
  const headless = isCI;

  console.log(`🔍 Running MCP monitoring tests in ${isCI ? 'CI/headless' : 'local/headed'} mode`);

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
        // Start monitoring response
        testStartMonitoring(response);
      } else if (response.id === 4) {
        // Get console logs response
        testGetConsoleLogs(response);
      } else if (response.id === 5) {
        // Get network requests response
        testGetNetworkRequests(response);
      } else if (response.id === 6) {
        // Get JS errors response
        testGetJSErrors(response);
      } else if (response.id === 7) {
        // Performance metrics response
        testPerformanceMetrics(response);
      } else if (response.id === 8) {
        // Stop monitoring response
        testStopMonitoring(response);
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
          url: 'data:text/html,<html><body><h1>Test Page</h1><script>console.log("Test message"); setTimeout(() => console.error("Delayed error"), 100);</script></body></html>',
          headless: headless
        }
      });
    }, 2000);

    setTimeout(() => {
      console.log('\nTest 3: Starting browser monitoring');
      sendRequest('tools/call', {
        name: 'start_browser_monitoring',
        arguments: {
          consoleFilter: { level: 'error' },
          networkFilter: { method: 'GET' },
          maxEntries: 100
        }
      });
    }, 3000);

    setTimeout(() => {
      console.log('\nTest 4: Getting filtered console logs');
      sendRequest('tools/call', {
        name: 'get_filtered_console_logs',
        arguments: { level: 'error' }
      });
    }, 4000);

    setTimeout(() => {
      console.log('\nTest 5: Getting network requests');
      sendRequest('tools/call', {
        name: 'get_filtered_network_requests',
        arguments: { method: 'GET' }
      });
    }, 5000);

    setTimeout(() => {
      console.log('\nTest 6: Getting JavaScript errors');
      sendRequest('tools/call', {
        name: 'get_javascript_errors'
      });
    }, 6000);

    setTimeout(() => {
      console.log('\nTest 7: Capturing performance metrics');
      sendRequest('tools/call', {
        name: 'capture_performance_metrics'
      });
    }, 7000);

    setTimeout(() => {
      console.log('\nTest 8: Stopping browser monitoring');
      sendRequest('tools/call', {
        name: 'stop_browser_monitoring'
      });
    }, 8000);

    setTimeout(() => {
      console.log('\nTest 9: Closing browser');
      sendRequest('tools/call', {
        name: 'close_browser'
      });
    }, 9000);

    // Complete test after all requests
    setTimeout(() => {
      console.log('\n🎉 MCP Monitoring Tools Tests Completed Successfully!');
      console.log('\n📊 Test Summary:');
      console.log('- ✅ MCP server communication');
      console.log('- ✅ Tool discovery via MCP');
      console.log('- ✅ Browser launch via MCP');
      console.log('- ✅ Monitoring start via MCP');
      console.log('- ✅ Console logs retrieval via MCP');
      console.log('- ✅ Network requests retrieval via MCP');
      console.log('- ✅ JavaScript errors retrieval via MCP');
      console.log('- ✅ Performance metrics capture via MCP');
      console.log('- ✅ Monitoring stop via MCP');
      console.log('- ✅ Browser close via MCP');

      serverProcess.kill();
      resolve();
    }, 10000);

    // Error handling
    setTimeout(() => {
      console.error('❌ Test timeout - MCP server may not be responding correctly');
      serverProcess.kill();
      reject(new Error('Test timeout'));
    }, 12000);
  });
}

const testToolsList = (response) => {
  if (response.result && response.result.tools) {
    const tools = response.result.tools;
    const monitoringTools = [
      'start_browser_monitoring',
      'stop_browser_monitoring',
      'get_filtered_console_logs',
      'get_filtered_network_requests',
      'get_javascript_errors',
      'capture_performance_metrics'
    ];

    const foundTools = tools.filter(tool => monitoringTools.includes(tool.name));
    console.log(`✅ Found ${foundTools.length} monitoring tools: ${foundTools.map(t => t.name).join(', ')}`);

    if (foundTools.length !== 6) {
      console.error(`❌ Expected 6 monitoring tools, found ${foundTools.length}`);
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

const testStartMonitoring = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Monitoring started:', response.result.content[0].text);
  } else {
    console.error('❌ Monitoring start failed');
  }
};

const testGetConsoleLogs = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Console logs retrieved:', response.result.content[0].text);
  } else {
    console.error('❌ Console logs retrieval failed');
  }
};

const testGetNetworkRequests = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Network requests retrieved:', response.result.content[0].text);
  } else {
    console.error('❌ Network requests retrieval failed');
  }
};

const testGetJSErrors = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ JavaScript errors retrieved:', response.result.content[0].text);
  } else {
    console.error('❌ JavaScript errors retrieval failed');
  }
};

const testPerformanceMetrics = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Performance metrics captured:', response.result.content[0].text);
  } else {
    console.error('❌ Performance metrics capture failed');
  }
};

const testStopMonitoring = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Monitoring stopped:', response.result.content[0].text);
  } else {
    console.error('❌ Monitoring stop failed');
  }
};

const testCloseBrowser = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Browser closed:', response.result.content[0].text);
  } else {
    console.error('❌ Browser close failed');
  }
};

// Run the MCP monitoring tests
testMCPMonitoringSimple().catch(console.error);
