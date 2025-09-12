export class PerformanceMonitor {
    page = null;
    performanceObserver = null;
    memoryInterval = null;
    coreWebVitals = {};
    memoryHistory = [];
    async measureCoreWebVitals(page) {
        this.page = page;
        this.coreWebVitals = {};
        try {
            // Set up Core Web Vitals observers
            await this.setupCoreWebVitalsObservers();
            // Wait for page to stabilize and collect metrics
            await page.waitForLoadState('networkidle');
            // Give additional time for Core Web Vitals to be collected
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Clean up observers
            this.cleanupObservers();
            const vitals = {
                cls: this.coreWebVitals.cls || 0,
                fid: this.coreWebVitals.fid || 0,
                lcp: this.coreWebVitals.lcp || 0,
            };
            return vitals;
        }
        catch (error) {
            throw new Error(`Failed to measure Core Web Vitals: ${error.message}`);
        }
    }
    async analyzePageLoad(page) {
        this.page = page;
        try {
            const navigationTiming = await page.evaluate(() => {
                const timing = performance.getEntriesByType('navigation')[0];
                return {
                    fetchStart: timing.fetchStart,
                    domainLookupStart: timing.domainLookupStart,
                    domainLookupEnd: timing.domainLookupEnd,
                    connectStart: timing.connectStart,
                    connectEnd: timing.connectEnd,
                    requestStart: timing.requestStart,
                    responseStart: timing.responseStart,
                    responseEnd: timing.responseEnd,
                    domInteractive: timing.domInteractive,
                    domContentLoadedEventStart: timing.domContentLoadedEventStart,
                    domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
                    domComplete: timing.domComplete,
                    loadEventStart: timing.loadEventStart,
                    loadEventEnd: timing.loadEventEnd,
                };
            });
            const paintEntries = await page.evaluate(() => {
                const paints = performance.getEntriesByType('paint');
                return paints.reduce((acc, entry) => {
                    if (entry.name === 'first-paint')
                        acc.firstPaint = entry.startTime;
                    if (entry.name === 'first-contentful-paint')
                        acc.firstContentfulPaint = entry.startTime;
                    return acc;
                }, {});
            });
            const lcpEntry = await page.evaluate(() => {
                const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
                return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;
            });
            const resourceTiming = await page.evaluate(() => {
                const resources = performance.getEntriesByType('resource');
                return resources.map((resource) => ({
                    name: resource.name,
                    initiatorType: resource.initiatorType,
                    duration: resource.duration,
                    size: resource.transferSize,
                    startTime: resource.startTime,
                    transferSize: resource.transferSize,
                    decodedBodySize: resource.decodedBodySize,
                    encodedBodySize: resource.encodedBodySize,
                }));
            });
            return {
                domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
                loadComplete: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
                firstPaint: paintEntries.firstPaint || 0,
                firstContentfulPaint: paintEntries.firstContentfulPaint || 0,
                largestContentfulPaint: lcpEntry || 0,
                navigationTiming,
                resourceTiming,
            };
        }
        catch (error) {
            throw new Error(`Failed to analyze page load: ${error.message}`);
        }
    }
    async monitorResourceLoading(page) {
        this.page = page;
        try {
            // Wait for network to be idle to ensure all resources are loaded
            await page.waitForLoadState('networkidle');
            const resourceTiming = await page.evaluate(() => {
                const resources = performance.getEntriesByType('resource');
                return resources.map((resource) => ({
                    name: resource.name,
                    initiatorType: resource.initiatorType,
                    duration: resource.duration,
                    size: resource.transferSize,
                    startTime: resource.startTime,
                    transferSize: resource.transferSize,
                    decodedBodySize: resource.decodedBodySize,
                    encodedBodySize: resource.encodedBodySize,
                }));
            });
            return resourceTiming;
        }
        catch (error) {
            throw new Error(`Failed to monitor resource loading: ${error.message}`);
        }
    }
    async trackMemoryUsage(page, duration = 30000) {
        this.page = page;
        this.memoryHistory = [];
        try {
            const startTime = Date.now();
            const endTime = startTime + duration;
            return new Promise((resolve, reject) => {
                const interval = setInterval(async () => {
                    try {
                        if (Date.now() >= endTime) {
                            clearInterval(interval);
                            resolve(this.memoryHistory);
                            return;
                        }
                        const memoryUsage = await page.evaluate(() => {
                            if ('memory' in performance) {
                                const mem = performance.memory;
                                return {
                                    used: mem.usedJSHeapSize,
                                    total: mem.totalJSHeapSize,
                                    limit: mem.jsHeapSizeLimit,
                                };
                            }
                            return null;
                        });
                        if (memoryUsage) {
                            const usage = {
                                timestamp: Date.now(),
                                used: memoryUsage.used,
                                total: memoryUsage.total,
                                limit: memoryUsage.limit,
                                usedPercent: (memoryUsage.used / memoryUsage.limit) * 100,
                            };
                            this.memoryHistory.push(usage);
                        }
                    }
                    catch (error) {
                        clearInterval(interval);
                        reject(new Error(`Failed to track memory usage: ${error.message}`));
                    }
                }, 1000); // Sample every second
                this.memoryInterval = interval;
            });
        }
        catch (error) {
            throw new Error(`Failed to track memory usage: ${error.message}`);
        }
    }
    async detectPerformanceRegression(baseline, current) {
        const changes = [];
        let isRegression = false;
        // Define thresholds for regression detection
        const thresholds = {
            cls: 0.1, // 0.1 point increase in CLS
            fid: 100, // 100ms increase in FID
            lcp: 500, // 500ms increase in LCP
            domContentLoaded: 200, // 200ms increase in DOM content loaded
            loadComplete: 500, // 500ms increase in load complete
            memoryUsedPercent: 10, // 10% increase in memory usage
        };
        // Check Core Web Vitals
        if (Math.abs(current.coreWebVitals.cls - baseline.coreWebVitals.cls) > thresholds.cls) {
            const change = current.coreWebVitals.cls - baseline.coreWebVitals.cls;
            changes.push({
                metric: 'Cumulative Layout Shift (CLS)',
                baseline: baseline.coreWebVitals.cls,
                current: current.coreWebVitals.cls,
                change,
                changePercent: (change / baseline.coreWebVitals.cls) * 100,
                threshold: thresholds.cls,
            });
            if (change > thresholds.cls)
                isRegression = true;
        }
        if (Math.abs(current.coreWebVitals.fid - baseline.coreWebVitals.fid) > thresholds.fid) {
            const change = current.coreWebVitals.fid - baseline.coreWebVitals.fid;
            changes.push({
                metric: 'First Input Delay (FID)',
                baseline: baseline.coreWebVitals.fid,
                current: current.coreWebVitals.fid,
                change,
                changePercent: (change / baseline.coreWebVitals.fid) * 100,
                threshold: thresholds.fid,
            });
            if (change > thresholds.fid)
                isRegression = true;
        }
        if (Math.abs(current.coreWebVitals.lcp - baseline.coreWebVitals.lcp) > thresholds.lcp) {
            const change = current.coreWebVitals.lcp - baseline.coreWebVitals.lcp;
            changes.push({
                metric: 'Largest Contentful Paint (LCP)',
                baseline: baseline.coreWebVitals.lcp,
                current: current.coreWebVitals.lcp,
                change,
                changePercent: (change / baseline.coreWebVitals.lcp) * 100,
                threshold: thresholds.lcp,
            });
            if (change > thresholds.lcp)
                isRegression = true;
        }
        // Check timing metrics
        if (Math.abs(current.timing.domContentLoaded - baseline.timing.domContentLoaded) > thresholds.domContentLoaded) {
            const change = current.timing.domContentLoaded - baseline.timing.domContentLoaded;
            changes.push({
                metric: 'DOM Content Loaded',
                baseline: baseline.timing.domContentLoaded,
                current: current.timing.domContentLoaded,
                change,
                changePercent: (change / baseline.timing.domContentLoaded) * 100,
                threshold: thresholds.domContentLoaded,
            });
            if (change > thresholds.domContentLoaded)
                isRegression = true;
        }
        if (Math.abs(current.timing.loadComplete - baseline.timing.loadComplete) > thresholds.loadComplete) {
            const change = current.timing.loadComplete - baseline.timing.loadComplete;
            changes.push({
                metric: 'Load Complete',
                baseline: baseline.timing.loadComplete,
                current: current.timing.loadComplete,
                change,
                changePercent: (change / baseline.timing.loadComplete) * 100,
                threshold: thresholds.loadComplete,
            });
            if (change > thresholds.loadComplete)
                isRegression = true;
        }
        // Check memory usage
        if (Math.abs(current.memory.usedPercent - baseline.memory.usedPercent) > thresholds.memoryUsedPercent) {
            const change = current.memory.usedPercent - baseline.memory.usedPercent;
            changes.push({
                metric: 'Memory Usage (%)',
                baseline: baseline.memory.usedPercent,
                current: current.memory.usedPercent,
                change,
                changePercent: (change / baseline.memory.usedPercent) * 100,
                threshold: thresholds.memoryUsedPercent,
            });
            if (change > thresholds.memoryUsedPercent)
                isRegression = true;
        }
        const summary = isRegression
            ? `Performance regression detected in ${changes.length} metric(s)`
            : `No performance regression detected. All metrics within acceptable thresholds.`;
        return {
            isRegression,
            changes,
            summary,
        };
    }
    async getComprehensiveMetrics(page) {
        const [coreWebVitals, timing, resources, memoryHistory] = await Promise.all([
            this.measureCoreWebVitals(page),
            this.analyzePageLoad(page),
            this.monitorResourceLoading(page),
            this.trackMemoryUsage(page, 5000), // 5 second memory tracking
        ]);
        // Get the latest memory usage
        const latestMemory = memoryHistory.length > 0
            ? memoryHistory[memoryHistory.length - 1]
            : { used: 0, total: 0, limit: 0, usedPercent: 0, timestamp: Date.now() };
        return {
            coreWebVitals,
            timing,
            resources,
            memory: latestMemory,
            timestamp: Date.now(),
        };
    }
    async setupCoreWebVitalsObservers() {
        if (!this.page)
            return;
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
                    let clsValue = 0;
                    const clsObserver = new PerformanceObserver((list) => {
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
        // Wait a bit for observers to collect data
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Retrieve the collected metrics
        const metrics = await this.page.evaluate(() => {
            return {
                cls: window.__cls || 0,
                fid: window.__fid || 0,
                lcp: window.__lcp || 0,
            };
        });
        this.coreWebVitals = metrics;
    }
    cleanupObservers() {
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }
        if (this.page) {
            this.page.evaluate(() => {
                // Clean up global variables
                delete window.__lcp;
                delete window.__cls;
                delete window.__fid;
            }).catch(() => {
                // Ignore cleanup errors
            });
        }
    }
}
