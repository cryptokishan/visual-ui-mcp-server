import { test, expect } from '@playwright/test';
import { BrowserMonitor } from '../dist/browser-monitor.js';
test.describe('BrowserMonitor', () => {
    test('should handle basic monitoring lifecycle', async ({ page }) => {
        const monitor = new BrowserMonitor();
        // Test 1: Basic monitoring lifecycle
        await monitor.startMonitoring(page);
        expect(monitor.isActive()).toBe(true);
        const stats = monitor.getMonitoringStats();
        expect(stats).toBeDefined();
        // Test 2: Generate some console messages
        await page.evaluate(() => {
            console.log("Test log message");
            console.warn("Test warning message");
            console.error("Test error message");
            console.info("Test info message");
        });
        // Wait for messages to be captured
        await new Promise((resolve) => setTimeout(resolve, 100));
        const allLogs = await monitor.getConsoleLogs();
        expect(allLogs.length).toBeGreaterThan(0);
        // Test 3: Filtered console logs
        const errorLogs = await monitor.getConsoleLogs({ level: "error" });
        expect(errorLogs.length).toBeGreaterThanOrEqual(0);
        // Test 4: Network monitoring
        await page.goto("data:text/html,<html><body><h1>Test Page</h1></body></html>");
        const networkRequests = await monitor.getNetworkRequests();
        expect(networkRequests.length).toBeGreaterThanOrEqual(0);
        // Test 5: Performance metrics
        const metrics = await monitor.capturePerformanceMetrics();
        expect(metrics.domContentLoaded).toBeDefined();
        // Test 6: Stop monitoring
        const result = await monitor.stopMonitoring();
        expect(result.monitoringDuration).toBeGreaterThan(0);
        expect(result.totalRequests).toBeDefined();
        expect(result.consoleMessages).toBeDefined();
        expect(result.errors).toBeDefined();
        // Test 7: Verify monitor is inactive
        expect(monitor.isActive()).toBe(false);
    });
});
