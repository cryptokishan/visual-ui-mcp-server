import { browserManager } from "../browser-manager.js";
import { BrowserMonitor } from "../browser-monitor.js";
export async function handleStartBrowserMonitoring(server, args) {
    return await server.withRetry(async () => {
        await server.validateBrowserState("start_browser_monitoring");
        server.validateMonitoringState("start_browser_monitoring", false);
        server.browserMonitor = new BrowserMonitor();
        // Parse filter arguments
        const consoleFilter = args && args.consoleFilter
            ? {
                level: args.consoleFilter.level,
                source: args.consoleFilter.source,
                message: args.consoleFilter.message
                    ? new RegExp(args.consoleFilter.message)
                    : undefined,
            }
            : undefined;
        const networkFilter = args && args.networkFilter
            ? {
                url: args.networkFilter.url
                    ? new RegExp(args.networkFilter.url)
                    : undefined,
                method: args.networkFilter.method,
                status: args.networkFilter.status,
                resourceType: args.networkFilter.resourceType,
            }
            : undefined;
        const monitoringPage = browserManager.getPage();
        if (!monitoringPage) {
            throw new server.AgentFriendlyError("BROWSER_PAGE_UNAVAILABLE", "Browser page unavailable during monitoring setup.", "Browser page may have closed unexpectedly. Restart the browser.", true);
        }
        await server.browserMonitor.startMonitoring(monitoringPage, {
            consoleFilter,
            networkFilter,
            captureScreenshots: (args && args.captureScreenshots) || false,
            maxEntries: (args && args.maxEntries) || 1000,
        });
        server.updateBrowserState(false, true, false); // Update monitoring state
        return {
            content: [
                {
                    type: "text",
                    text: "Browser monitoring started successfully. Console messages, network requests, and JavaScript errors will be tracked.",
                },
            ],
        };
    }, "start_browser_monitoring");
}
export async function handleStopBrowserMonitoring(server, args) {
    if (!server.browserMonitor || !server.browserMonitor.isActive()) {
        throw new Error("No active browser monitoring session to stop.");
    }
    const monitoringResult = await server.browserMonitor.stopMonitoring();
    server.updateBrowserState(server.logger.getSessionState().browserLaunched, false, undefined); // Clear monitoring state
    server.browserMonitor = null; // Clear the monitor instance
    return {
        content: [
            {
                type: "text",
                text: `Browser monitoring stopped. Results:
- Monitoring Duration: ${Math.round(monitoringResult.monitoringDuration / 1000)}s
- Total Requests: ${monitoringResult.totalRequests}
- Failed Requests: ${monitoringResult.failedRequests}
- Console Messages: ${monitoringResult.consoleMessages}
- Errors: ${monitoringResult.errors}
- DOM Content Loaded: ${monitoringResult.performanceMetrics.domContentLoaded}ms
- Load Complete: ${monitoringResult.performanceMetrics.loadComplete}ms`,
            },
        ],
    };
}
export async function handleGetFilteredConsoleLogs(server, args) {
    if (!server.browserMonitor || !server.browserMonitor.isActive()) {
        throw new Error("No active browser monitoring session.");
    }
    const consoleFilterArgs = args
        ? {
            level: args.level,
            source: args.source,
            message: args.message
                ? new RegExp(args.message)
                : undefined,
        }
        : undefined;
    const consoleLogs = await server.browserMonitor.getConsoleLogs(consoleFilterArgs);
    return {
        content: [
            {
                type: "text",
                text: `Filtered Console Logs (${consoleLogs.length} entries):\n${consoleLogs
                    .map((log) => `[${new Date(log.timestamp).toISOString()}] ${log.type.toUpperCase()}: ${log.text}`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleGetFilteredNetworkRequests(server, args) {
    if (!server.browserMonitor || !server.browserMonitor.isActive()) {
        throw new Error("No active browser monitoring session.");
    }
    const networkFilterArgs = args
        ? {
            url: args.url
                ? new RegExp(args.url)
                : undefined,
            method: args.method,
            status: args.status,
            resourceType: args.resourceType,
        }
        : undefined;
    const networkRequests = await server.browserMonitor.getNetworkRequests(networkFilterArgs);
    return {
        content: [
            {
                type: "text",
                text: `Filtered Network Requests (${networkRequests.length} entries):\n${networkRequests
                    .map((req) => `${req.method} ${req.url} - ${req.status || "Pending"} (${req.duration || 0}ms)${req.failed ? " [FAILED]" : ""}`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleGetJavascriptErrors(server, args) {
    if (!server.browserMonitor || !server.browserMonitor.isActive()) {
        throw new Error("No active browser monitoring session.");
    }
    const jsErrors = await server.browserMonitor.getJavaScriptErrors();
    return {
        content: [
            {
                type: "text",
                text: `JavaScript Errors (${jsErrors.length} entries):\n${jsErrors
                    .map((error) => `${error.type.toUpperCase()}: ${error.message} at ${error.location?.url}:${error.location?.lineNumber}`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleCapturePerformanceMetrics(server, args) {
    if (!server.browserMonitor || !server.browserMonitor.isActive()) {
        throw new Error("No active browser monitoring session.");
    }
    const performanceMetrics = await server.browserMonitor.capturePerformanceMetrics();
    return {
        content: [
            {
                type: "text",
                text: `Performance Metrics:
- DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms
- Load Complete: ${performanceMetrics.loadComplete}ms
- First Paint: ${performanceMetrics.firstPaint || "N/A"}ms
- First Contentful Paint: ${performanceMetrics.firstContentfulPaint || "N/A"}ms
- Largest Contentful Paint: ${performanceMetrics.largestContentfulPaint || "N/A"}ms
- Cumulative Layout Shift: ${performanceMetrics.cumulativeLayoutShift || "N/A"}
- First Input Delay: ${performanceMetrics.firstInputDelay || "N/A"}ms
- Navigation Timing: ${Object.entries(performanceMetrics.navigationTiming)
                    .map(([key, value]) => `${key}: ${value}ms`)
                    .join(", ")}
- Resource Count: ${performanceMetrics.resourceTiming.length}`,
            },
        ],
    };
}
