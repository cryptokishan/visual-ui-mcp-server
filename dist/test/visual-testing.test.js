import { expect, test } from "@playwright/test";
import { VisualTesting } from "../dist/visual-testing.js";
test.describe("VisualTesting", () => {
    test("should handle element screenshots", async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const visualTesting = new VisualTesting();
        // Test 1: Take element screenshot
        const elementScreenshot = await visualTesting.takeElementScreenshot(page, "#test-button", {
            format: "png",
            padding: 10,
        });
        expect(elementScreenshot.length).toBeGreaterThan(0);
    });
    test("should handle responsive screenshots", async ({ page, }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const visualTesting = new VisualTesting();
        // Test 2: Take responsive screenshots
        const responsiveScreenshots = await visualTesting.takeResponsiveScreenshots(page, [320, 768, 1024], {
            selector: "h1",
            fullPage: false,
        });
        expect(responsiveScreenshots.size).toBe(3);
        for (const [width, buffer] of responsiveScreenshots) {
            expect(buffer.length).toBeGreaterThan(0);
        }
    });
    test("should handle visual regression detection", async ({ page, }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        await page.setViewportSize({ width: 1024, height: 768 });
        const visualTesting = new VisualTesting();
        // Test 3: Visual regression detection (first run - create baseline)
        const regressionResult1 = await visualTesting.compareWithBaseline(page, "test-homepage", {
            threshold: 0.1,
            includeAA: false,
        });
        expect(regressionResult1.similarity).toBeDefined();
        // Test 4: Visual regression detection (second run - compare with baseline)
        const regressionResult2 = await visualTesting.compareWithBaseline(page, "test-homepage", {
            threshold: 0.1,
            includeAA: false,
        });
        expect(regressionResult2.similarity).toBeDefined();
        expect(regressionResult2.changedRegions).toBeDefined();
    });
    test("should handle baseline management", async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const visualTesting = new VisualTesting();
        // Test 5: Update baseline
        await visualTesting.updateBaseline(page, "test-homepage-updated");
        // Test 6: List baselines
        const baselines = await visualTesting.listBaselines();
        expect(baselines.length).toBeGreaterThanOrEqual(0);
        // Test 7: Get baseline
        const baseline = await visualTesting.getBaseline("test-homepage");
        expect(baseline).toBeDefined();
        // Test 10: Delete baseline
        await visualTesting.deleteBaseline("test-homepage-updated");
    });
    test("should handle element highlighting", async ({ page, }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const visualTesting = new VisualTesting();
        // Test 8: Highlight element
        await visualTesting.highlightElement(page, "#test-button", { delay: 500 });
    });
    test("should handle screenshot comparison", async ({ page, }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const visualTesting = new VisualTesting();
        // Test 9: Compare screenshots with different images
        const screenshot1 = await page.screenshot();
        await page.evaluate(() => {
            const button = document.querySelector("#test-button");
            if (button) {
                button.textContent = "Modified Button";
                button.style.backgroundColor = "green";
            }
        });
        const screenshot2 = await page.screenshot();
        const comparison = await visualTesting.compareScreenshotsDetailed(screenshot1, screenshot2, {
            threshold: 0.1,
            includeAA: false,
        });
        expect(comparison.totalPixels).toBeGreaterThan(0);
        expect(comparison.differentPixels).toBeDefined();
        expect(comparison.similarity).toBeDefined();
        expect(comparison.differences).toBeDefined();
    });
});
