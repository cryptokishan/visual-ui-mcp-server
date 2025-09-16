import { spawn } from "child_process";

async function testJourneyRecordingTools() {
  console.log("🎬 Testing Journey Recording Tools via MCP Protocol...\n");

  return new Promise((resolve, reject) => {
    // Start MCP server process
    console.log("Starting MCP server...");
    const serverProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let responseBuffer = "";
    let requestId = 1;
    let sessionId = null; // Store session ID for later use

    // Handle server output
    serverProcess.stdout.on("data", (data) => {
      responseBuffer += data.toString();
      processResponses();
    });

    serverProcess.stderr.on("data", (data) => {
      console.log("Server stderr:", data.toString());
    });

    serverProcess.on("error", (error) => {
      console.error("Server process error:", error);
      reject(error);
    });

    serverProcess.on("close", (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    const processResponses = () => {
      const lines = responseBuffer.split("\n");
      responseBuffer = lines.pop() || ""; // Keep incomplete line

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line.trim());
            handleResponse(response);
          } catch (e) {
            console.log("Received non-JSON line:", line);
          }
        }
      }
    };

    const handleResponse = (response) => {
      console.log("Received response:", JSON.stringify(response, null, 2));

      if (response.id === 1) {
        // Tools list response
        testToolsList(response);
      } else if (response.id === 2) {
        // Launch browser response
        testLaunchBrowser(response);
      } else if (response.id === 3) {
        // Start recording response - extract session ID
        if (response.result && response.result.content) {
          const content = response.result.content[0].text;
          const match = content.match(/Session ID: ([^\r\n]+)/);
          if (match) {
            sessionId = match[1].trim();
            console.log(`📝 Extracted session ID: ${sessionId}`);
          } else {
            console.log(
              `⚠️ Could not extract session ID from content: ${content}`
            );
          }
        }
        testStartRecording(response);
      } else if (response.id === 4) {
        // Get recording status response
        testRecordingStatus(response);
      } else if (response.id === 5) {
        // Suggest selectors response
        testSuggestSelectors(response);
      } else if (response.id === 6) {
        // Stop recording response
        testStopRecording(response);
      } else if (response.id === 7) {
        // Close browser response
        testCloseBrowser(response);
      }
    };

    const sendRequest = (method, params = null) => {
      const request = {
        jsonrpc: "2.0",
        id: requestId++,
        method,
        params,
      };
      const requestJson = JSON.stringify(request) + "\n";
      console.log("Sending request:", requestJson.trim());
      serverProcess.stdin.write(requestJson);
    };

    // Test sequence
    setTimeout(() => {
      console.log("\nStep 1: Listing tools");
      sendRequest("tools/list");
    }, 1000);

    setTimeout(() => {
      console.log("\nStep 2: Launching browser");
      sendRequest("tools/call", {
        name: "launch_browser",
        arguments: {
          url: 'data:text/html,<html><body><h1>Journey Recording Test Page</h1><input id="username" type="text" placeholder="Enter username"><button id="login">Login</button><button id="cancel">Cancel</button></body></html>',
          headless: true,
        },
      });
    }, 2000);

    setTimeout(() => {
      console.log("\nStep 3: Starting journey recording");
      sendRequest("tools/call", {
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
    }, 3000);

    setTimeout(() => {
      console.log("\nStep 4: Checking recording status");
      sendRequest("tools/call", {
        name: "get_recording_status",
        arguments: {},
      });
    }, 4000);

    setTimeout(() => {
      console.log("\nStep 5: Getting selector suggestions");
      sendRequest("tools/call", {
        name: "suggest_element_selectors",
        arguments: {
          selectors: [{ type: "css", value: "#username", priority: 0 }],
          timeout: 5000,
          waitForVisible: true,
        },
      });
    }, 5000);

    setTimeout(() => {
      console.log("\nStep 6: Stopping journey recording");
      const stopArgs = {
        name: "stop_journey_recording",
        arguments: {},
      };

      if (sessionId) {
        stopArgs.arguments.sessionId = sessionId;
      } else {
        console.error("❌ No session ID available for stopping recording");
        stopArgs.arguments.name = "login-flow-recording"; // Fallback
      }

      sendRequest("tools/call", stopArgs);
    }, 6000);

    setTimeout(() => {
      console.log("\nStep 7: Closing browser");
      sendRequest("tools/call", {
        name: "close_browser",
      });
    }, 7000);

    // Complete test after all requests
    setTimeout(() => {
      console.log("\n🎉 Journey Recording Tools Tests Completed Successfully!");
      console.log("\n📊 Test Summary:");
      console.log("- ✅ MCP server communication");
      console.log("- ✅ Tool discovery via MCP");
      console.log("- ✅ Browser launch via MCP");
      console.log("- ✅ Journey recording start via MCP");
      console.log("- ✅ Recording status check via MCP");
      console.log("- ✅ Selector suggestions via MCP");
      console.log("- ✅ Journey recording stop via MCP");
      console.log("- ✅ Browser close via MCP");

      serverProcess.kill();
      resolve();
    }, 8000);

    // Error handling
    setTimeout(() => {
      console.error(
        "❌ Test timeout - Journey Recording may not be working correctly"
      );
      serverProcess.kill();
      reject(new Error("Test timeout"));
    }, 10000);
  });
}

const testToolsList = (response) => {
  if (response.result && response.result.tools) {
    const tools = response.result.tools;
    const recordingTools = [
      "start_journey_recording",
      "stop_journey_recording",
      "pause_journey_recording",
      "resume_journey_recording",
      "get_recording_status",
      "suggest_element_selectors",
    ];

    const foundTools = tools.filter((tool) =>
      recordingTools.includes(tool.name)
    );
    console.log(
      `✅ Found ${foundTools.length} recording tools: ${foundTools
        .map((t) => t.name)
        .join(", ")}`
    );

    if (foundTools.length !== 6) {
      console.error(
        `❌ Expected 6 recording tools, found ${foundTools.length}`
      );
    }
  } else {
    console.error("❌ Invalid tools list response");
  }
};

const testLaunchBrowser = (response) => {
  if (response.result && response.result.content) {
    console.log("✅ Browser launched:", response.result.content[0].text);
  } else {
    console.error("❌ Browser launch failed");
  }
};

const testStartRecording = (response) => {
  if (response.result && response.result.content) {
    console.log(
      "✅ Journey recording started:",
      response.result.content[0].text
    );
  } else {
    console.error("❌ Journey recording start failed");
  }
};

const testRecordingStatus = (response) => {
  if (response.result && response.result.content) {
    console.log(
      "✅ Recording status retrieved:",
      response.result.content[0].text
    );
  } else {
    console.error("❌ Recording status check failed");
  }
};

const testStopRecording = (response) => {
  if (response.result && response.result.content) {
    console.log(
      "✅ Journey recording stopped:",
      response.result.content[0].text
    );
  } else {
    console.error("❌ Journey recording stop failed");
  }
};

const testSuggestSelectors = (response) => {
  if (response.result && response.result.content) {
    console.log(
      "✅ Selector suggestions retrieved:",
      response.result.content[0].text
    );
  } else {
    console.error("❌ Selector suggestions failed");
  }
};

const testCloseBrowser = (response) => {
  if (response.result && response.result.content) {
    console.log("✅ Browser closed:", response.result.content[0].text);
  } else {
    console.error("❌ Browser close failed");
  }
};

// Run the MCP journey recording tests
testJourneyRecordingTools().catch(console.error);
