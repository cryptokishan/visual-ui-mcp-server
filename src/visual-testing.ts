import * as fs from "fs-extra";
import * as path from "path";
import { writeFile } from "fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { browserManager } from "./browser-manager.js";

export class VisualTesting {
  private screenshotsDir = path.join(process.cwd(), "screenshots");
  private baselinesDir = path.join(this.screenshotsDir, "baselines");
  private currentDir = path.join(this.screenshotsDir, "current");
  private diffsDir = path.join(this.screenshotsDir, "diffs");

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.ensureDir(this.baselinesDir);
    await fs.ensureDir(this.currentDir);
    await fs.ensureDir(this.diffsDir);
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
      const baselineImg = PNG.sync.read(await fs.readFile(baselinePath));
      const currentImg = PNG.sync.read(await fs.readFile(currentPath));

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
