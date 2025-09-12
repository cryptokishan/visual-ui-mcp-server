import { PerformanceMonitor } from "./performance-monitor.js";
export class BrowserMonitor {
    page = null;
    isMonitoring = false;
    startTime = 0;
    consoleEntries = [];
    networkEntries = [];
    errorEntries = [];
    monitoringOptions = {};
    performanceObserver = null;
    performanceMonitor = null;
    async startMonitoring(page, options = {}) {
        if (this.isMonitoring) {
            throw new Error("Monitoring is already active. Stop current monitoring first.");
        }
        this.page = page;
        this.monitoringOptions = {
            maxEntries: 1000,
            captureScreenshots: false,
            ...options,
        };
        this.isMonitoring = true;
        this.startTime = Date.now();
        this.clearEntries();
        await this.setupConsoleMonitoring();
        await this.setupNetworkMonitoring();
        await this.setupErrorMonitoring();
        await this.setupPerformanceMonitoring();
    }
    async stopMonitoring() {
        if (!this.isMonitoring) {
            throw new Error("No active monitoring session to stop.");
        }
        const monitoringDuration = Date.now() - this.startTime;
        // Clean up listeners
        if (this.page) {
            this.page.removeAllListeners('console');
            this.page.removeAllListeners('request');
            this.page.removeAllListeners('response');
            this.page.removeAllListeners('requestfailed');
            this.page.removeAllListeners('pageerror');
        }
        // Clean up performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
        const performanceMetrics = await this.capturePerformanceMetrics();
        const result = {
            consoleEntries: [...this.consoleEntries],
            networkEntries: [...this.networkEntries],
            errorEntries: [...this.errorEntries],
            performanceMetrics,
            monitoringDuration,
            totalRequests: this.networkEntries.length,
            failedRequests: this.networkEntries.filter(req => req.failed || (req.status && req.status >= 400)).length,
            consoleMessages: this.consoleEntries.length,
            errors: this.errorEntries.length,
        };
        this.isMonitoring = false;
        this.page = null;
        return result;
    }
    async getConsoleLogs(filter) {
        if (!this.isMonitoring) {
            throw new Error("Monitoring is not active. Start monitoring first.");
        }
        let filtered = [...this.consoleEntries];
        if (filter) {
            filtered = filtered.filter(entry => {
                if (filter.level && entry.type !== filter.level)
                    return false;
                if (filter.source && entry.source !== filter.source)
                    return false;
                if (filter.message && !filter.message.test(entry.text))
                    return false;
                return true;
            });
        }
        return filtered;
    }
    async getNetworkRequests(filter) {
        if (!this.isMonitoring) {
            throw new Error("Monitoring is not active. Start monitoring first.");
        }
        let filtered = [...this.networkEntries];
        if (filter) {
            filtered = filtered.filter(entry => {
                if (filter.url && !filter.url.test(entry.url))
                    return false;
                if (filter.method && entry.method !== filter.method)
                    return false;
                if (filter.status && entry.status !== filter.status)
                    return false;
                if (filter.resourceType && entry.resourceType !== filter.resourceType)
                    return false;
                return true;
            });
        }
        return filtered;
    }
    async getJavaScriptErrors() {
        if (!this.isMonitoring) {
            throw new Error("Monitoring is not active. Start monitoring first.");
        }
        return [...this.errorEntries];
    }
    async capturePerformanceMetrics() {
        if (!this.page) {
            throw new Error("No active page for performance monitoring.");
        }
        try {
            // Initialize performance monitor if not already done
            if (!this.performanceMonitor) {
                this.performanceMonitor = new PerformanceMonitor();
            }
            // Get comprehensive performance analysis
            const pageLoadAnalysis = await this.performanceMonitor.analyzePageLoad(this.page);
            // Get Core Web Vitals
            const coreWebVitals = await this.performanceMonitor.measureCoreWebVitals(this.page);
            // Get resource timing
            const resourceTiming = await this.performanceMonitor.monitorResourceLoading(this.page);
            // Get memory usage (short tracking for immediate metrics)
            const memoryHistory = await this.performanceMonitor.trackMemoryUsage(this.page, 2000);
            const latestMemory = memoryHistory.length > 0 ? memoryHistory[memoryHistory.length - 1] : {
                used: 0,
                total: 0,
                limit: 0,
                usedPercent: 0,
                timestamp: Date.now()
            };
            return {
                domContentLoaded: pageLoadAnalysis.domContentLoaded,
                loadComplete: pageLoadAnalysis.loadComplete,
                firstPaint: pageLoadAnalysis.firstPaint,
                firstContentfulPaint: pageLoadAnalysis.firstContentfulPaint,
                largestContentfulPaint: coreWebVitals.lcp,
                cumulativeLayoutShift: coreWebVitals.cls,
                firstInputDelay: coreWebVitals.fid,
                navigationTiming: pageLoadAnalysis.navigationTiming,
                resourceTiming: resourceTiming.map(resource => ({
                    name: resource.name,
                    initiatorType: resource.initiatorType,
                    duration: resource.duration,
                    size: resource.size,
                    startTime: resource.startTime,
                })),
            };
        }
        catch (error) {
            throw new Error(`Failed to capture performance metrics: ${error.message}`);
        }
    }
    async setupConsoleMonitoring() {
        if (!this.page)
            return;
        this.page.on('console', (msg) => {
            const entry = {
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now(),
                location: msg.location(),
                source: 'console',
            };
            this.consoleEntries.push(entry);
            // Limit entries if maxEntries is set
            if (this.monitoringOptions.maxEntries && this.consoleEntries.length > this.monitoringOptions.maxEntries) {
                this.consoleEntries.shift();
            }
        });
    }
    async setupNetworkMonitoring() {
        if (!this.page)
            return;
        this.page.on('request', (request) => {
            const entry = {
                url: request.url(),
                method: request.method(),
                requestHeaders: request.headers(),
                timestamp: Date.now(),
                resourceType: request.resourceType(),
            };
            // Try to get request body
            try {
                const postData = request.postData();
                if (postData) {
                    entry.requestBody = postData;
                }
            }
            catch (error) {
                // Some requests might not have readable body
            }
            this.networkEntries.push(entry);
            // Limit entries if maxEntries is set
            if (this.monitoringOptions.maxEntries && this.networkEntries.length > this.monitoringOptions.maxEntries) {
                this.networkEntries.shift();
            }
        });
        this.page.on('response', (response) => {
            const request = this.networkEntries.find(req => req.url === response.url());
            if (request) {
                request.status = response.status();
                request.statusText = response.statusText();
                request.responseHeaders = response.headers();
                request.duration = Date.now() - request.timestamp;
                // Calculate response size
                const contentLength = response.headers()['content-length'];
                if (contentLength) {
                    request.size = parseInt(contentLength, 10);
                }
                // Try to get response body for certain content types
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('json') || contentType.includes('text')) {
                        response.text().then(body => {
                            request.responseBody = body;
                            if (!request.size && body) {
                                request.size = new Blob([body]).size;
                            }
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
        this.page.on('requestfailed', (request) => {
            const networkRequest = this.networkEntries.find(req => req.url === request.url());
            if (networkRequest) {
                networkRequest.failed = true;
                networkRequest.error = request.failure()?.errorText || 'Request failed';
                // Add to error entries
                const errorEntry = {
                    type: 'network',
                    message: networkRequest.error,
                    timestamp: Date.now(),
                    url: networkRequest.url,
                    method: networkRequest.method,
                    status: networkRequest.status,
                };
                this.errorEntries.push(errorEntry);
            }
        });
    }
    async setupErrorMonitoring() {
        if (!this.page)
            return;
        this.page.on('pageerror', (error) => {
            const errorEntry = {
                type: 'javascript',
                message: error.message,
                timestamp: Date.now(),
                stack: error.stack,
                location: {
                    url: this.page?.url() || '',
                    lineNumber: 0,
                    columnNumber: 0,
                },
            };
            this.errorEntries.push(errorEntry);
            // Limit entries if maxEntries is set
            if (this.monitoringOptions.maxEntries && this.errorEntries.length > this.monitoringOptions.maxEntries) {
                this.errorEntries.shift();
            }
        });
    }
    async setupPerformanceMonitoring() {
        if (!this.page)
            return;
        // Set up performance observer for additional metrics
        await this.page.evaluate(() => {
            if (typeof PerformanceObserver !== 'undefined') {
                // Monitor Largest Contentful Paint
                try {
                    const lcpObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        window.__lcp = lastEntry.startTime;
                    });
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                }
                catch (e) {
                    // LCP not supported
                }
                // Monitor Cumulative Layout Shift
                try {
                    const clsObserver = new PerformanceObserver((list) => {
                        let clsValue = 0;
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        window.__cls = clsValue;
                    });
                    clsObserver.observe({ entryTypes: ['layout-shift'] });
                }
                catch (e) {
                    // CLS not supported
                }
                // Monitor First Input Delay
                try {
                    const fidObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        window.__fid = lastEntry.processingStart - lastEntry.startTime;
                    });
                    fidObserver.observe({ entryTypes: ['first-input'] });
                }
                catch (e) {
                    // FID not supported
                }
            }
        });
    }
    clearEntries() {
        this.consoleEntries = [];
        this.networkEntries = [];
        this.errorEntries = [];
    }
    isActive() {
        return this.isMonitoring;
    }
    getMonitoringStats() {
        return {
            isMonitoring: this.isMonitoring,
            duration: this.isMonitoring ? Date.now() - this.startTime : 0,
            consoleEntries: this.consoleEntries.length,
            networkEntries: this.networkEntries.length,
            errorEntries: this.errorEntries.length,
        };
    }
}
