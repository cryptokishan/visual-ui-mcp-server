import { chromium } from 'playwright';
import { VisualTesting } from '../dist/visual-testing.js';

async function testVisualTesting() {
  console.log('🚀 Starting Visual Testing Tests...\n');

  // Launch browser and navigate to test page
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/test-element-locator.html`);

  // Initialize VisualTesting
  const visualTesting = new VisualTesting();

  // Test 1: Take element screenshot
  console.log('Test 1: Taking element screenshot');
  try {
    const elementScreenshot = await visualTesting.takeElementScreenshot(
      page,
      '#test-button',
      {
        format: 'png',
        padding: 10
      }
    );
    console.log(`✅ Element screenshot test: SUCCESS (${elementScreenshot.length} bytes)`);
  } catch (error) {
    console.log('❌ Element screenshot test failed:', error.message);
  }

  // Test 2: Take responsive screenshots
  console.log('\nTest 2: Taking responsive screenshots');
  try {
    const responsiveScreenshots = await visualTesting.takeResponsiveScreenshots(
      page,
      [320, 768, 1024],
      {
        selector: 'h1',
        fullPage: false
      }
    );
    console.log(`✅ Responsive screenshots test: SUCCESS (${responsiveScreenshots.size} breakpoints)`);
    for (const [width, buffer] of responsiveScreenshots) {
      console.log(`  - ${width}px: ${buffer.length} bytes`);
    }
  } catch (error) {
    console.log('❌ Responsive screenshots test failed:', error.message);
  }

  // Test 3: Visual regression detection (first run - create baseline)
  console.log('\nTest 3: Visual regression detection (creating baseline)');
  try {
    const regressionResult1 = await visualTesting.compareWithBaseline(
      page,
      'test-homepage',
      {
        threshold: 0.1,
        includeAA: false
      }
    );
    console.log('✅ Baseline creation test: SUCCESS');
    console.log(`  - Status: ${regressionResult1.isDifferent ? 'REGRESSION' : 'NO REGRESSION'}`);
    console.log(`  - Similarity: ${regressionResult1.similarity.toFixed(2)}%`);
  } catch (error) {
    console.log('❌ Baseline creation test failed:', error.message);
  }

  // Test 4: Visual regression detection (second run - compare with baseline)
  console.log('\nTest 4: Visual regression detection (comparing with baseline)');
  try {
    const regressionResult2 = await visualTesting.compareWithBaseline(
      page,
      'test-homepage',
      {
        threshold: 0.1,
        includeAA: false
      }
    );
    console.log('✅ Regression comparison test: SUCCESS');
    console.log(`  - Status: ${regressionResult2.isDifferent ? 'REGRESSION' : 'NO REGRESSION'}`);
    console.log(`  - Similarity: ${regressionResult2.similarity.toFixed(2)}%`);
    console.log(`  - Changed regions: ${regressionResult2.changedRegions.length}`);
  } catch (error) {
    console.log('❌ Regression comparison test failed:', error.message);
  }

  // Test 5: Update baseline
  console.log('\nTest 5: Updating baseline');
  try {
    await visualTesting.updateBaseline(page, 'test-homepage-updated');
    console.log('✅ Baseline update test: SUCCESS');
  } catch (error) {
    console.log('❌ Baseline update test failed:', error.message);
  }

  // Test 6: List baselines
  console.log('\nTest 6: Listing baselines');
  try {
    const baselines = await visualTesting.listBaselines();
    console.log(`✅ List baselines test: SUCCESS (${baselines.length} baselines found)`);
    console.log('Baselines:', baselines.join(', ') || 'None');
  } catch (error) {
    console.log('❌ List baselines test failed:', error.message);
  }

  // Test 7: Get baseline
  console.log('\nTest 7: Getting baseline');
  try {
    const baseline = await visualTesting.getBaseline('test-homepage');
    console.log(`✅ Get baseline test: ${baseline ? 'SUCCESS' : 'NOT FOUND'}`);
    if (baseline) {
      console.log(`  - Baseline size: ${baseline.length} bytes`);
    }
  } catch (error) {
    console.log('❌ Get baseline test failed:', error.message);
  }

  // Test 8: Highlight element
  console.log('\nTest 8: Highlighting element');
  try {
    await visualTesting.highlightElement(page, '#test-button', { delay: 500 });
    console.log('✅ Element highlighting test: SUCCESS');
  } catch (error) {
    console.log('❌ Element highlighting test failed:', error.message);
  }

  // Test 9: Compare screenshots with different images
  console.log('\nTest 9: Comparing different screenshots');
  try {
    // Take two different screenshots
    const screenshot1 = await page.screenshot();
    await page.evaluate(() => {
      const button = document.querySelector('#test-button');
      if (button) {
        button.textContent = 'Modified Button';
        button.style.backgroundColor = 'green';
      }
    });
    const screenshot2 = await page.screenshot();

    const comparison = await visualTesting.compareScreenshotsDetailed(
      screenshot1,
      screenshot2,
      {
        threshold: 0.1,
        includeAA: false
      }
    );

    console.log('✅ Screenshot comparison test: SUCCESS');
    console.log(`  - Total pixels: ${comparison.totalPixels}`);
    console.log(`  - Different pixels: ${comparison.differentPixels}`);
    console.log(`  - Similarity: ${comparison.similarity.toFixed(2)}%`);
    console.log(`  - Differences found: ${comparison.differences.length}`);
    console.log(`  - Diff image: ${comparison.diff ? 'Generated' : 'None'}`);
  } catch (error) {
    console.log('❌ Screenshot comparison test failed:', error.message);
  }

  // Test 10: Delete baseline
  console.log('\nTest 10: Deleting baseline');
  try {
    await visualTesting.deleteBaseline('test-homepage-updated');
    console.log('✅ Baseline deletion test: SUCCESS');
  } catch (error) {
    console.log('❌ Baseline deletion test failed:', error.message);
  }

  // Cleanup
  await browser.close();
  console.log('\n🎉 Visual Testing Tests Completed!');
}

// Run the tests
testVisualTesting().catch(console.error);
