import { browserManager } from "../browser-manager.js";
import { PerformanceMonitor } from "../performance-monitor.js";
export async function handleMeasureCoreWebVitals(server, args) {
    const pageForVitals = browserManager.getPage();
    if (!pageForVitals) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    server.performanceMonitor = new PerformanceMonitor();
    const coreWebVitals = await server.performanceMonitor.measureCoreWebVitals(pageForVitals);
    return {
        content: [
            {
                type: "text",
                text: `Core Web Vitals:
- Cumulative Layout Shift (CLS): ${coreWebVitals.cls.toFixed(4)}
- First Input Delay (FID): ${coreWebVitals.fid.toFixed(2)}ms
- Largest Contentful Paint (LCP): ${coreWebVitals.lcp.toFixed(2)}ms

📊 Performance Scores:
- CLS: ${coreWebVitals.cls < 0.1
                    ? "✅ Good"
                    : coreWebVitals.cls < 0.25
                        ? "⚠️ Needs Improvement"
                        : "❌ Poor"}
- FID: ${coreWebVitals.fid < 100
                    ? "✅ Good"
                    : coreWebVitals.fid < 300
                        ? "⚠️ Needs Improvement"
                        : "❌ Poor"}
- LCP: ${coreWebVitals.lcp < 2500
                    ? "✅ Good"
                    : coreWebVitals.lcp < 4000
                        ? "⚠️ Needs Improvement"
                        : "❌ Poor"}`,
            },
        ],
    };
}
export async function handleAnalyzePageLoad(server, args) {
    const pageForLoad = browserManager.getPage();
    if (!pageForLoad) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    server.performanceMonitor = new PerformanceMonitor();
    const loadAnalysis = await server.performanceMonitor.analyzePageLoad(pageForLoad);
    return {
        content: [
            {
                type: "text",
                text: `Page Load Analysis:
- DOM Content Loaded: ${loadAnalysis.domContentLoaded}ms
- Load Complete: ${loadAnalysis.loadComplete}ms
- First Paint: ${loadAnalysis.firstPaint}ms
- First Contentful Paint: ${loadAnalysis.firstContentfulPaint}ms
- Largest Contentful Paint: ${loadAnalysis.largestContentfulPaint}ms

Navigation Timing:
${Object.entries(loadAnalysis.navigationTiming)
                    .map(([key, value]) => `- ${key}: ${value}ms`)
                    .join("\n")}

Resource Summary:
- Total Resources: ${loadAnalysis.resourceTiming.length}
- Resource Types: ${[
                    ...new Set(loadAnalysis.resourceTiming.map((r) => r.initiatorType)),
                ].join(", ")}`,
            },
        ],
    };
}
export async function handleMonitorResourceLoading(server, args) {
    const pageForResources = browserManager.getPage();
    if (!pageForResources) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    server.performanceMonitor = new PerformanceMonitor();
    const resourceTiming = await server.performanceMonitor.monitorResourceLoading(pageForResources);
    const resourceSummary = resourceTiming.reduce((acc, resource) => {
        const type = resource.initiatorType;
        if (!acc[type]) {
            acc[type] = { count: 0, totalSize: 0, totalDuration: 0 };
        }
        acc[type].count++;
        acc[type].totalSize += resource.size || 0;
        acc[type].totalDuration += resource.duration;
        return acc;
    }, {});
    return {
        content: [
            {
                type: "text",
                text: `Resource Loading Analysis:
- Total Resources: ${resourceTiming.length}

Resource Breakdown by Type:
${Object.entries(resourceSummary)
                    .map(([type, stats]) => `- ${type}: ${stats.count} resources, ${(stats.totalSize / 1024).toFixed(1)}KB, ${(stats.totalDuration / stats.count).toFixed(0)}ms avg`)
                    .join("\n")}

Largest Resources:
${resourceTiming
                    .sort((a, b) => (b.size || 0) - (a.size || 0))
                    .slice(0, 5)
                    .map((r) => `- ${r.name}: ${(r.size || 0) / 1024}KB (${r.duration}ms)`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleTrackMemoryUsage(server, args) {
    const pageForMemory = browserManager.getPage();
    if (!pageForMemory) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    server.performanceMonitor = new PerformanceMonitor();
    const duration = (args && args.duration) || 30000;
    const memoryHistory = await server.performanceMonitor.trackMemoryUsage(pageForMemory, duration);
    if (memoryHistory.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "Memory tracking completed but no data was collected. Memory API may not be available in this browser.",
                },
            ],
        };
    }
    const avgMemory = memoryHistory.reduce((sum, m) => sum + m.usedPercent, 0) / memoryHistory.length;
    const maxMemory = Math.max(...memoryHistory.map((m) => m.usedPercent));
    const minMemory = Math.min(...memoryHistory.map((m) => m.usedPercent));
    return {
        content: [
            {
                type: "text",
                text: `Memory Usage Tracking (${duration / 1000}s):
- Average Memory Usage: ${avgMemory.toFixed(1)}%
- Peak Memory Usage: ${maxMemory.toFixed(1)}%
- Minimum Memory Usage: ${minMemory.toFixed(1)}%
- Memory Range: ${(maxMemory - minMemory).toFixed(1)}%

📊 Memory Health:
${avgMemory < 50
                    ? "✅ Good memory usage"
                    : avgMemory < 80
                        ? "⚠️ Moderate memory usage"
                        : "❌ High memory usage"}

Recent Memory Samples:
${memoryHistory
                    .slice(-5)
                    .map((m) => `${new Date(m.timestamp).toLocaleTimeString()}: ${m.usedPercent.toFixed(1)}% (${(m.used / 1024 / 1024).toFixed(1)}MB)`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleDetectPerformanceRegression(server, args) {
    const pageForRegression = browserManager.getPage();
    if (!pageForRegression) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    if (!args || !args.baselineMetrics) {
        throw new Error("Baseline metrics are required for regression detection");
    }
    server.performanceMonitor = new PerformanceMonitor();
    const currentMetrics = await server.performanceMonitor.getComprehensiveMetrics(pageForRegression);
    const regressionReport = await server.performanceMonitor.detectPerformanceRegression(args.baselineMetrics, currentMetrics);
    return {
        content: [
            {
                type: "text",
                text: `Performance Regression Analysis:
${regressionReport.summary}

${regressionReport.changes.length > 0
                    ? `Detailed Changes:
${regressionReport.changes
                        .map((change) => `- ${change.metric}: ${change.change > 0 ? "+" : ""}${change.changePercent.toFixed(1)}% (${change.baseline.toFixed(2)} → ${change.current.toFixed(2)})`)
                        .join("\n")}`
                    : "No significant changes detected."}`,
            },
        ],
    };
}
export async function handleGetComprehensivePerformanceMetrics(server, args) {
    const pageForComprehensive = browserManager.getPage();
    if (!pageForComprehensive) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    server.performanceMonitor = new PerformanceMonitor();
    const comprehensiveMetrics = await server.performanceMonitor.getComprehensiveMetrics(pageForComprehensive);
    return {
        content: [
            {
                type: "text",
                text: `Comprehensive Performance Metrics:

🎯 Core Web Vitals:
- CLS: ${comprehensiveMetrics.coreWebVitals.cls.toFixed(4)}
- FID: ${comprehensiveMetrics.coreWebVitals.fid.toFixed(2)}ms
- LCP: ${comprehensiveMetrics.coreWebVitals.lcp.toFixed(2)}ms

⏱️ Timing Metrics:
- DOM Content Loaded: ${comprehensiveMetrics.timing.domContentLoaded}ms
- Load Complete: ${comprehensiveMetrics.timing.loadComplete}ms
- First Paint: ${comprehensiveMetrics.timing.firstPaint}ms
- First Contentful Paint: ${comprehensiveMetrics.timing.firstContentfulPaint}ms
- Largest Contentful Paint: ${comprehensiveMetrics.timing.largestContentfulPaint}ms

💾 Memory Usage:
- Used: ${(comprehensiveMetrics.memory.used / 1024 / 1024).toFixed(1)}MB
- Total: ${(comprehensiveMetrics.memory.total / 1024 / 1024).toFixed(1)}MB
- Usage: ${comprehensiveMetrics.memory.usedPercent.toFixed(1)}%

📊 Resources:
- Total: ${comprehensiveMetrics.resources.length}
- Types: ${[
                    ...new Set(comprehensiveMetrics.resources.map((r) => r.initiatorType)),
                ].join(", ")}

Timestamp: ${new Date(comprehensiveMetrics.timestamp).toISOString()}`,
            },
        ],
    };
}
