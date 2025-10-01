import { spawn } from "child_process";
/**
 * Creates and starts an MCP server process for testing using npm run dev
 */
export async function startMCPServer() {
    const serverProcess = spawn("npm", ["run", "dev"], {
        stdio: ["pipe", "pipe", "pipe"],
    });
    let responseBuffer = "";
    let requestId = 1;
    const pendingRequests = new Map();
    // Wait for server to be ready - listen to both stdout and stderr
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Server startup timeout"));
        }, 15000); // Increased timeout for npm run dev
        const checkReady = (data) => {
            if (data.toString().includes("🚀 Visual UI Testing MCP Server started and ready")) {
                clearTimeout(timeout);
                serverProcess.stdout.off("data", checkReady);
                serverProcess.stderr.off("data", checkReady);
                console.log("✅ MCP server ready for testing");
                resolve();
            }
        };
        serverProcess.stdout.on("data", checkReady);
        serverProcess.stderr.on("data", checkReady);
    });
    // Handle responses from stdout
    serverProcess.stdout.on("data", (data) => {
        responseBuffer += data.toString();
        processResponses();
    });
    const processResponses = () => {
        const lines = responseBuffer.split("\n");
        responseBuffer = lines.pop() || "";
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const response = JSON.parse(line.trim());
                    const pending = pendingRequests.get(response.id);
                    if (pending) {
                        pendingRequests.delete(response.id);
                        if (pending.timer)
                            clearTimeout(pending.timer);
                        if (response.error) {
                            pending.reject(new Error(`MCP Error: ${response.error.message}`));
                        }
                        else {
                            pending.resolve(response.result);
                        }
                    }
                }
                catch (e) {
                    // Ignore non-JSON lines
                }
            }
        }
    };
    return {
        process: serverProcess,
        responseBuffer,
        requestId,
        pendingRequests,
    };
}
/**
 * Sends a JSON-RPC request to the MCP server
 */
export function sendMCPRequest(server, method, params) {
    return new Promise((resolve, reject) => {
        const request = {
            jsonrpc: "2.0",
            id: server.requestId++,
            method,
        };
        if (params !== undefined && params !== null) {
            request.params = params;
        }
        const timer = setTimeout(() => {
            const pending = server.pendingRequests.get(request.id);
            if (pending) {
                server.pendingRequests.delete(server.requestId);
                reject(new Error(`Request timeout for ${method}`));
            }
        }, 10000);
        server.pendingRequests.set(request.id, { resolve, reject, timer });
        server.process.stdin?.write(JSON.stringify(request) + "\n");
        if (!server.process.stdin) {
            server.pendingRequests.delete(server.requestId - 1);
            clearTimeout(timer);
            reject(new Error("Server stdin not available"));
        }
    });
}
/**
 * Stops the MCP server process
 */
export function stopMCPServer(server) {
    server.pendingRequests.forEach(({ reject }) => reject(new Error("Server stopped")));
    server.pendingRequests.clear();
    if (server.process.stdin)
        server.process.stdin.end();
    if (!server.process.killed) {
        server.process.kill("SIGTERM");
    }
}
/**
 * Initializes MCP connection and returns server info
 */
export async function initializeMCPConnection(server) {
    const initResponse = await sendMCPRequest(server, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
            name: "mcp-test-client",
            version: "1.0.0",
        },
    });
    if (initResponse?.error) {
        throw new Error(`MCP Initialization failed: ${initResponse.error.message}`);
    }
    return initResponse;
}
/**
 * Gets available tools from the MCP server
 */
export async function getMCPTools(server) {
    const toolsResponse = await sendMCPRequest(server, "tools/list");
    if (toolsResponse?.error) {
        throw new Error(`Failed to get tools: ${toolsResponse.error.message}`);
    }
    return toolsResponse.tools;
}
/**
 * Validates that expected tools are available
 */
export function validateToolsAvailability(availableTools, expectedTools) {
    const foundTools = availableTools.filter((tool) => expectedTools.includes(tool.name));
    if (foundTools.length !== expectedTools.length) {
        const foundNames = foundTools.map((tool) => tool.name);
        const missingTools = expectedTools.filter((name) => !foundNames.includes(name));
        throw new Error(`Missing expected tools: ${missingTools.join(", ")}`);
    }
}
