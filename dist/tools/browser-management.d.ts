export declare function handleLaunchBrowser(server: any, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleCloseBrowser(server: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
