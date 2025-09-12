export declare class WaitRetrySystem {
    waitForElement(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    waitForCondition(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    waitForText(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    waitForURL(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    waitForNetworkIdle(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    retryAction(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}
export declare const waitRetrySystem: WaitRetrySystem;
