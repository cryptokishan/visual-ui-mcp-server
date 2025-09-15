// Server initialization and setup

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { SERVER_CONFIG } from "./config/constants.js";
import { getAllToolDefinitions } from "./tools/registry.js";
import { Logger } from "./utils/helpers.js";
import { handleToolRequest, ToolHandlerContext } from "./tools/handlers.js";

export class VisualUITestingServer {
  private server: Server;
  private logger: Logger;
  private backendMocker?: any; // Import BackendMocker when needed

  constructor() {
    this.logger = new Logger();
    this.server = new Server({
      name: SERVER_CONFIG.name,
      version: SERVER_CONFIG.version,
    });

    this.setupRequestHandlers();
  }

  private setupRequestHandlers() {
    // Setup tool definitions handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolDefinitions = getAllToolDefinitions();
      return {
        tools: toolDefinitions,
      };
    });

    // Setup method call handler using the handlers module
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;

      this.logger.info(`📨 Received tool call: ${name}`);
      if (args) {
        this.logger.debug(`📨 Arguments: ${JSON.stringify(args, null, 2)}`);
      }

      try {
        this.logger.info(`🔧 Executing tool: ${name}`);

        // Create handler context with backend mocker if available
        const context: ToolHandlerContext = {
          server: this.server,
          logger: this.logger,
          backendMocker: this.backendMocker,
        };

        // Handle the tool request
        const result = await handleToolRequest(name, args, context);

        const executionTime = Date.now() - startTime;
        this.logger.success(`✅ Tool ${name} completed in ${executionTime}ms`);

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.logger.error(`❌ Tool execution failed: ${name} (${executionTime}ms) - ${(error as Error).message}`);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${(error as Error).message}`
        );
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.success("Visual UI Testing MCP Server started");
  }

  getServer(): Server {
    return this.server;
  }

  getLogger(): Logger {
    return this.logger;
  }

  // Backend mocker management
  setBackendMocker(mocker: any): void {
    this.backendMocker = mocker;
  }

  getBackendMocker(): any {
    return this.backendMocker;
  }
}
