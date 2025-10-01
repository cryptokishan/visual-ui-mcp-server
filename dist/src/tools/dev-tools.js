import { devToolsMonitor } from "../dev-tools-monitor.js";
export async function handleGetConsoleLogs(server, args) {
    return await devToolsMonitor.getConsoleLogs(args);
}
export async function handleGetNetworkRequests(server, args) {
    return await devToolsMonitor.getNetworkRequests(args);
}
export async function handleCheckForErrors(server, args) {
    return await devToolsMonitor.checkForErrors(args);
}
