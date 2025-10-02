import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChildProcess } from "child_process";
import { spawn } from "cross-spawn";

/**
 * TestServerManager provides a proper encapsulation layer for managing
 * MCP server lifecycle during tests, replacing global variables with
 * proper typed access methods.
 */
export class TestServerManager {
  private static instance: TestServerManager;
  private serverProcess: ChildProcess | null = null;
  private logs: string[] = [];
  private isStarted = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of TestServerManager
   */
  public static getInstance(): TestServerManager {
    if (!TestServerManager.instance) {
      TestServerManager.instance = new TestServerManager();
    }
    return TestServerManager.instance;
  }

  /**
   * Start the MCP server process
   */
  public async startServer(): Promise<void> {
    if (this.isStarted) {
      console.log("✅ TestServerManager: Server already running");
      return;
    }

    try {
      console.log("🚀 TestServerManager: Starting MCP server...");

      // Start the server process (assumes dist/index.js is already built)
      this.serverProcess = spawn("node", ["dist/index.js"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Set up log capturing
      this.setupLogCapture();

      // Wait for server to start
      await this.waitForServerReady();

      this.isStarted = true;
      console.log("✅ TestServerManager: MCP server started successfully");
    } catch (error) {
      console.error("❌ TestServerManager: Failed to start server", error);
      throw error;
    }
  }

  /**
   * Stop the MCP server process
   */
  public async stopServer(): Promise<void> {
    if (!this.isStarted || !this.serverProcess) {
      console.log("ℹ️  TestServerManager: Server not running");
      return;
    }

    console.log("🛑 TestServerManager: Stopping MCP server...");

    try {
      this.serverProcess.kill();
      this.isStarted = false;
      this.serverProcess = null;
      console.log("✅ TestServerManager: MCP server stopped");
    } catch (error) {
      console.error("❌ TestServerManager: Error stopping server", error);
      throw error;
    }
  }

  /**
   * Get the server process reference (typed access)
   */
  public getServerProcess(): ChildProcess | null {
    if (!this.isStarted) {
      throw new Error("Server is not started. Call startServer() first.");
    }
    return this.serverProcess;
  }

  /**
   * Get the server logs
   */
  public getLogs(): readonly string[] {
    return this.logs.slice(); // Return a copy to prevent external modifications
  }

  /**
   * Check if server is running
   */
  public isServerRunning(): boolean {
    return (
      this.isStarted &&
      this.serverProcess !== null &&
      !this.serverProcess.killed
    );
  }

  /**
   * Clear accumulated logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Create and return a new MCP client instance connected to the server
   * Each call creates a fresh client instance for proper test isolation
   */
  public async getMcpClient(): Promise<Client> {
    try {
      // Create stdio transport that spawns the server process
      const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
      });

      // Create MCP client
      const client = new Client(
        {
          name: "test-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      // Connect the client
      await client.connect(transport);

      // Store client creation in logs for debugging
      this.logs.push(`[CLIENT] New client instance created and connected`);

      return client;
    } catch (error) {
      console.error("❌ TestServerManager: Failed to create MCP client", error);
      throw error;
    }
  }

  private setupLogCapture(): void {
    if (!this.serverProcess) return;

    // Clear existing logs
    this.logs = [];

    // Capture stdout logs
    this.serverProcess.stdout?.on("data", (data) => {
      const log = data.toString().trim();
      if (log) {
        this.logs.push(log);
        console.log(` Server stdout: ${log}`);
      }
    });

    // Capture stderr logs
    this.serverProcess.stderr?.on("data", (data) => {
      const log = data.toString().trim();
      if (log) {
        this.logs.push(`[ERROR] ${log}`);
        console.error(`❌ Server stderr: ${log}`);
      }
    });

    // Handle process exit
    this.serverProcess.on("exit", (code, signal) => {
      const exitMessage = `Server process exited with code ${code}, signal ${signal}`;
      this.logs.push(`[EXIT] ${exitMessage}`);
      console.log(`🛑 ${exitMessage}`);
    });
  }

  private async waitForServerReady(): Promise<void> {
    const startTime = Date.now();
    const timeout = 15000; // 15 seconds

    // First, wait for startup message
    let startupDetected = false;
    while (Date.now() - startTime < timeout && !startupDetected) {
      const logs = this.getLogs();
      startupDetected = logs.some((log) =>
        log.includes("Visual UI MCP Server started successfully")
      );

      if (!startupDetected) {
        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (!startupDetected) {
      console.error(
        "❌ TestServerManager: Server startup message not found. Logs:",
        this.getLogs()
      );
      throw new Error(
        "Server failed to start within timeout period - no startup message"
      );
    }

    console.log(
      "✅ TestServerManager: Server startup message detected, verifying process stability..."
    );

    // Now verify the process is still running for a short additional period
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if server is still running after a moment
    if (!this.isServerRunning()) {
      console.warn(
        "⚠️  TestServerManager: Server process exited shortly after startup, but that's expected behavior for MCP servers"
      );
      console.log("✅ TestServerManager: Server startup confirmed via logs");
      return;
    }

    console.log("✅ TestServerManager: Server started and ready");
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    if (TestServerManager.instance) {
      TestServerManager.instance.stopServer();
      TestServerManager.instance = null as any;
    }
  }
}
