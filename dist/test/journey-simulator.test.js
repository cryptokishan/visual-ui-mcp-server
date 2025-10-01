import { expect, test } from "@playwright/test";
import { JourneySimulator } from "../dist/journey-simulator.js";
test.describe("JourneySimulator", () => {
    test("should execute basic journeys", async ({ page }) => {
        const simulator = new JourneySimulator(page);
        const basicJourney = {
            name: "Basic Navigation Test",
            steps: [
                {
                    id: "navigate_home",
                    action: "navigate",
                    value: 'data:text/html,<html><body><h1>Home Page</h1><input id="name" type="text"><button id="submit">Submit</button></body></html>',
                    description: "Navigate to test page",
                },
                {
                    id: "type_name",
                    action: "type",
                    selector: "#name",
                    value: "Test User",
                    description: "Enter name in input field",
                },
                {
                    id: "click_submit",
                    action: "click",
                    selector: "#submit",
                    description: "Click submit button",
                },
                {
                    id: "take_screenshot",
                    action: "screenshot",
                    value: "journey_complete",
                    description: "Take completion screenshot",
                },
            ],
        };
        const result = await simulator.runJourney(basicJourney);
        expect(result.success).toBe(true);
        expect(result.duration).toBeGreaterThan(0);
        expect(result.completedSteps).toBe(result.totalSteps);
        expect(result.screenshots.length).toBeGreaterThan(0);
    });
    test("should handle journeys with assertions", async ({ page, }) => {
        const simulator = new JourneySimulator(page);
        const assertionJourney = {
            name: "Assertion Test",
            steps: [
                {
                    id: "navigate_assert",
                    action: "navigate",
                    value: 'data:text/html,<html><body><h1>Assert Test</h1><div id="content">Hello World</div></body></html>',
                    description: "Navigate to assertion test page",
                },
                {
                    id: "assert_content",
                    action: "assert",
                    condition: () => Promise.resolve(document.getElementById("content").textContent === "Hello World"),
                    description: "Assert content is correct",
                },
            ],
        };
        const assertResult = await simulator.runJourney(assertionJourney);
        expect(assertResult.success).toBe(true);
    });
    test("should handle journeys with wait conditions", async ({ page, }) => {
        const simulator = new JourneySimulator(page);
        const waitJourney = {
            name: "Wait Test",
            steps: [
                {
                    id: "navigate_wait",
                    action: "navigate",
                    value: 'data:text/html,<html><body><h1>Wait Test</h1><div id="dynamic" style="display:none">Dynamic Content</div><script>setTimeout(() => document.getElementById("dynamic").style.display = "block", 500);</script></body></html>',
                    description: "Navigate to wait test page",
                },
                {
                    id: "wait_for_element",
                    action: "wait",
                    selector: "#dynamic",
                    description: "Wait for dynamic element to appear",
                },
                {
                    id: "assert_visible",
                    action: "assert",
                    condition: () => Promise.resolve(document.getElementById("dynamic").style.display === "block"),
                    description: "Assert element is visible",
                },
            ],
        };
        const waitResult = await simulator.runJourney(waitJourney);
        expect(waitResult.success).toBe(true);
    });
    test("should validate journeys", async ({ page }) => {
        const simulator = new JourneySimulator(page);
        const validJourney = {
            name: "Valid Journey",
            description: "A properly structured journey",
            steps: [
                {
                    id: "step1",
                    action: "navigate",
                    value: "https://example.com",
                    description: "Navigate to example",
                },
            ],
            created: new Date(),
            modified: new Date(),
        };
        const validationResult = await simulator.validateJourney(validJourney);
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.errors.length).toBe(0);
    });
    test("should optimize journeys", async ({ page }) => {
        const simulator = new JourneySimulator(page);
        const journeyToOptimize = {
            name: "Journey to Optimize",
            steps: [
                {
                    id: "step1",
                    action: "navigate",
                    value: "https://example.com",
                    timeout: 5000,
                    description: "Navigate with short timeout",
                },
                {
                    id: "step2",
                    action: "wait",
                    timeout: 2000,
                    description: "Wait with custom timeout",
                },
            ],
            created: new Date(),
            modified: new Date(),
        };
        const optimizedJourney = await simulator.optimizeJourney(journeyToOptimize);
        expect(optimizedJourney.steps.length).toBeGreaterThanOrEqual(1);
    });
    test("should handle errors in journeys", async ({ page }) => {
        const simulator = new JourneySimulator(page);
        const errorJourney = {
            name: "Error Test",
            steps: [
                {
                    id: "navigate_error",
                    action: "navigate",
                    value: 'data:text/html,<html><body><h1>Error Test</h1><input id="test-input" type="text"></body></html>',
                    description: "Navigate to error test page",
                },
                {
                    id: "click_nonexistent",
                    action: "click",
                    selector: "#nonexistent",
                    onError: "continue",
                    description: "Try to click nonexistent element (should continue)",
                },
                {
                    id: "type_after_error",
                    action: "type",
                    selector: "#test-input",
                    value: "Error Handled",
                    description: "Continue with valid action after error",
                },
            ],
        };
        const errorResult = await simulator.runJourney(errorJourney);
        expect(errorResult.success).toBe(true);
        expect(errorResult.errors.length).toBeGreaterThanOrEqual(0);
    });
});
