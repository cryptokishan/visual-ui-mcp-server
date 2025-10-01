import { Browser, Page } from "playwright";
export declare class BrowserManager {
    private browser;
    private page;
    launchBrowser(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    closeBrowser(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getPage(): Page | null;
    getBrowser(): Browser | null;
    waitForLoad(timeout?: number): Promise<void>;
    waitForSelector(selector: string, timeout?: number): Promise<void>;
}
export declare const browserManager: BrowserManager;
