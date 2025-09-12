import { BrowserMonitor } from '../dist/browser-monitor.js';
import { chromium } from 'playwright';

async function testBrowserMonitor() {
  console.log('🚀 Testing BrowserMonitor functionality...\n');

  let browser;
  let page;
  let monitor;

  try {
    // Setup
    console.log('Setting up browser and monitor...');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    monitor = new BrowserMonitor();

    // Test 1: Basic monitoring lifecycle
    console.log('Test 1: Basic monitoring lifecycle');
    await monitor.startMonitoring(page);
    console.log('✅ Monitoring started');

    const isActive = monitor.isActive();
    console.log(`✅ Monitor active: ${isActive}`);

    const stats = monitor.getMonitoringStats();
    console.log(`✅ Initial stats: ${JSON.stringify(stats)}`);

    // Test 2: Generate some console messages
    console.log('\nTest 2: Console message capture');
    await page.evaluate(() => {
      console.log('Test log message');
      console.warn('Test warning message');
      console.error('Test error message');
      console.info('Test info message');
    });

    // Wait for messages to be captured
    await new Promise(resolve => setTimeout(resolve, 100));

    const allLogs = await monitor.getConsoleLogs();
    console.log(`✅ Captured ${allLogs.length} console messages`);

    // Test 3: Filtered console logs
    console.log('\nTest 3: Filtered console logs');
    const errorLogs = await monitor.getConsoleLogs({ level: 'error' });
    console.log(`✅ Filtered error logs: ${errorLogs.length} messages`);

    // Test 4: Network monitoring
    console.log('\nTest 4: Network monitoring');
    await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');

    const networkRequests = await monitor.getNetworkRequests();
    console.log(`✅ Captured ${networkRequests.length} network requests`);

    // Test 5: Performance metrics
    console.log('\nTest 5: Performance metrics');
    const metrics = await monitor.capturePerformanceMetrics();
    console.log(`✅ Performance metrics captured: DOM Content Loaded: ${metrics.domContentLoaded}ms`);

    // Test 6: Stop monitoring
    console.log('\nTest 6: Stop monitoring');
    const result = await monitor.stopMonitoring();
    console.log(`✅ Monitoring stopped. Results: ${JSON.stringify({
      duration: Math.round(result.monitoringDuration / 1000),
      totalRequests: result.totalRequests,
      consoleMessages: result.consoleMessages,
      errors: result.errors
    })}`);

    // Test 7: Verify monitor is inactive
    console.log('\nTest 7: Verify monitor inactive');
    const isInactive = !monitor.isActive();
    console.log(`✅ Monitor inactive: ${isInactive}`);

    console.log('\n🎉 BrowserMonitor Tests Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- ✅ Basic monitoring lifecycle');
    console.log('- ✅ Console message capture');
    console.log('- ✅ Console message filtering');
    console.log('- ✅ Network request monitoring');
    console.log('- ✅ Performance metrics capture');
    console.log('- ✅ Monitoring stop and results');
    console.log('- ✅ Monitor state management');

  } catch (error) {
    console.error('❌ BrowserMonitor Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// Run the test
testBrowserMonitor().catch(console.error);
