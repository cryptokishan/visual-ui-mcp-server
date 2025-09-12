import { browserManager } from "./browser-manager.js";
export class DevToolsMonitor {
    consoleMessages = [];
    networkRequests = [];
    isMonitoring = false;
    async startMonitoring() {
        const page = browserManager.getPage();
        if (!page) {
            throw new Error("No active browser page. Launch browser first.");
        }
        if (this.isMonitoring) {
            return; // Already monitoring
        }
        this.isMonitoring = true;
        this.consoleMessages = [];
        this.networkRequests = [];
        // Monitor console messages
        page.on('console', (msg) => {
            const message = {
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now(),
                location: msg.location(),
            };
            this.consoleMessages.push(message);
        });
        // Monitor network requests
        page.on('request', (request) => {
            const networkRequest = {
                url: request.url(),
                method: request.method(),
                requestHeaders: request.headers(),
                timestamp: Date.now(),
            };
            // Try to get request body
            try {
                const postData = request.postData();
                if (postData) {
                    networkRequest.requestBody = postData;
                }
            }
            catch (error) {
                // Some requests might not have readable body
            }
            this.networkRequests.push(networkRequest);
        });
        page.on('response', (response) => {
            const request = this.networkRequests.find(req => req.url === response.url());
            if (request) {
                request.status = response.status();
                request.statusText = response.statusText();
                request.responseHeaders = response.headers();
                request.duration = Date.now() - request.timestamp;
                // Try to get response body for certain content types
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('json') || contentType.includes('text')) {
                        response.text().then(body => {
                            request.responseBody = body;
                        }).catch(() => {
                            // Ignore errors in getting response body
                        });
                    }
                }
                catch (error) {
                    // Ignore errors in getting response body
                }
            }
        });
        page.on('requestfailed', (request) => {
            const networkRequest = this.networkRequests.find(req => req.url === request.url());
            if (networkRequest) {
                networkRequest.failed = true;
                networkRequest.error = request.failure()?.errorText || 'Request failed';
            }
        });
        return {
            content: [
                {
                    type: "text",
                    text: "Developer tools monitoring started. Console and network activity will be tracked.",
                },
            ],
        };
    }
    async stopMonitoring() {
        const page = browserManager.getPage();
        if (page) {
            page.removeAllListeners('console');
            page.removeAllListeners('request');
            page.removeAllListeners('response');
            page.removeAllListeners('requestfailed');
        }
        this.isMonitoring = false;
        return {
            content: [
                {
                    type: "text",
                    text: "Developer tools monitoring stopped.",
                },
            ],
        };
    }
    async getConsoleLogs(args) {
        try {
            const { level = "all", clear = false } = args;
            let filteredMessages = this.consoleMessages;
            if (level !== "all") {
                filteredMessages = this.consoleMessages.filter(msg => msg.type === level);
            }
            const result = filteredMessages.map(msg => ({
                type: msg.type,
                text: msg.text,
                timestamp: new Date(msg.timestamp).toISOString(),
                location: msg.location,
            }));
            if (clear) {
                this.consoleMessages = [];
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Console logs (${level}):\n${result.map(msg => `[${msg.timestamp}] ${msg.type.toUpperCase()}: ${msg.text}`).join('\n')}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to get console logs: ${error.message}`);
        }
    }
    async getNetworkRequests(args) {
        try {
            const { filter, includeResponse = false } = args;
            let filteredRequests = this.networkRequests;
            if (filter) {
                filteredRequests = this.networkRequests.filter(req => req.url.includes(filter));
            }
            const result = filteredRequests.map(req => ({
                url: req.url,
                method: req.method,
                status: req.status,
                statusText: req.statusText,
                timestamp: new Date(req.timestamp).toISOString(),
                duration: req.duration,
                failed: req.failed,
                error: req.error,
                ...(includeResponse && {
                    requestHeaders: req.requestHeaders,
                    responseHeaders: req.responseHeaders,
                    requestBody: req.requestBody,
                    responseBody: req.responseBody,
                }),
            }));
            return {
                content: [
                    {
                        type: "text",
                        text: `Network requests (${result.length}):\n${result.map(req => `${req.method} ${req.url} - ${req.status || 'Pending'} (${req.duration || 0}ms)${req.failed ? ' [FAILED]' : ''}`).join('\n')}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to get network requests: ${error.message}`);
        }
    }
    async checkForErrors(args) {
        try {
            const { includeNetworkErrors = true, includeConsoleErrors = true } = args;
            const errors = [];
            // Check console errors
            if (includeConsoleErrors) {
                const consoleErrors = this.consoleMessages.filter(msg => msg.type === 'error');
                consoleErrors.forEach(error => {
                    errors.push({
                        type: 'console',
                        message: error.text,
                        timestamp: new Date(error.timestamp).toISOString(),
                        location: error.location,
                    });
                });
            }
            // Check network errors
            if (includeNetworkErrors) {
                const networkErrors = this.networkRequests.filter(req => req.failed || (req.status && req.status >= 400));
                networkErrors.forEach(error => {
                    errors.push({
                        type: 'network',
                        url: error.url,
                        method: error.method,
                        status: error.status,
                        statusText: error.statusText,
                        error: error.error,
                        timestamp: new Date(error.timestamp).toISOString(),
                    });
                });
            }
            const hasErrors = errors.length > 0;
            return {
                content: [
                    {
                        type: "text",
                        text: `Error check results: ${hasErrors ? `${errors.length} errors found` : 'No errors detected'}\n\n${hasErrors ? errors.map(error => {
                            if (error.type === 'console') {
                                return `CONSOLE ERROR: ${error.message} at ${error.location?.url}:${error.location?.lineNumber}`;
                            }
                            else {
                                return `NETWORK ERROR: ${error.method} ${error.url} - ${error.status} ${error.statusText}`;
                            }
                        }).join('\n') : ''}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to check for errors: ${error.message}`);
        }
    }
    async clearLogs() {
        this.consoleMessages = [];
        this.networkRequests = [];
        return {
            content: [
                {
                    type: "text",
                    text: "All logs and network requests cleared.",
                },
            ],
        };
    }
    getMonitoringStatus() {
        return {
            isMonitoring: this.isMonitoring,
            consoleMessagesCount: this.consoleMessages.length,
            networkRequestsCount: this.networkRequests.length,
        };
    }
}
export const devToolsMonitor = new DevToolsMonitor();
