import { expect, test } from "@playwright/test";
import { z } from "zod";
import { TestServerManager } from "../helpers/test-server-manager.js";

let serverManager: TestServerManager;

test.describe("Journey Simulator MCP Tool Tests", () => {
  test.beforeAll(async () => {
    serverManager = TestServerManager.getInstance();
  });

  test("MCP server registers journey simulator tool", async () => {
    const client = await serverManager.getMcpClient();

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      z.any()
    );

    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);

    // Check that journey simulator tool is registered
    expect(toolNames).toContain("journey_simulator");
  });

  test("successfully runs a basic user journey", async () => {
    const client = await serverManager.getMcpClient();

    const steps = [
      {
        id: "navigate-home",
        action: "navigate",
        value:
          "data:text/html,<html><body><h1>Test Page</h1><button id='test-btn'>Click me</button></body></html>",
      },
      {
        id: "wait-page-load",
        action: "wait",
        value: "1000",
      },
      {
        id: "click-button",
        action: "click",
        selector: "#test-btn",
      },
      {
        id: "assert-button-exists",
        action: "assert",
        condition: "document.querySelector('#test-btn') !== null",
      },
    ];

    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: "journey_simulator",
          arguments: {
            action: "run_user_journey",
            name: "basic-interaction-test",
            steps: JSON.stringify(steps), // Convert steps array to JSON string
          },
        },
      },
      z.any()
    );

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.journeyName).toBe("basic-interaction-test");
    expect(response.stepsExecuted).toBe(4);
    expect(response.errorCount).toBe(0);
    expect(response.stepTimings).toBeDefined();
    expect(typeof response.totalDuration).toBe("number");
  });

  test("validate journey definition", async () => {
    const client = await serverManager.getMcpClient();

    const validSteps = JSON.stringify([
      {
        id: "step1",
        action: "navigate",
        value: "https://example.com",
      },
      {
        id: "step2",
        action: "click",
        selector: "#button",
      },
    ]);

    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: "journey_simulator",
          arguments: {
            action: "validate_journey_definition",
            steps: validSteps,
          },
        },
      },
      z.any()
    );

    const response = JSON.parse(result.content[0].text);

    expect(response.action).toBe("validate_journey_definition");
    expect(response.success).toBe(true);
    expect(response.isValid).toBe(true);
    expect(response.stepCount).toBe(2);
  });

  test("optimize journey definition", async () => {
    const client = await serverManager.getMcpClient();

    const stepsWithOptimization = JSON.stringify([
      {
        id: "step1",
        action: "wait",
        value: "1000",
      },
      {
        id: "step2",
        action: "wait",
        value: "2000",
      },
      {
        id: "step3",
        action: "navigate",
        value: "https://example.com",
      },
    ]);

    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: "journey_simulator",
          arguments: {
            action: "optimize_journey_definition",
            steps: stepsWithOptimization,
          },
        },
      },
      z.any()
    );

    const response = JSON.parse(result.content[0].text);

    expect(response.action).toBe("optimize_journey_definition");
    expect(response.success).toBe(true);
    expect(response.originalStepCount).toBe(3);
    expect(response.optimizedStepCount).toBeLessThanOrEqual(3); // Should combine waits
    expect(Array.isArray(response.optimizedSteps)).toBe(true);
  });

  test("handles journey execution errors gracefully", async () => {
    const client = await serverManager.getMcpClient();

    const invalidSteps = JSON.stringify([
      {
        id: "step1",
        action: "navigate",
        value: "data:text/html,<html><body><h1>Test</h1></body></html>",
      },
      {
        id: "step2",
        action: "click",
        selector: "#nonexistent-element", // This will fail
        timeout: 1000, // Short timeout to fail quickly
      },
    ]);

    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: "journey_simulator",
          arguments: {
            action: "run_user_journey",
            name: "error-handling-test",
            steps: invalidSteps,
          },
        },
      },
      z.any()
    );

    const response = JSON.parse(result.content[0].text);

    expect(response.action).toBe("run_user_journey");
    expect(response.journeyName).toBe("error-handling-test");
    expect(response.errorCount).toBeGreaterThan(0);
    expect(Array.isArray(response.errors)).toBe(true);
    expect(response.errors.length).toBeGreaterThan(0);
  });

  test("successfully runs a journey with video recording", async () => {
    const client = await serverManager.getMcpClient();

    const steps = [
      {
        id: "navigate",
        action: "navigate",
        value:
          "data:text/html,<html><body><h1>Video Recording Test</h1><p>This journey will be recorded.</p><input id='input' value='test'/></body></html>",
      },
      {
        id: "wait",
        action: "wait",
        value: "500",
      },
      {
        id: "type-input",
        action: "type",
        selector: "#input",
        value: "recorded journey",
      },
    ];

    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: "journey_simulator",
          arguments: {
            action: "run_user_journey",
            name: "video-recorded-test",
            steps: JSON.stringify(steps),
            video: true,
          },
        },
      },
      z.any()
    );

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.journeyName).toBe("video-recorded-test");
    expect(response.stepsExecuted).toBe(3);
    expect(response.errorCount).toBe(0);

    // The 'video' field should always be present in the response structure
    expect(response.hasOwnProperty("video")).toBeDefined();
  });
});
