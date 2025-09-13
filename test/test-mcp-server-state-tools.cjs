#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function runMCPServerTests() {
  console.log('Testing MCP Server State and Configuration Tools (Phase 5.0)\n');

  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: path.join(__dirname, '..')
  });

  let messageId = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  function sendRequest(method, params = null) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: ++messageId,
        method,
        params
      };

      const responseHandler = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            serverProcess.stdout.removeListener('data', responseHandler);
            resolve(response);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      serverProcess.stdout.on('data', responseHandler);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  function test(name, testFn) {
    return new Promise(async (resolve) => {
      console.log(`Test: ${name}`);
      try {
        await testFn();
        console.log('✅ PASSED\n');
        testsPassed++;
      } catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        testsFailed++;
      }
      resolve();
    });
  }

  try {
    // Test 1: List tools to ensure our new tools are available
    await test('List Tools', async () => {
      const response = await sendRequest('tools/list');
      const toolNames = response.result.tools.map(t => t.name);

      const requiredTools = [
        'get_server_state',
        'get_session_info',
        'configure_session',
        'get_performance_baseline',
        'set_performance_baseline',
        'clear_performance_baselines'
      ];

      for (const tool of requiredTools) {
        if (!toolNames.includes(tool)) {
          throw new Error(`Tool '${tool}' not found in available tools`);
        }
      }

      console.log(`Found ${toolNames.length} tools including: ${requiredTools.join(', ')}`);
    });

    // Test 2: Get server state (should work without browser)
    await test('Get Server State', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_server_state'
      });

      const content = response.result.content[0].text;
      if (!content.includes('Browser Status') || !content.includes('Session Info')) {
        throw new Error('Server state response does not contain expected sections');
      }

      console.log('Server state retrieved successfully');
    });

    // Test 3: Get session info (should work without browser)
    await test('Get Session Info', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_session_info'
      });

      const content = response.result.content[0].text;
      if (!content.includes('Browser Configuration') || !content.includes('Active Sessions')) {
        throw new Error('Session info response does not contain expected sections');
      }

      console.log('Session info retrieved successfully');
    });

    // Test 4: Configure session
    await test('Configure Session', async () => {
      const response = await sendRequest('tools/call', {
        name: 'configure_session',
        arguments: {
          defaultTimeout: 15000,
          maxRetries: 5
        }
      });

      const content = response.result.content[0].text;
      if (!content.includes('Session configuration updated')) {
        throw new Error('Session configuration response incorrect');
      }

      if (!content.includes('defaultTimeout: 15000') || !content.includes('maxRetries: 5')) {
        throw new Error('Configuration values not shown in response');
      }

      console.log('Session configured successfully');
    });

    // Test 5: Get performance baselines (should be empty initially)
    await test('Get Performance Baselines', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_performance_baseline'
      });

      const content = response.result.content[0].text;
      if (!content.includes('No performance baselines found')) {
        throw new Error('Expected empty baselines response');
      }

      console.log('Performance baselines check completed');
    });

    // Test 6: Launch browser for baseline testing
    await test('Launch Browser', async () => {
      const response = await sendRequest('tools/call', {
        name: 'launch_browser',
        arguments: {
          url: 'https://httpbin.org/html',
          headless: true
        }
      });

      const content = response.result.content[0].text;
      if (!content.includes('Browser launched successfully')) {
        throw new Error('Browser launch failed');
      }

      console.log('Browser launched and navigated');
    });

    // Test 7: Capture performance metrics for baseline
    await test('Capture Performance Metrics', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_comprehensive_performance_metrics'
      });

      const content = response.result.content[0].text;
      if (!content.includes('Core Web Vitals') || !content.includes('Timing Metrics')) {
        throw new Error('Performance metrics response incomplete');
      }

      // Extract metrics to use for baseline
      const lines = content.split('\n');
      let cls = 0, fid = 0, lcp = 0, domLoad = 0, memoryUsage = 0;

      for (const line of lines) {
        if (line.includes('CLS:')) cls = parseFloat(line.split(':')[1].trim().split(' ')[0]) || 0;
        if (line.includes('FID:')) fid = parseFloat(line.split(':')[1].trim().split('ms')[0]) || 0;
        if (line.includes('LCP:')) lcp = parseFloat(line.split(':')[1].trim().split('ms')[0]) || 0;
        if (line.includes('DOM Content Loaded:')) domLoad = parseInt(line.split(':')[1].trim().split('ms')[0]) || 0;
        if (line.includes('Usage: ')) memoryUsage = parseFloat(line.split('Usage: ')[1].split('%')[0]) || 0;
      }

      // Verify we got some metrics
      if (domLoad <= 0) {
        throw new Error('Valid performance metrics not captured');
      }

      console.log('Performance metrics captured successfully');
    });

    // Test 8: Set performance baseline
    await test('Set Performance Baseline', async () => {
      // First get current metrics
      const metricsResponse = await sendRequest('tools/call', {
        name: 'get_comprehensive_performance_metrics'
      });

      // Parse metrics for baseline (simplified version)
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

      const response = await sendRequest('tools/call', {
        name: 'set_performance_baseline',
        arguments: {
          testId: 'test-homepage',
          baselineMetrics,
          description: 'Baseline for homepage performance'
        }
      });

      const content = response.result.content[0].text;
      if (!content.includes('Performance baseline set for test "test-homepage"')) {
        throw new Error('Baseline setting failed');
      }

      console.log('Performance baseline set successfully');
    });

    // Test 9: Get performance baselines (should now contain our baseline)
    await test('Get Performance Baselines (after setting)', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_performance_baseline'
      });

      const content = response.result.content[0].text;
      if (!content.includes('Performance Baselines (1 found)')) {
        throw new Error('Baseline not found after setting');
      }

      if (!content.includes('Test: test-homepage')) {
        throw new Error('Baseline content incorrect');
      }

      console.log('Performance baseline retrieved successfully');
    });

    // Test 10: Clear specific baseline
    await test('Clear Specific Baseline', async () => {
      const response = await sendRequest('tools/call', {
        name: 'clear_performance_baselines',
        arguments: {
          testId: 'test-homepage'
        }
      });

      const content = response.result.content[0].text;
      if (!content.includes('Performance baseline cleared for test "test-homepage"')) {
        throw new Error('Specific baseline clearing failed');
      }

      console.log('Specific baseline cleared successfully');
    });

    // Test 11: Verify baselines are empty again
    await test('Verify Baselines Cleared', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_performance_baseline'
      });

      const content = response.result.content[0].text;
      if (!content.includes('No performance baselines found')) {
        throw new Error('Baselines should be empty after clearing');
      }

      console.log('Baselines successfully cleared');
    });

    // Test 12: Close browser
    await test('Close Browser', async () => {
      const response = await sendRequest('tools/call', {
        name: 'close_browser'
      });

      const content = response.result.content[0].text;
      if (!content.includes('Browser closed successfully')) {
        throw new Error('Browser close failed');
      }

      console.log('Browser closed successfully');
    });

  } finally {
    serverProcess.kill();
  }

  console.log(`\n🎭 MCP Server State and Configuration Tools Tests Completed!`);
  console.log(`📊 Test Summary: ${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed.');
    process.exit(1);
  }
}

// Run the tests
runMCPServerTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
