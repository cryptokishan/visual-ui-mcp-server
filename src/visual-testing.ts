import * as fs from "fs-extra";
import { writeFile, readFile } from "fs/promises";
import * as path from "path";
import pixelmatch from "pixelmatch";
import { Page } from "playwright";
import { PNG } from "pngjs";
import { browserManager } from "./browser-manager.js";
import { ElementLocator } from "./element-locator.js";

export interface ScreenshotOptions {
  selector?: string;
  region?: { x: number; y: number; width: number; height: number };
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  fullPage?: boolean;
  clipToElement?: boolean;
  padding?: number;
  highlightElements?: string[];
}

export interface ScreenshotComparison {
  baseline: Buffer;
  current: Buffer;
  diff?: Buffer;
  similarity: number;
  differences: PixelDifference[];
  totalPixels: number;
  differentPixels: number;
}

export interface PixelDifference {
  x: number;
  y: number;
  baselineColor: [number, number, number, number];
  currentColor: [number, number, number, number];
}

export interface RegressionOptions {
  threshold?: number;
  includeAA?: boolean;
  diffColor?: { r: number; g: number; b: number; a: number };
  outputFormat?: "png" | "jpeg";
}

export interface RegressionResult {
  isDifferent: boolean;
  similarity: number;
  diffImage?: Buffer;
  changedRegions: BoundingBox[];
  totalPixels: number;
  differentPixels: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class VisualTesting {
  private screenshotsDir = path.join(process.cwd(), "screenshots");
  private baselinesDir = path.join(this.screenshotsDir, "baselines");
  private currentDir = path.join(this.screenshotsDir, "current");
  private diffsDir = path.join(this.screenshotsDir, "diffs");
  private elementLocator: ElementLocator | null = null;

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.ensureDir(this.baselinesDir);
    await fs.ensureDir(this.currentDir);
    await fs.ensureDir(this.diffsDir);
  }

  /**
   * Set the element locator for enhanced element finding
   */
  setElementLocator(locator: ElementLocator) {
    this.elementLocator = locator;
  }

