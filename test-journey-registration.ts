const { TestServerManager } = require('./test/helpers/test-server-manager.js');

async function testJourneyRegistration() {
  console.log("Testing journey simulator tool registration...");

  const serverManager = TestServerManager.getInstance();

  try {
    await serverManager.startServer();
    console.log("✅ Server started successfully");

    const client = await serverManager.getMcpClient();
    console.log("✅ MCP client connected");

    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      {}
    );

    console.log("📋 Available tools:");
    console.log(toolsResponse.tools.map(t => t.name));

    const journeyTool = toolsResponse.tools.find(t => t.name === "journey_simulator");

    if (journeyTool) {
      console.log("✅ SUCCESS: journey_simulator tool is registered!");
      console.log("Description:", journeyTool.description);
    } else {
      console.log("❌ FAILURE: journey_simulator tool NOT registered");
      console.log("Expected tools:", ["locate_element", "form_handler", "wait_helper", "browser_monitor", "visual_testing", "journey_simulator"]);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await serverManager.stopServer();
    console.log("🛑 Server stopped");
  }
}

testJourneyRegistration();
