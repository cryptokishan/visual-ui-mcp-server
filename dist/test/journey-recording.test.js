import { expect, test } from "@playwright/test";
import { spawn } from "child_process";
// Helper to start MCP server and communicate via JSON-RPC
async function runJourneyRecordingTest() {
    return new Promise((resolve, reject) => {
        const serverProcess = spawn("node", ["dist/index.js"], {
            stdio: ["pipe", "pipe", "pipe"],
        });
        let responseBuffer = "";
        let requestId = 1;
        const pendingRequests = new Map();
        // Wait for server to be ready
        const readyPromise = new Promise((readyResolve, readyReject) => {
            const timeout = setTimeout(() => {
                readyReject(new Error("Server startup timeout"));
            }, 10000);
            const checkReady = (data) => {
                if (data
                    .toString()
                    .includes("🚀 Visual UI Testing MCP Server started and ready")) {
                    clearTimeout(timeout);
                    serverProcess.stderr.off("data", checkReady);
                    readyResolve();
                }
            };
            serverProcess.stderr.on("data", checkReady);
        });
        serverProcess.stdout.on("data", (data) => {
            responseBuffer += data.toString();
            processResponses();
        });
        serverProcess.stderr.on("data", (data) => {
            // Optionally log: console.log('Server stderr:', data.toString());
        });
        serverProcess.on("error", (error) => {
            reject(error);
        });
        serverProcess.on("close", (code) => {
            // Optionally log: console.log(`Server process exited with code ${code}`);
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
                                pending.resolve(response);
                            }
                        }
                    }
                    catch (e) {
                        // Ignore non-JSON lines
                    }
                }
            }
        };
        const sendRequest = (method, params) => {
            return new Promise((resolve, reject) => {
                const request = {
                    jsonrpc: "2.0",
                    id: requestId++,
                    method,
                };
                if (params !== undefined && params !== null) {
                    request.params = params;
                }
                const timer = setTimeout(() => {
                    if (pendingRequests.has(request.id)) {
                        pendingRequests.delete(request.id);
                        reject(new Error(`Request timeout for ${method}`));
                    }
                }, 10000);
                pendingRequests.set(request.id, { resolve, reject, timer });
                serverProcess.stdin.write(JSON.stringify(request) + "\n");
            });
        };
        (async () => {
            try {
                // Initialize MCP connection first
                const initResponse = await sendRequest("initialize", {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: {
                        name: "mcp-test-client",
                        version: "1.0.0",
                    },
                });
                expect(initResponse.result?.protocolVersion).toBe("2024-11-05");
                // Test 1: Listing tools
                const toolsResponse = await sendRequest("tools/list");
                expect(toolsResponse.result?.tools?.length).toBeGreaterThan(0);
                const tools = toolsResponse.result.tools;
                const recordingTools = [
                    "start_journey_recording",
                    "stop_journey_recording",
                    "pause_journey_recording",
                    "resume_journey_recording",
                    "get_recording_status",
                    "suggest_element_selectors",
                ];
                const foundTools = tools.filter((tool) => recordingTools.includes(tool.name));
                expect(foundTools.length).toBe(6);
                // Test 2: Launching browser
                const browserResponse = await sendRequest("tools/call", {
                    name: "launch_browser",
                    arguments: {
                        url: 'data:text/html,<html><body><h1>Journey Recording Test Page</h1><input id="username" type="text" placeholder="Enter username"><button id="login">Login</button><button id="cancel">Cancel</button></body></html>',
                        headless: true,
                    },
                });
                expect(browserResponse.result?.content?.[0]?.text).toBeDefined();
                // Test 3: Starting journey recording
                const startRecordingResponse = await sendRequest("tools/call", {
                    name: "start_journey_recording",
                    arguments: {
                        name: "login-flow-recording",
                        description: "Recording user login workflow",
                        filter: {
                            excludeActions: ["scroll"],
                            minInteractionDelay: 100,
                        },
                        autoSelectors: true,
                    },
                });
                expect(startRecordingResponse.result?.content?.[0]?.text).toBeDefined();
                // Test 4: Checking recording status
                const statusResponse = await sendRequest("tools/call", {
                    name: "get_recording_status",
                    arguments: {},
                });
                expect(statusResponse.result?.content?.[0]?.text).toBeDefined();
                // Test 5: Getting selector suggestions
                const selectorResponse = await sendRequest("tools/call", {
                    name: "suggest_element_selectors",
                    arguments: {
                        selectors: [{ type: "css", value: "#username", priority: 0 }],
                        timeout: 5000,
                        waitForVisible: true,
                    },
                });
                expect(selectorResponse.result?.content?.[0]?.text).toBeDefined();
                // Test 6: Stopping journey recording
                const stopRecordingResponse = await sendRequest("tools/call", {
                    name: "stop_journey_recording",
                    arguments: {},
                });
                expect(stopRecordingResponse.result?.content?.[0]?.text).toBeDefined();
                // Test 7: Closing browser
                const closeResponse = await sendRequest("tools/call", {
                    name: "close_browser",
                    arguments: {},
                });
                expect(closeResponse.result?.content?.[0]?.text).toBeDefined();
                resolve();
            }
            catch (error) {
                reject(error);
            }
            finally {
                if (!serverProcess.killed)
                    serverProcess.kill();
            }
        })();
    });
}
test("MCP journey recording tools work end-to-end", async () => {
    await runJourneyRecordingTest();
});