  /**
   * Take element-specific screenshot with advanced options
   */
  async takeElementScreenshot(
    page: Page,
    selector: string,
    options: ScreenshotOptions = {}
  ): Promise<Buffer> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Add padding if specified
    let screenshotOptions: any = {};

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
      if (
        options.quality &&
        (options.format === "jpeg" || options.format === "webp")
      ) {
        screenshotOptions.quality = options.quality;
      }
    }

    return await element.screenshot(screenshotOptions);
  }

  /**
   * Take responsive screenshots at multiple breakpoints
   */
  async takeResponsiveScreenshots(
    page: Page,
    breakpoints: number[],
    options: ScreenshotOptions = {}
  ): Promise<Map<number, Buffer>> {
    const screenshots = new Map<number, Buffer>();

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint, height: 768 });
      await page.waitForLoadState("networkidle");

      let screenshotBuffer: Buffer;

      if (options.selector) {
        screenshotBuffer = await this.takeElementScreenshot(
          page,
          options.selector,
          options
        );
      } else if (options.fullPage) {
        screenshotBuffer = await page.screenshot({
          fullPage: true,
          ...options,
        });
      } else {
        screenshotBuffer = await page.screenshot(options);
      }

      screenshots.set(breakpoint, screenshotBuffer);
    }

    return screenshots;
  }

  /**
   * Compare two screenshots with detailed analysis
   */
  async compareScreenshotsDetailed(
    baseline: Buffer,
    current: Buffer,
    options: RegressionOptions = {}
  ): Promise<ScreenshotComparison> {
    const baselineImg = PNG.sync.read(baseline);
    const currentImg = PNG.sync.read(current);

    const { width, height } = baselineImg;
    const diffImg = new PNG({ width, height });

    const threshold = options.threshold || 0.1;
    const diffColor = options.diffColor || { r: 255, g: 0, b: 0, a: 255 };

    // Compare images
    const numDiffPixels = pixelmatch(
      baselineImg.data,
      currentImg.data,
      diffImg.data,
      width,
      height,
      {
        threshold,
        includeAA: options.includeAA || false,
        diffColor: [diffColor.r, diffColor.g, diffColor.b],
      }
    );

    const totalPixels = width * height;
    const similarity = ((totalPixels - numDiffPixels) / totalPixels) * 100;

    // Extract pixel differences
    const differences: PixelDifference[] = [];
    const diffData = diffImg.data;
    const baselineData = baselineImg.data;
    const currentData = currentImg.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Check if this pixel is different (diff image will have the diffColor)
        if (
          diffData[idx] === diffColor.r &&
          diffData[idx + 1] === diffColor.g &&
          diffData[idx + 2] === diffColor.b &&
          diffData[idx + 3] === diffColor.a
        ) {
          differences.push({
            x,
            y,
            baselineColor: [
              baselineData[idx],
              baselineData[idx + 1],
              baselineData[idx + 2],
              baselineData[idx + 3],
            ] as [number, number, number, number],
            currentColor: [
              currentData[idx],
              currentData[idx + 1],
              currentData[idx + 2],
              currentData[idx + 3],
            ] as [number, number, number, number],
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
      differentPixels: numDiffPixels as number,
    };
  }

  /**
   * Compare screenshot with baseline and detect regressions
   */
  async compareWithBaseline(
    page: Page,
    testName: string,
    options: RegressionOptions = {}
  ): Promise<RegressionResult> {
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
    const comparison = await this.compareScreenshotsDetailed(
      baselineScreenshot,
      currentScreenshot,
      options
    );

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
  async updateBaseline(page: Page, testName: string): Promise<void> {
    const screenshot = await page.screenshot();
    const baselinePath = path.join(this.baselinesDir, `${testName}.png`);
    await writeFile(baselinePath, screenshot);
  }

  /**
   * Get baseline screenshot
   */
  async getBaseline(testName: string): Promise<Buffer | null> {
    const baselinePath = path.join(this.baselinesDir, `${testName}.png`);

    if (await fs.pathExists(baselinePath)) {
      return await readFile(baselinePath);
    }

    return null;
  }

  /**
   * List all baseline screenshots
   */
  async listBaselines(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.baselinesDir);
      return files
        .filter((file) => file.endsWith(".png"))
        .map((file) => file.replace(".png", ""));
    } catch {
      return [];
    }
  }

  /**
   * Delete baseline screenshot
   */
  async deleteBaseline(testName: string): Promise<void> {
    const baselinePath = path.join(this.baselinesDir, `${testName}.png`);

    if (await fs.pathExists(baselinePath)) {
      await fs.remove(baselinePath);
    }
  }

  /**
   * Highlight elements before taking screenshot
   */
  async highlightElement(
    page: Page,
    selector: string,
    options: any = {}
  ): Promise<void> {
    const highlightStyle = `
      outline: 3px solid red;
      outline-offset: 2px;
      background-color: rgba(255, 0, 0, 0.1);
    `;

    await page.evaluate(
      ({ selector, style }) => {
        const element = document.querySelector(selector);
        if (element) {
          (element as HTMLElement).style.cssText += style;
        }
      },
      { selector, style: highlightStyle }
    );

    // Optional delay for visual effect
    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  }

  /**
   * Detect changed regions from pixel differences
   */
  private detectChangedRegions(differences: PixelDifference[]): BoundingBox[] {
    if (differences.length === 0) {
      return [];
    }

    // Group differences into regions using a simple clustering approach
    const regions: BoundingBox[] = [];
    const processed = new Set<string>();

    for (const diff of differences) {
      const key = `${diff.x},${diff.y}`;

      if (processed.has(key)) {
        continue;
      }

      // Find connected differences
      const region = this.findConnectedRegion(
        differences,
        diff.x,
        diff.y,
        processed
      );

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
  private findConnectedRegion(
    differences: PixelDifference[],
    startX: number,
    startY: number,
    processed: Set<string>
  ): BoundingBox {
    const regionPixels: PixelDifference[] = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    let minX = startX,
      maxX = startX;
    let minY = startY,
      maxY = startY;

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
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
        if (
          !processed.has(neighborKey) &&
          differences.some((d) => d.x === neighbor.x && d.y === neighbor.y)
        ) {
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

  async takeScreenshot(args: any) {
    try {
      const { name, selector, fullPage = false } = args;
      const page = browserManager.getPage();

      if (!page) {
        throw new Error("No active browser page. Launch browser first.");
      }

      const screenshotPath = path.join(this.currentDir, `${name}.png`);

      let screenshotBuffer: Buffer;

      if (selector) {
        // Take screenshot of specific element
        const element = page.locator(selector);
        screenshotBuffer = await element.screenshot();
      } else if (fullPage) {
        // Take full page screenshot
        screenshotBuffer = await page.screenshot({ fullPage: true });
      } else {
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
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${(error as Error).message}`);
    }
  }

  async compareScreenshots(args: any) {
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
      const numDiffPixels = pixelmatch(
        baselineImg.data,
        currentImg.data,
        diffImg.data,
        width,
        height,
        { threshold }
      );

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
    } catch (error) {
      throw new Error(
        `Failed to compare screenshots: ${(error as Error).message}`
      );
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
    } catch (error) {
      throw new Error(
        `Failed to list screenshots: ${(error as Error).message}`
      );
    }
  }

  async deleteScreenshot(args: any) {
    try {
      const { name, type = "current" } = args;

      let targetDir: string;
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
          throw new Error(
            `Invalid type: ${type}. Use 'baseline', 'current', or 'diff'.`
          );
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
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Screenshot not found: ${filePath}`,
            },
          ],
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to delete screenshot: ${(error as Error).message}`
      );
    }
  }
}

export const visualTesting = new VisualTesting();
