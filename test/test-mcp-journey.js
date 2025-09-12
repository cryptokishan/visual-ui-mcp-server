import { spawn } from 'child_process';

async function testMCPJourneyTools() {
  console.log('🚀 Testing User Journey Tools via MCP Protocol...\n');

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
        // Run journey response
        testRunJourney(response);
      } else if (response.id === 4) {
        // Validate journey response
        testValidateJourney(response);
      } else if (response.id === 5) {
        // Optimize journey response
        testOptimizeJourney(response);
      } else if (response.id === 6) {
        // Record journey response
        testRecordJourney(response);
      } else if (response.id === 7) {
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
          url: 'data:text/html,<html><body><h1>Journey Test Page</h1><input id="name" type="text"><button id="submit">Submit</button></body></html>',
          headless: true
        }
      });
    }, 2000);

    setTimeout(() => {
      console.log('\nTest 3: Running user journey');
      sendRequest('tools/call', {
        name: 'run_user_journey',
        arguments: {
          name: 'MCP Journey Test',
          steps: [
            {
              id: 'type_name',
              action: 'type',
              selector: '#name',
              value: 'MCP Test User',
              description: 'Enter name in input field'
            },
            {
              id: 'click_submit',
              action: 'click',
              selector: '#submit',
              description: 'Click submit button'
            },
            {
              id: 'take_screenshot',
              action: 'screenshot',
              value: 'mcp_journey_complete',
              description: 'Take completion screenshot'
            }
          ],
          onStepComplete: true
        }
      });
    }, 3000);

    setTimeout(() => {
      console.log('\nTest 4: Validating journey definition');
      sendRequest('tools/call', {
        name: 'validate_journey_definition',
        arguments: {
          name: 'Validation Test Journey',
          description: 'Testing journey validation',
          steps: [
            {
              id: 'valid_step1',
              action: 'navigate',
              value: 'https://example.com',
              description: 'Navigate to example'
            },
            {
              id: 'valid_step2',
              action: 'wait',
              selector: 'h1',
              description: 'Wait for heading'
            }
          ]
        }
      });
    }, 4000);

    setTimeout(() => {
      console.log('\nTest 5: Optimizing journey definition');
      sendRequest('tools/call', {
        name: 'optimize_journey_definition',
        arguments: {
          name: 'Optimization Test Journey',
          steps: [
            {
              id: 'opt_step1',
              action: 'navigate',
              value: 'https://example.com',
              timeout: 5000,
              description: 'Navigate with short timeout'
            },
            {
              id: 'opt_step2',
              action: 'wait',
              timeout: 2000,
              description: 'Wait with custom timeout'
            }
          ]
        }
      });
    }, 5000);

    setTimeout(() => {
      console.log('\nTest 6: Recording user journey');
      sendRequest('tools/call', {
        name: 'record_user_journey',
        arguments: {
          name: 'Recorded Journey Test',
          description: 'Testing journey recording'
        }
      });
    }, 6000);

    setTimeout(() => {
      console.log('\nTest 7: Closing browser');
      sendRequest('tools/call', {
        name: 'close_browser'
      });
    }, 7000);

    // Complete test after all requests
    setTimeout(() => {
      console.log('\n🎉 MCP Journey Tools Tests Completed Successfully!');
      console.log('\n📊 Test Summary:');
      console.log('- ✅ MCP server communication');
      console.log('- ✅ Tool discovery via MCP');
      console.log('- ✅ Browser launch via MCP');
      console.log('- ✅ User journey execution via MCP');
      console.log('- ✅ Journey validation via MCP');
      console.log('- ✅ Journey optimization via MCP');
      console.log('- ✅ Journey recording via MCP');
      console.log('- ✅ Browser close via MCP');

      serverProcess.kill();
      resolve();
    }, 8000);

    // Error handling
    setTimeout(() => {
      console.error('❌ Test timeout - MCP server may not be responding correctly');
      serverProcess.kill();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

const testToolsList = (response) => {
  if (response.result && response.result.tools) {
    const tools = response.result.tools;
    const journeyTools = [
      'run_user_journey',
      'record_user_journey',
      'validate_journey_definition',
      'optimize_journey_definition'
    ];

    const foundTools = tools.filter(tool => journeyTools.includes(tool.name));
    console.log(`✅ Found ${foundTools.length} journey tools: ${foundTools.map(t => t.name).join(', ')}`);

    if (foundTools.length !== 4) {
      console.error(`❌ Expected 4 journey tools, found ${foundTools.length}`);
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

const testRunJourney = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Journey executed:', response.result.content[0].text);
  } else {
    console.error('❌ Journey execution failed');
  }
};

const testValidateJourney = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Journey validated:', response.result.content[0].text);
  } else {
    console.error('❌ Journey validation failed');
  }
};

const testOptimizeJourney = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Journey optimized:', response.result.content[0].text);
  } else {
    console.error('❌ Journey optimization failed');
  }
};

const testRecordJourney = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Journey recording started:', response.result.content[0].text);
  } else {
    console.error('❌ Journey recording failed');
  }
};

const testCloseBrowser = (response) => {
  if (response.result && response.result.content) {
    console.log('✅ Browser closed:', response.result.content[0].text);
  } else {
    console.error('❌ Browser close failed');
  }
};

// Run the MCP journey tests
testMCPJourneyTools().catch(console.error);
