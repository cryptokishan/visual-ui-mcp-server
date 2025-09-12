export declare class VisualTesting {
    private screenshotsDir;
    private baselinesDir;
    private currentDir;
    private diffsDir;
    constructor();
    private ensureDirectories;
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
