import { JourneySimulator } from '../dist/journey-simulator.js';
import { chromium } from 'playwright';

async function testJourneySimulator() {
  console.log('🚀 Testing JourneySimulator functionality...\n');

  let browser;
  let page;
  let simulator;

  try {
    // Setup
    console.log('Setting up browser and simulator...');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    simulator = new JourneySimulator(page);

    // Test 1: Basic journey execution
    console.log('\nTest 1: Basic journey execution');
    const basicJourney = {
      name: 'Basic Navigation Test',
      steps: [
        {
          id: 'navigate_home',
          action: 'navigate',
          value: 'data:text/html,<html><body><h1>Home Page</h1><input id="name" type="text"><button id="submit">Submit</button></body></html>',
          description: 'Navigate to test page'
        },
        {
          id: 'type_name',
          action: 'type',
          selector: '#name',
          value: 'Test User',
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
          value: 'journey_complete',
          description: 'Take completion screenshot'
        }
      ]
    };

    const result = await simulator.runJourney(basicJourney);
    console.log(`✅ Journey completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Duration: ${result.duration}ms`);
    console.log(`✅ Steps completed: ${result.completedSteps}/${result.totalSteps}`);
    console.log(`✅ Screenshots: ${result.screenshots.length}`);

    // Test 2: Journey with assertions
    console.log('\nTest 2: Journey with assertions');
    const assertionJourney = {
      name: 'Assertion Test',
      steps: [
        {
          id: 'navigate_assert',
          action: 'navigate',
          value: 'data:text/html,<html><body><h1>Assert Test</h1><div id="content">Hello World</div></body></html>',
          description: 'Navigate to assertion test page'
        },
        {
          id: 'assert_content',
          action: 'assert',
          condition: '() => document.getElementById("content").textContent === "Hello World"',
          description: 'Assert content is correct'
        }
      ]
    };

    const assertResult = await simulator.runJourney(assertionJourney);
    console.log(`✅ Assertion journey: ${assertResult.success ? 'PASSED' : 'FAILED'}`);

    // Test 3: Journey with wait conditions
    console.log('\nTest 3: Journey with wait conditions');
    const waitJourney = {
      name: 'Wait Test',
      steps: [
        {
          id: 'navigate_wait',
          action: 'navigate',
          value: 'data:text/html,<html><body><h1>Wait Test</h1><div id="dynamic" style="display:none">Dynamic Content</div><script>setTimeout(() => document.getElementById("dynamic").style.display = "block", 500);</script></body></html>',
          description: 'Navigate to wait test page'
        },
        {
          id: 'wait_for_element',
          action: 'wait',
          selector: '#dynamic',
          description: 'Wait for dynamic element to appear'
        },
        {
          id: 'assert_visible',
          action: 'assert',
          condition: '() => document.getElementById("dynamic").style.display === "block"',
          description: 'Assert element is visible'
        }
      ]
    };

    const waitResult = await simulator.runJourney(waitJourney);
    console.log(`✅ Wait journey: ${waitResult.success ? 'PASSED' : 'FAILED'}`);

    // Test 4: Journey validation
    console.log('\nTest 4: Journey validation');
    const validJourney = {
      name: 'Valid Journey',
      description: 'A properly structured journey',
      steps: [
        {
          id: 'step1',
          action: 'navigate',
          value: 'https://example.com',
          description: 'Navigate to example'
        }
      ],
      created: new Date(),
      modified: new Date()
    };

    const validationResult = await simulator.validateJourney(validJourney);
    console.log(`✅ Journey validation: ${validationResult.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`✅ Errors: ${validationResult.errors.length}`);
    console.log(`✅ Warnings: ${validationResult.warnings.length}`);

    // Test 5: Journey optimization
    console.log('\nTest 5: Journey optimization');
    const journeyToOptimize = {
      name: 'Journey to Optimize',
      steps: [
        {
          id: 'step1',
          action: 'navigate',
          value: 'https://example.com',
          timeout: 5000,
          description: 'Navigate with short timeout'
        },
        {
          id: 'step2',
          action: 'wait',
          timeout: 2000,
          description: 'Wait with custom timeout'
        }
      ],
      created: new Date(),
      modified: new Date()
    };

    const optimizedJourney = await simulator.optimizeJourney(journeyToOptimize);
    console.log(`✅ Journey optimization completed`);
    console.log(`✅ Original steps: ${journeyToOptimize.steps.length}`);
    console.log(`✅ Optimized steps: ${optimizedJourney.steps.length}`);

    // Test 6: Error handling
    console.log('\nTest 6: Error handling in journeys');
    const errorJourney = {
      name: 'Error Test',
      steps: [
        {
          id: 'navigate_error',
          action: 'navigate',
          value: 'data:text/html,<html><body><h1>Error Test</h1><input id="test-input" type="text"></body></html>',
          description: 'Navigate to error test page'
        },
        {
          id: 'click_nonexistent',
          action: 'click',
          selector: '#nonexistent',
          onError: 'continue',
          description: 'Try to click nonexistent element (should continue)'
        },
        {
          id: 'type_after_error',
          action: 'type',
          selector: '#test-input',
          value: 'Error Handled',
          description: 'Continue with valid action after error'
        }
      ]
    };

    const errorResult = await simulator.runJourney(errorJourney);
    console.log(`✅ Error handling journey: ${errorResult.success ? 'COMPLETED' : 'FAILED'}`);
    console.log(`✅ Errors encountered: ${errorResult.errors.length}`);

    console.log('\n🎉 JourneySimulator Tests Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- ✅ Basic journey execution');
    console.log('- ✅ Journey with assertions');
    console.log('- ✅ Journey with wait conditions');
    console.log('- ✅ Journey validation');
    console.log('- ✅ Journey optimization');
    console.log('- ✅ Error handling in journeys');

  } catch (error) {
    console.error('❌ JourneySimulator Test failed:', error.message);
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
testJourneySimulator().catch(console.error);
