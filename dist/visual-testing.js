import * as fs from "fs-extra";
import { writeFile, readFile } from "fs/promises";
import * as path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { browserManager } from "./browser-manager.js";
export class VisualTesting {
    screenshotsDir = path.join(process.cwd(), "screenshots");
    baselinesDir = path.join(this.screenshotsDir, "baselines");
    currentDir = path.join(this.screenshotsDir, "current");
    diffsDir = path.join(this.screenshotsDir, "diffs");
    elementLocator = null;
    constructor() {
        this.ensureDirectories();
    }
    async ensureDirectories() {
        await fs.ensureDir(this.baselinesDir);
        await fs.ensureDir(this.currentDir);
        await fs.ensureDir(this.diffsDir);
    }
    /**
     * Set the element locator for enhanced element finding
     */
    setElementLocator(locator) {
        this.elementLocator = locator;
    }
    /**
     * Take element-specific screenshot with advanced options
     */
    async takeElementScreenshot(page, selector, options = {}) {
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        // Add padding if specified
        let screenshotOptions = {};
        if (options.padding) {
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
                screenshotOptions.clip = {
                    x: Math.max(0, boundingBox.x - options.padding),
                    y: Math.max(0, boundingBox.y - options.padding),
                    width: boundingBox.width + options.padding * 2,
                    height: boundingBox.height + options.padding * 2,
                };
            }
        }
        // Set format and quality
        if (options.format) {
            screenshotOptions.type = options.format;
            if (options.quality &&
                (options.format === "jpeg" || options.format === "webp")) {
                screenshotOptions.quality = options.quality;
            }
        }
        return await element.screenshot(screenshotOptions);
    }
    /**
     * Take responsive screenshots at multiple breakpoints
     */
    async takeResponsiveScreenshots(page, breakpoints, options = {}) {
        const screenshots = new Map();
        for (const breakpoint of breakpoints) {
            await page.setViewportSize({ width: breakpoint, height: 768 });
            await page.waitForLoadState("networkidle");
            let screenshotBuffer;
            if (options.selector) {
                screenshotBuffer = await this.takeElementScreenshot(page, options.selector, options);
            }
            else if (options.fullPage) {
                screenshotBuffer = await page.screenshot({
                    fullPage: true,
                    ...options,
                });
            }
            else {
                screenshotBuffer = await page.screenshot(options);
            }
            screenshots.set(breakpoint, screenshotBuffer);
        }
        return screenshots;
    }
    /**
     * Compare two screenshots with detailed analysis
     */
    async compareScreenshotsDetailed(baseline, current, options = {}) {
        const baselineImg = PNG.sync.read(baseline);
        const currentImg = PNG.sync.read(current);
        const { width, height } = baselineImg;
        const diffImg = new PNG({ width, height });
        const threshold = options.threshold || 0.1;
        const diffColor = options.diffColor || { r: 255, g: 0, b: 0, a: 255 };
        // Compare images
        const numDiffPixels = pixelmatch(baselineImg.data, currentImg.data, diffImg.data, width, height, {
            threshold,
            includeAA: options.includeAA || false,
            diffColor: [diffColor.r, diffColor.g, diffColor.b],
        });
        const totalPixels = width * height;
        const similarity = ((totalPixels - numDiffPixels) / totalPixels) * 100;
        // Extract pixel differences
        const differences = [];
        const diffData = diffImg.data;
        const baselineData = baselineImg.data;
        const currentData = currentImg.data;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                // Check if this pixel is different (diff image will have the diffColor)
                if (diffData[idx] === diffColor.r &&
                    diffData[idx + 1] === diffColor.g &&
                    diffData[idx + 2] === diffColor.b &&
                    diffData[idx + 3] === diffColor.a) {
                    differences.push({
                        x,
                        y,
                        baselineColor: [
                            baselineData[idx],
                            baselineData[idx + 1],
                            baselineData[idx + 2],
                            baselineData[idx + 3],
                        ],
                        currentColor: [
                            currentData[idx],
                            currentData[idx + 1],
                            currentData[idx + 2],
                            currentData[idx + 3],
                        ],
                    });
                }
            }
        }
        return {
            baseline,
            current,
            diff: numDiffPixels > 0 ? PNG.sync.write(diffImg) : undefined,
            similarity,
            differences,
            totalPixels,
            differentPixels: numDiffPixels,
        };
    }
    /**
     * Compare screenshot with baseline and detect regressions
     */
    async compareWithBaseline(page, testName, options = {}) {
        const currentScreenshot = await page.screenshot();
        const baselinePath = path.join(this.baselinesDir, `${testName}.png`);
        // Check if baseline exists
        if (!(await fs.pathExists(baselinePath))) {
            // Create baseline
            await writeFile(baselinePath, currentScreenshot);
            return {
                isDifferent: false,
                similarity: 100,
                totalPixels: 0,
                differentPixels: 0,
                changedRegions: [],
            };
        }
        // Load baseline
        const baselineScreenshot = await readFile(baselinePath);
        // Compare screenshots
        const comparison = await this.compareScreenshotsDetailed(baselineScreenshot, currentScreenshot, options);
        // Detect changed regions
        const changedRegions = this.detectChangedRegions(comparison.differences);
        return {
            isDifferent: comparison.differentPixels > 0,
            similarity: comparison.similarity,
            diffImage: comparison.diff,
            changedRegions,
            totalPixels: comparison.totalPixels,
            differentPixels: comparison.differentPixels,
        };
    }
    /**
     * Update baseline screenshot
     */
    async updateBaseline(page, testName) {
        const screenshot = await page.screenshot();
        const baselinePath = path.join(this.baselinesDir, `${testName}.png`);
        await writeFile(baselinePath, screenshot);
    }
    /**
     * Get baseline screenshot
     */
    async getBaseline(testName) {
        const baselinePath = path.join(this.baselinesDir, `${testName}.png`);
        if (await fs.pathExists(baselinePath)) {
            return await readFile(baselinePath);
        }
        return null;
    }
    /**
     * List all baseline screenshots
     */
    async listBaselines() {
        try {
            const files = await fs.readdir(this.baselinesDir);
            return files
                .filter((file) => file.endsWith(".png"))
                .map((file) => file.replace(".png", ""));
        }
        catch {
            return [];
        }
    }
    /**
     * Delete baseline screenshot
     */
    async deleteBaseline(testName) {
        const baselinePath = path.join(this.baselinesDir, `${testName}.png`);
        if (await fs.pathExists(baselinePath)) {
            await fs.remove(baselinePath);
        }
    }
    /**
     * Highlight elements before taking screenshot
     */
    async highlightElement(page, selector, options = {}) {
        const highlightStyle = `
      outline: 3px solid red;
      outline-offset: 2px;
      background-color: rgba(255, 0, 0, 0.1);
    `;
        await page.evaluate(({ selector, style }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.cssText += style;
            }
        }, { selector, style: highlightStyle });
        // Optional delay for visual effect
        if (options.delay) {
            await new Promise((resolve) => setTimeout(resolve, options.delay));
        }
    }
    /**
     * Detect changed regions from pixel differences
     */
    detectChangedRegions(differences) {
        if (differences.length === 0) {
            return [];
        }
        // Group differences into regions using a simple clustering approach
        const regions = [];
        const processed = new Set();
        for (const diff of differences) {
            const key = `${diff.x},${diff.y}`;
            if (processed.has(key)) {
                continue;
            }
            // Find connected differences
            const region = this.findConnectedRegion(differences, diff.x, diff.y, processed);
            if (region.width > 1 && region.height > 1) {
                // Filter out single pixels
                regions.push(region);
            }
        }
        return regions;
    }
    /**
     * Find connected region of differences
     */
    findConnectedRegion(differences, startX, startY, processed) {
        const regionPixels = [];
        const queue = [{ x: startX, y: startY }];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const key = `${x},${y}`;
            if (processed.has(key)) {
                continue;
            }
            // Find the difference at this position
            const diff = differences.find((d) => d.x === x && d.y === y);
            if (!diff) {
                continue;
            }
            regionPixels.push(diff);
            processed.add(key);
            // Update bounds
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            // Check neighboring pixels
            const neighbors = [
                { x: x - 1, y },
                { x: x + 1, y },
                { x, y: y - 1 },
                { x, y: y + 1 },
            ];
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (!processed.has(neighborKey) &&
                    differences.some((d) => d.x === neighbor.x && d.y === neighbor.y)) {
                    queue.push(neighbor);
                }
            }
        }
        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        };
    }
    async takeScreenshot(args) {
        try {
            const { name, selector, fullPage = false } = args;
            const page = browserManager.getPage();
            if (!page) {
                throw new Error("No active browser page. Launch browser first.");
            }
            const screenshotPath = path.join(this.currentDir, `${name}.png`);
            let screenshotBuffer;
            if (selector) {
                // Take screenshot of specific element
                const element = page.locator(selector);
                screenshotBuffer = await element.screenshot();
            }
            else if (fullPage) {
                // Take full page screenshot
                screenshotBuffer = await page.screenshot({ fullPage: true });
            }
            else {
                // Take viewport screenshot
                screenshotBuffer = await page.screenshot();
            }
            await writeFile(screenshotPath, screenshotBuffer);
            return {
                content: [
                    {
                        type: "text",
                        text: `Screenshot saved: ${screenshotPath}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to take screenshot: ${error.message}`);
        }
    }
    async compareScreenshots(args) {
        try {
            const { baselineName, currentName, threshold = 0.1 } = args;
            const baselinePath = path.join(this.baselinesDir, `${baselineName}.png`);
            const currentPath = path.join(this.currentDir, `${currentName}.png`);
            const diffPath = path.join(this.diffsDir, `${baselineName}_diff.png`);
            // Check if baseline exists
            if (!(await fs.pathExists(baselinePath))) {
                // Create baseline from current screenshot
                await fs.copy(currentPath, baselinePath);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Baseline created: ${baselinePath}. Run comparison again to see differences.`,
                        },
                    ],
                };
            }
            // Check if current screenshot exists
            if (!(await fs.pathExists(currentPath))) {
                throw new Error(`Current screenshot not found: ${currentPath}`);
            }
            // Read images
            const baselineImg = PNG.sync.read(await readFile(baselinePath));
            const currentImg = PNG.sync.read(await readFile(currentPath));
            // Create diff image
            const { width, height } = baselineImg;
            const diffImg = new PNG({ width, height });
            // Compare images
            const numDiffPixels = pixelmatch(baselineImg.data, currentImg.data, diffImg.data, width, height, { threshold });
            const totalPixels = width * height;
            const diffPercentage = (numDiffPixels / totalPixels) * 100;
            // Save diff image if there are differences
            if (numDiffPixels > 0) {
                await writeFile(diffPath, PNG.sync.write(diffImg));
            }
            const result = {
                totalPixels,
                diffPixels: numDiffPixels,
                diffPercentage: diffPercentage.toFixed(2),
                threshold: (threshold * 100).toFixed(2),
                hasDifferences: numDiffPixels > 0,
                diffImagePath: numDiffPixels > 0 ? diffPath : null,
            };
            return {
                content: [
                    {
                        type: "text",
                        text: `Visual comparison results:
- Total pixels: ${result.totalPixels}
- Different pixels: ${result.diffPixels}
- Difference percentage: ${result.diffPercentage}%
- Threshold: ${result.threshold}%
- Status: ${result.hasDifferences ? "DIFFERENCES FOUND" : "NO DIFFERENCES"}
${result.diffImagePath ? `- Diff image saved: ${result.diffImagePath}` : ""}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to compare screenshots: ${error.message}`);
        }
    }
    async getScreenshotList() {
        try {
            const [baselines, current] = await Promise.all([
                fs.readdir(this.baselinesDir).catch(() => []),
                fs.readdir(this.currentDir).catch(() => []),
            ]);
            return {
                content: [
                    {
                        type: "text",
                        text: `Available screenshots:
Baselines: ${baselines.filter((f) => f.endsWith(".png")).join(", ") || "None"}
Current: ${current.filter((f) => f.endsWith(".png")).join(", ") || "None"}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to list screenshots: ${error.message}`);
        }
    }
    async deleteScreenshot(args) {
        try {
            const { name, type = "current" } = args;
            let targetDir;
            switch (type) {
                case "baseline":
                    targetDir = this.baselinesDir;
                    break;
                case "current":
                    targetDir = this.currentDir;
                    break;
                case "diff":
                    targetDir = this.diffsDir;
                    break;
                default:
                    throw new Error(`Invalid type: ${type}. Use 'baseline', 'current', or 'diff'.`);
            }
            const filePath = path.join(targetDir, `${name}.png`);
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Screenshot deleted: ${filePath}`,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Screenshot not found: ${filePath}`,
                        },
                    ],
                };
            }
        }
        catch (error) {
            throw new Error(`Failed to delete screenshot: ${error.message}`);
        }
    }
}
export const visualTesting = new VisualTesting();
