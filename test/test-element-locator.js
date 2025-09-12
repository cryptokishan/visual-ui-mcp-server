import { chromium } from 'playwright';
import { ElementLocator } from '../dist/element-locator.js';

async function testElementLocator() {
  console.log('🚀 Starting Element Locator Tests...\n');

  // Launch browser and navigate to test page
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/test-element-locator.html`);

  // Initialize ElementLocator
  const locator = new ElementLocator(page);

  // Test 1: CSS Selector
  console.log('Test 1: Finding element by CSS selector');
  try {
    const element1 = await locator.findElement({
      selectors: [{ type: 'css', value: '#test-button' }],
      timeout: 5000
    });
    console.log('✅ CSS selector test:', element1 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ CSS selector test failed:', error.message);
  }

  // Test 2: Multiple fallback selectors
  console.log('\nTest 2: Multiple fallback selectors');
  try {
    const element2 = await locator.findElement({
      selectors: [
        { type: 'css', value: '#nonexistent', priority: 0 },
        { type: 'data', value: 'submit-btn', priority: 1 },
        { type: 'text', value: 'Submit', priority: 2 }
      ],
      timeout: 5000
    });
    console.log('✅ Fallback selectors test:', element2 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ Fallback selectors test failed:', error.message);
  }

  // Test 3: Text content selector
  console.log('\nTest 3: Finding element by text content');
  try {
    const element3 = await locator.findElement({
      selectors: [{ type: 'text', value: 'Primary Button' }],
      timeout: 5000
    });
    console.log('✅ Text selector test:', element3 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ Text selector test failed:', error.message);
  }

  // Test 4: ARIA label selector
  console.log('\nTest 4: Finding element by ARIA label');
  try {
    const element4 = await locator.findElement({
      selectors: [{ type: 'aria', value: 'Search field' }],
      timeout: 5000
    });
    console.log('✅ ARIA selector test:', element4 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ ARIA selector test failed:', error.message);
  }

  // Test 5: Wait for dynamic element
  console.log('\nTest 5: Waiting for dynamic element');
  try {
    const element5 = await locator.findElement({
      selectors: [{ type: 'css', value: '#dynamic-element' }],
      timeout: 5000
    });
    console.log('✅ Dynamic element test:', element5 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ Dynamic element test failed:', error.message);
  }

  // Test 6: Element state verification
  console.log('\nTest 6: Element state verification (visible/enabled)');
  try {
    const element6 = await locator.findElement({
      selectors: [{ type: 'css', value: '#username' }],
      waitForVisible: true,
      waitForEnabled: true,
      timeout: 5000
    });
    console.log('✅ State verification test:', element6 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ State verification test failed:', error.message);
  }

  // Test 7: Hidden element (should fail with waitForVisible: true)
  console.log('\nTest 7: Hidden element detection');
  try {
    const element7 = await locator.findElement({
      selectors: [{ type: 'css', value: '#hidden-element' }],
      waitForVisible: true,
      timeout: 2000
    });
    console.log('✅ Hidden element test:', element7 ? 'FAILED (should not find hidden)' : 'PASSED');
  } catch (error) {
    console.log('✅ Hidden element test: PASSED (correctly failed to find hidden element)');
  }

  // Test 8: Multiple elements
  console.log('\nTest 8: Finding multiple elements');
  try {
    const elements = await locator.findElements({
      selectors: [{ type: 'css', value: 'button' }],
      timeout: 5000
    });
    console.log('✅ Multiple elements test:', elements.length > 0 ? `PASSED (${elements.length} found)` : 'FAILED');
  } catch (error) {
    console.log('❌ Multiple elements test failed:', error.message);
  }

  // Test 9: XPath selector
  console.log('\nTest 9: XPath selector');
  try {
    const element9 = await locator.findElement({
      selectors: [{ type: 'xpath', value: '//button[@id="test-button"]' }],
      timeout: 5000
    });
    console.log('✅ XPath selector test:', element9 ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ XPath selector test failed:', error.message);
  }

  // Cleanup
  await browser.close();
  console.log('\n🎉 Element Locator Tests Completed!');
}

// Run the tests
testElementLocator().catch(console.error);
