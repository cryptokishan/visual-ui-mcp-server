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
      return;
    }

    try {
      // Start the server process with current environment (assumes dist/index.js is already built)
      this.serverProcess = spawn("node", ["dist/index.js"], {
        stdio: ["ignore", "pipe", "pipe"], // Capture stdout/stderr to see logs during tests
        env: { ...process.env }, // Pass current environment to server process
      });

      // Forward logs to test output for visibility
      this.serverProcess.stdout?.on("data", (data) => {
        console.log(`Server stdout: ${data.toString().trim()}`);
      });

      this.serverProcess.stderr?.on("data", (data) => {
        console.error(`Server stderr: ${data.toString().trim()}`);
      });

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.isStarted = true;
    } catch (error) {
      console.error("Failed to start server", error);
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

      return client;
    } catch (error) {
      console.error("❌ TestServerManager: Failed to create MCP client", error);
      throw error;
    }
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
