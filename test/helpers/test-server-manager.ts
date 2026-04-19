import { access } from "fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * TestServerManager manages MCP test clients and shared test prerequisites.
 * The stdio transport owns the actual server child process for each client.
 */
export class TestServerManager {
  private static instance: TestServerManager;
  private isStarted = false;
  private activeClients = new Set<Client>();

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
   * Prepare the built server artifact used by test clients.
   */
  public async startServer(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    try {
      await access("dist/index.js");
      this.isStarted = true;
    } catch {
      throw new Error(
        "Missing dist/index.js. Run `npm run build` before executing E2E tests."
      );
    }
  }

  /**
   * Close all active MCP clients started by the test suite.
   */
  public async stopServer(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    await Promise.all(
      Array.from(this.activeClients).map(async (client) => {
        try {
          await client.close();
        } catch (error) {
          console.error("Failed to close MCP client", error);
        }
      })
    );

    this.activeClients.clear();
    this.isStarted = false;
  }

  /**
   * Check if the test manager has been initialized.
   */
  public isServerRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Create and return a new MCP client instance connected to the server.
   * Each call creates a fresh stdio-backed server process for isolation.
   */
  public async getMcpClient(): Promise<Client> {
    await this.startServer();

    try {
      const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
      });

      const client = new Client(
        {
          name: "test-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      this.activeClients.add(client);

      return client;
    } catch (error) {
      console.error("Failed to create MCP client", error);
      throw error;
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    TestServerManager.instance = null as any;
  }
}
