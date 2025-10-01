import { test, expect } from '@playwright/test';
import { ElementLocator } from '../dist/element-locator.js';
test.describe('ElementLocator', () => {
    test('should find elements using CSS selector', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [{ type: "css", value: "#test-button" }],
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
    test('should handle multiple fallback selectors', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [
                { type: "css", value: "#nonexistent", priority: 0 },
                { type: "data", value: "submit-btn", priority: 1 },
                { type: "text", value: "Submit", priority: 2 },
            ],
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
    test('should find elements by text content', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [{ type: "text", value: "Primary Button" }],
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
    test('should find elements by ARIA label', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [{ type: "aria", value: "Search field" }],
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
    test('should wait for dynamic elements', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [{ type: "css", value: "#dynamic-element" }],
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
    test('should verify element state', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [{ type: "css", value: "#username" }],
            waitForVisible: true,
            waitForEnabled: true,
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
    test('should handle hidden elements correctly', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        // The element exists but is hidden, so findElement should return null when waitForVisible is true
        const element = await locator.findElement({
            selectors: [{ type: "css", value: "#hidden-element" }],
            waitForVisible: true,
            timeout: 2000,
        });
        expect(element).toBeNull();
    });
    test('should find multiple elements', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const elements = await locator.findElements({
            selectors: [{ type: "css", value: "button" }],
            timeout: 5000,
        });
        expect(elements.length).toBeGreaterThan(0);
    });
    test('should find elements using XPath', async ({ page }) => {
        await page.goto(`file://${process.cwd()}/test/test-element-locator.html`);
        const locator = new ElementLocator(page);
        const element = await locator.findElement({
            selectors: [{ type: "xpath", value: '//button[@id="test-button"]' }],
            timeout: 5000,
        });
        expect(element).toBeTruthy();
    });
});
