import { devToolsMonitor } from "../dev-tools-monitor.js";

export async function handleGetConsoleLogs(server: any, args: any) {
  return await devToolsMonitor.getConsoleLogs(args);
}

export async function handleGetNetworkRequests(server: any, args: any) {
  return await devToolsMonitor.getNetworkRequests(args);
}

export async function handleCheckForErrors(server: any, args: any) {
  return await devToolsMonitor.checkForErrors(args);
}
