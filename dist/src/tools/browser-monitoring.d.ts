export declare function handleStartBrowserMonitoring(server: any, args: any): Promise<any>;
export declare function handleStopBrowserMonitoring(server: any, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetFilteredConsoleLogs(server: any, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetFilteredNetworkRequests(server: any, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetJavascriptErrors(server: any, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleCapturePerformanceMetrics(server: any, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
