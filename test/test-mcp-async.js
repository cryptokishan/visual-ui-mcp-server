#!/usr/bin/env node

import { spawn } from 'child_process';

// Test script demonstrating proper async MCP communication pattern
async function testAsyncMCP() {
  console.log('🚀 Testing MCP with Proper Async/Await Pattern\n');

  return new Promise((resolve, reject) => {
    // Start MCP server process
    console.log('Starting MCP server...');
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseBuffer = '';
    let requestId = 1;
    const pendingRequests = new Map();

    // Handle server output with proper async response handling
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

            // Resolve the corresponding pending request
            const pending = pendingRequests.get(response.id);
            if (pending) {
              pendingRequests.delete(response.id);
              if (response.error) {
                pending.reject(new Error(`MCP Error: ${response.error.message}`));
              } else {
                pending.resolve(response);
              }
            } else {
              console.log('Received response for unknown request ID:', response.id);
            }
          } catch (e) {
            console.log('Received non-JSON line:', line);
          }
        }
      }
    };

    // Properly async sendRequest that returns a Promise
    const sendRequest = (method, params = null) => {
      return new Promise((resolve, reject) => {
        const request = {
          jsonrpc: '2.0',
          id: requestId++,
          method,
          params
        };

        // Store the promise resolvers
        pendingRequests.set(request.id, { resolve, reject });

        const requestJson = JSON.stringify(request) + '\n';
        console.log('Sending request:', requestJson.trim());
        serverProcess.stdin.write(requestJson);

        // Add timeout for hung requests
        setTimeout(() => {
          if (pendingRequests.has(request.id)) {
            pendingRequests.delete(request.id);
            reject(new Error(`Request timeout for ${method}`));
          }
        }, 10000); // 10 second timeout
      });
    };

    // Async test execution with proper sequencing
    (async () => {
      try {
        console.log('\nTest 1: Listing tools');
        const toolsResponse = await sendRequest('tools/list');
        console.log('✅ Tools listed:', toolsResponse.result?.tools?.length || 0, 'tools available');

        console.log('\nTest 2: Launching browser');
        const browserResponse = await sendRequest('tools/call', {
          name: 'launch_browser',
          arguments: {
            url: 'data:text/html,<html><body><h1>Test Page</h1><button id="test-btn">Click me</button></body></html>',
            headless: true
          }
        });
        console.log('✅ Browser launched:', browserResponse.result?.content?.[0]?.text);

        console.log('\nTest 3: Finding element');
        const elementResponse = await sendRequest('tools/call', {
          name: 'find_element',
          arguments: {
            selector: '#test-btn',
            selectorType: 'css',
            timeout: 5000
          }
        });
        console.log('✅ Element found:', elementResponse.result?.content?.[0]?.text);

        console.log('\nTest 4: Clicking element');
        const clickResponse = await sendRequest('tools/call', {
          name: 'click_element',
          arguments: {
            selector: '#test-btn',
            timeout: 5000
          }
        });
        console.log('✅ Element clicked:', clickResponse.result?.content?.[0]?.text);

        console.log('\nTest 5: Taking screenshot');
        const screenshotResponse = await sendRequest('tools/call', {
          name: 'take_screenshot',
          arguments: {
            name: 'test-screenshot',
            fullPage: false
          }
        });
        console.log('✅ Screenshot taken:', screenshotResponse.result?.content?.[0]?.text);

        console.log('\nTest 6: Closing browser');
        const closeResponse = await sendRequest('tools/call', {
          name: 'close_browser'
        });
        console.log('✅ Browser closed:', closeResponse.result?.content?.[0]?.text);

        console.log('\n🎉 Async MCP Tests Completed Successfully!');
        console.log('\n📊 Test Summary:');
        console.log('- ✅ Proper async/await request handling');
        console.log('- ✅ No setTimeout delays - true sequential execution');
        console.log('- ✅ Better error handling and timeouts');
        console.log('- ✅ No race conditions');
        console.log('- ✅ More reliable and easier to debug');

      } catch (error) {
        console.error('❌ Test failed:', error.message);

        // Clean up any pending requests
        for (const [id, pending] of pendingRequests) {
          pending.reject(new Error('Test terminated'));
        }
        pendingRequests.clear();
      } finally {
        // Clean up server process
        if (!serverProcess.killed) {
          serverProcess.kill();
          console.log('Server process terminated');
        }
        resolve();
      }
    })();
  });
}

// Run the async MCP tests
testAsyncMCP().catch(console.error);
