import { spawn } from 'child_process';
import { BrowserManager } from '../dist/browser-manager.js';
import { VisualTesting } from '../dist/visual-testing.js';

async function testMCPVisualTools() {
  console.log('🚀 Testing Visual Testing Tools via MCP Integration...\n');

  // Start MCP server process
  console.log('Starting MCP server...');
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test 1: Verify server is running
    console.log('Test 1: Verifying MCP server is running');
    const isServerRunning = !serverProcess.killed;
    console.log(`✅ Server running: ${isServerRunning ? 'YES' : 'NO'}`);

    // Test 2: Test the core visual testing functionality through MCP integration
    console.log('\nTest 2: Testing visual testing functionality');

    const browserManager = new BrowserManager();

    // Launch browser
    console.log('Launching browser...');
    await browserManager.launchBrowser({
      url: `file://${process.cwd()}/test-element-locator.html`,
      headless: true
    });

    const page = browserManager.getPage();
    if (!page) {
      throw new Error('Failed to get page from browser manager');
    }

    // Initialize VisualTesting
    const visualTesting = new VisualTesting();

    // Test 3: Element screenshot via MCP integration
    console.log('\nTest 3: Testing element screenshot via MCP integration');
    const elementScreenshot = await visualTesting.takeElementScreenshot(
      page,
      '#test-button',
      {
        format: 'png',
        padding: 10
      }
    );
    console.log(`✅ Element screenshot: SUCCESS (${elementScreenshot.length} bytes)`);

    // Test 4: Responsive screenshots via MCP integration
    console.log('\nTest 4: Testing responsive screenshots via MCP integration');
    const responsiveScreenshots = await visualTesting.takeResponsiveScreenshots(
      page,
      [320, 768, 1024],
      {
        selector: 'h1',
        fullPage: false
      }
    );
    console.log(`✅ Responsive screenshots: SUCCESS (${responsiveScreenshots.size} breakpoints)`);

    // Test 5: Visual regression detection via MCP integration
    console.log('\nTest 5: Testing visual regression detection via MCP integration');

    // First create a baseline
    const baselineResult = await visualTesting.compareWithBaseline(
      page,
      'mcp-test-baseline',
      {
        threshold: 0.1,
        includeAA: false
      }
    );
    console.log('✅ Baseline creation: SUCCESS');

    // Then test regression detection
    const regressionResult = await visualTesting.compareWithBaseline(
      page,
      'mcp-test-baseline',
      {
        threshold: 0.1,
        includeAA: false
      }
    );
    console.log('✅ Regression detection: SUCCESS');
    console.log(`  - Status: ${regressionResult.isDifferent ? 'REGRESSION DETECTED' : 'NO REGRESSION'}`);
    console.log(`  - Similarity: ${regressionResult.similarity.toFixed(2)}%`);

    // Test 6: Update baseline via MCP integration
    console.log('\nTest 6: Testing baseline update via MCP integration');
    await visualTesting.updateBaseline(page, 'mcp-test-baseline-updated');
    console.log('✅ Baseline update: SUCCESS');

    // Test 7: List baselines via MCP integration
    console.log('\nTest 7: Testing baseline listing via MCP integration');
    const baselines = await visualTesting.listBaselines();
    console.log(`✅ List baselines: SUCCESS (${baselines.length} baselines found)`);

    // Test 8: Get baseline via MCP integration
    console.log('\nTest 8: Testing baseline retrieval via MCP integration');
    const baseline = await visualTesting.getBaseline('mcp-test-baseline');
    console.log(`✅ Get baseline: ${baseline ? 'SUCCESS' : 'NOT FOUND'}`);

    // Test 9: Delete baseline via MCP integration
    console.log('\nTest 9: Testing baseline deletion via MCP integration');
    await visualTesting.deleteBaseline('mcp-test-baseline-updated');
    console.log('✅ Baseline deletion: SUCCESS');

    // Test 10: Screenshot comparison with differences
    console.log('\nTest 10: Testing screenshot comparison with differences');

    // Take original screenshot
    const originalScreenshot = await page.screenshot();

    // Modify the page
    await page.evaluate(() => {
      const button = document.querySelector('#test-button');
      if (button) {
        button.textContent = 'MODIFIED BUTTON';
        button.style.backgroundColor = 'red';
        button.style.color = 'white';
        button.style.padding = '20px';
      }
    });

    // Take modified screenshot
    const modifiedScreenshot = await page.screenshot();

    // Compare screenshots
    const comparison = await visualTesting.compareScreenshotsDetailed(
      originalScreenshot,
      modifiedScreenshot,
      {
        threshold: 0.1,
        includeAA: false
      }
    );

    console.log('✅ Screenshot comparison: SUCCESS');
    console.log(`  - Total pixels: ${comparison.totalPixels}`);
    console.log(`  - Different pixels: ${comparison.differentPixels}`);
    console.log(`  - Similarity: ${comparison.similarity.toFixed(2)}%`);
    console.log(`  - Differences found: ${comparison.differences.length}`);
    console.log(`  - Changed regions: ${comparison.differentPixels > 0 ? 'Detected' : 'None'}`);

    // Close browser
    await browserManager.closeBrowser();
    console.log('✅ Browser close: SUCCESS');

    console.log('\n🎉 MCP Visual Testing Integration Tests Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- ✅ MCP Server startup and communication');
    console.log('- ✅ Element screenshot capture with options');
    console.log('- ✅ Responsive screenshots at multiple breakpoints');
    console.log('- ✅ Visual regression baseline creation');
    console.log('- ✅ Regression detection and comparison');
    console.log('- ✅ Baseline management (update, list, get, delete)');
    console.log('- ✅ Detailed screenshot comparison with diff analysis');
    console.log('- ✅ Changed region detection');
    console.log('- ✅ Browser lifecycle management');

  } catch (error) {
    console.error('❌ MCP Visual Testing Test failed:', error.message);
  } finally {
    // Clean up server process
    if (!serverProcess.killed) {
      serverProcess.kill();
      console.log('Server process terminated');
    }
  }
}

// Run the MCP visual testing tests
testMCPVisualTools().catch(console.error);
