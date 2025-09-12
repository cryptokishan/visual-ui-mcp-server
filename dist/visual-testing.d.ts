import { Page } from "playwright";
import { ElementLocator } from "./element-locator.js";
export interface ScreenshotOptions {
    selector?: string;
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
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
    diffColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
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
export declare class VisualTesting {
    private screenshotsDir;
    private baselinesDir;
    private currentDir;
    private diffsDir;
    private elementLocator;
    constructor();
    private ensureDirectories;
    /**
     * Set the element locator for enhanced element finding
     */
    setElementLocator(locator: ElementLocator): void;
    /**
     * Take element-specific screenshot with advanced options
     */
    takeElementScreenshot(page: Page, selector: string, options?: ScreenshotOptions): Promise<Buffer>;
    /**
     * Take responsive screenshots at multiple breakpoints
     */
    takeResponsiveScreenshots(page: Page, breakpoints: number[], options?: ScreenshotOptions): Promise<Map<number, Buffer>>;
    /**
     * Compare two screenshots with detailed analysis
     */
    compareScreenshotsDetailed(baseline: Buffer, current: Buffer, options?: RegressionOptions): Promise<ScreenshotComparison>;
    /**
     * Compare screenshot with baseline and detect regressions
     */
    compareWithBaseline(page: Page, testName: string, options?: RegressionOptions): Promise<RegressionResult>;
    /**
     * Update baseline screenshot
     */
    updateBaseline(page: Page, testName: string): Promise<void>;
    /**
     * Get baseline screenshot
     */
    getBaseline(testName: string): Promise<Buffer | null>;
    /**
     * List all baseline screenshots
     */
    listBaselines(): Promise<string[]>;
    /**
     * Delete baseline screenshot
     */
    deleteBaseline(testName: string): Promise<void>;
    /**
     * Highlight elements before taking screenshot
     */
    highlightElement(page: Page, selector: string, options?: any): Promise<void>;
    /**
     * Detect changed regions from pixel differences
     */
    private detectChangedRegions;
    /**
     * Find connected region of differences
     */
    private findConnectedRegion;
    takeScreenshot(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    compareScreenshots(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getScreenshotList(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    deleteScreenshot(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}
export declare const visualTesting: VisualTesting;
