import { browserManager } from "../browser-manager.js";

export async function handleGetServerState(server: any, args: any) {
  const sessionState = server.logger.getSessionState();
  const browserPage = browserManager.getPage();
  const browserActive = browserManager.getBrowser() !== null;

  return {
    content: [
      {
        type: "text",
        text: `Server State:
- Server Status: ✅ Running
- Browser Launched: ${sessionState.browserLaunched ? "✅ Yes" : "❌ No"}
- Browser Active: ${browserActive ? "✅ Yes" : "❌ No"}
- Current Page: ${browserPage ? "✅ Available" : "❌ None"}
- Monitoring Active: ${sessionState.monitoringActive ? "✅ Yes" : "❌ No"}
- Mocking Active: ${sessionState.mockingActive ? "✅ Yes" : "❌ No"}
- Active Tools: ${
          sessionState.activeTools.length > 0
            ? sessionState.activeTools.join(", ")
            : "None"
        }
- Last Activity: ${sessionState.lastActivity.toISOString()}
- Session Started: ${new Date(
          Date.now() -
            (sessionState.lastActivity.getTime() - new Date().getTime())
        ).toISOString()}`,
      },
    ],
  };
}

export async function handleGetSessionInfo(server: any, args: any) {
  const currentState = server.logger.getSessionState();
  const uptime = Date.now() - currentState.lastActivity.getTime();

  return {
    content: [
      {
        type: "text",
        text: `Session Information:
- Session Uptime: ${Math.round(uptime / 1000)}s
- Browser Status: ${currentState.browserLaunched ? "Connected" : "Disconnected"}
- Monitoring Status: ${currentState.monitoringActive ? "Active" : "Inactive"}
- Mocking Status: ${currentState.mockingActive ? "Active" : "Inactive"}
- Active Tools Count: ${currentState.activeTools.length}
- Active Tools: ${
          currentState.activeTools.length > 0
            ? currentState.activeTools.join(", ")
            : "None"
        }
- Server Version: 1.0.0
- Last Activity: ${currentState.lastActivity.toISOString()}`,
      },
    ],
  };
}
