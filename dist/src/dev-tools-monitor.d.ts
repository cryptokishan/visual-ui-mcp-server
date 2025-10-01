export declare class DevToolsMonitor {
    private consoleMessages;
    private networkRequests;
    private isMonitoring;
    startMonitoring(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    } | undefined>;
    stopMonitoring(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getConsoleLogs(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getNetworkRequests(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    checkForErrors(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    clearLogs(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getMonitoringStatus(): {
        isMonitoring: boolean;
        consoleMessagesCount: number;
        networkRequestsCount: number;
    };
}
export declare const devToolsMonitor: DevToolsMonitor;
