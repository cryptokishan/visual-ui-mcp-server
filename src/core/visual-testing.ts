import { Page } from "playwright";
import { ElementLocator } from "./element-locator.js";

interface ScreenshotOptions {
  type: "element" | "region" | "full";
  selector?: string;
  clip?: { x: number; y: number; width: number; height: number };
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  responsive?: "mobile" | "tablet" | "desktop";
}

interface DiffResult {
  isDifferent: boolean;
  diffImage: Buffer;
  changesBoundingBoxes: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  score: number;
  pixelDifferenceCount: number;
  totalPixels: number;
}

interface ScreenshotMap {
  [breakpoint: string]: Buffer;
}

export class VisualTesting {
  private page: Page;
  private elementLocator: ElementLocator;

  constructor(page: Page) {
    this.page = page;
    this.elementLocator = new ElementLocator();
  }

  /**
   * Captures selective screenshots based on the provided options
   * Supports element-specific, region-based, and full-page screenshots
   */
  async captureSelective(options: ScreenshotOptions): Promise<Buffer> {
    let clipOptions: any = {};

    if (options.type === "element" && options.selector) {
      // Check if element exists first
      const count = await this.page.locator(options.selector).count();
      if (count === 0) {
        throw new Error(
          `Element with selector '${options.selector}' not found`
        );
      }

      const element = await this.page.locator(options.selector).first();
      const boundingBox = await element.boundingBox();
      if (!boundingBox) {
        throw new Error(
          `Element with selector '${options.selector}' is not visible`
        );
      }

      clipOptions = {
        x: Math.floor(boundingBox.x),
        y: Math.floor(boundingBox.y),
        width: Math.floor(boundingBox.width),
        height: Math.floor(boundingBox.height),
      };
    } else if (options.type === "region" && options.clip) {
      clipOptions = {
        x: Math.floor(options.clip.x),
        y: Math.floor(options.clip.y),
        width: Math.floor(options.clip.width),
        height: Math.floor(options.clip.height),
      };
    }

    const screenshotOptions: any = {
      type: options.format || "png",
    };

    if (options.quality && options.format !== "png") {
      screenshotOptions.quality = options.quality;
    }

    if (Object.keys(clipOptions).length > 0) {
      screenshotOptions.clip = clipOptions;
    }

    // Handle responsive testing
    if (options.responsive) {
      const viewports = {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1440, height: 900 },
      };

      const viewport = viewports[options.responsive];
      if (viewport) {
        await this.page.setViewportSize(viewport);
        // Wait for responsive changes to settle
        await this.page.waitForTimeout(500);
      }
    }

    return await this.page.screenshot(screenshotOptions);
  }

  /**
   * Compares two screenshots and generates a diff result
   * Uses pixel-level comparison to detect visual differences
   */
  async compareScreenshots(
    buffer1: Buffer,
    buffer2: Buffer
  ): Promise<DiffResult> {
    try {
      // Dynamic imports to handle libraries without TypeScript definitions
      // @ts-ignore
      const { PNG } = await import("pngjs");
      // @ts-ignore
      const pixelmatch = (await import("pixelmatch")).default;

      // Create PNG instances from buffers
      const img1 = PNG.sync.read(buffer1);
      const img2 = PNG.sync.read(buffer2);

      // Ensure images have the same dimensions
      if (img1.width !== img2.width || img1.height !== img2.height) {
        return {
          isDifferent: true,
          diffImage: Buffer.alloc(0),
          changesBoundingBoxes: [],
          score: 1.0,
          pixelDifferenceCount: Math.abs(
            img1.width * img1.height - img2.width * img2.height
          ),
          totalPixels: Math.max(
            img1.width * img1.height,
            img2.width * img2.height
          ),
        };
      }

      // Create diff image buffer
      const diff = new PNG({ width: img1.width, height: img1.height });

      // Perform pixel comparison
      const pixelDifferenceCount = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        img1.width,
        img1.height,
        { threshold: 0.1 }
      );

      const totalPixels = img1.width * img1.height;
      const score = pixelDifferenceCount / totalPixels;

      // Generate diff image buffer
      const diffImageBuffer = PNG.sync.write(diff);

      // Calculate bounding boxes for changes (simplified - just one big box for now)
      const changesBoundingBoxes =
        pixelDifferenceCount > 0
          ? [
              {
                x: 0,
                y: 0,
                width: img1.width,
                height: img1.height,
              },
            ]
          : [];

      return {
        isDifferent: pixelDifferenceCount > 0,
        diffImage: diffImageBuffer,
        changesBoundingBoxes,
        score,
        pixelDifferenceCount,
        totalPixels,
      };
    } catch (error) {
      // Fallback to basic comparison if PNG parsing fails
      const isDifferent =
        buffer1.length !== buffer2.length || !buffer1.equals(buffer2);

      return {
        isDifferent,
        diffImage: Buffer.alloc(0),
        changesBoundingBoxes: [],
        score: isDifferent ? 0.5 : 0.0,
        pixelDifferenceCount: isDifferent ? 1 : 0,
        totalPixels: Math.max(buffer1.length, buffer2.length),
      };
    }
  }

  /**
   * Tests responsive behavior by capturing screenshots at different breakpoints
   */
  async testResponsive(
    breakpoints: string[] = ["mobile", "tablet", "desktop"]
  ): Promise<ScreenshotMap> {
    const originalViewport = this.page.viewportSize();
    const results: ScreenshotMap = {};

    for (const breakpoint of breakpoints) {
      const viewport = this.getViewportForBreakpoint(breakpoint);
      await this.page.setViewportSize(viewport);

      // Wait for responsive changes
      await this.page.waitForTimeout(500);

      const screenshot = await this.page.screenshot({ type: "png" });
      results[breakpoint] = screenshot;
    }

    // Restore original viewport
    if (originalViewport) {
      await this.page.setViewportSize(originalViewport);
    }

    return results;
  }

  /**
   * Helper method to get viewport size for common breakpoints
   */
  private getViewportForBreakpoint(breakpoint: string): {
    width: number;
    height: number;
  } {
    const viewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1440, height: 900 },
    };

    return (
      viewports[breakpoint as keyof typeof viewports] || {
        width: 1200,
        height: 800,
      }
    ); // Default desktop size
  }
}
