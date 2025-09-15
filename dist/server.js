// Server initialization and setup
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { SERVER_CONFIG } from "./config/constants.js";
import { getAllToolDefinitions } from "./tools/registry.js";
import { Logger } from "./utils/helpers.js";
import { handleToolRequest } from "./tools/handlers.js";
export class VisualUITestingServer {
    server;
    logger;
    backendMocker; // Import BackendMocker when needed
    constructor() {
        this.logger = new Logger();
        this.server = new Server({
            name: SERVER_CONFIG.name,
            version: SERVER_CONFIG.version,
        });
        this.setupRequestHandlers();
    }
    setupRequestHandlers() {
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
                const context = {
                    server: this.server,
                    logger: this.logger,
                    backendMocker: this.backendMocker,
                };
                // Handle the tool request
                const result = await handleToolRequest(name, args, context);
                const executionTime = Date.now() - startTime;
                this.logger.success(`✅ Tool ${name} completed in ${executionTime}ms`);
                return result;
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                this.logger.error(`❌ Tool execution failed: ${name} (${executionTime}ms) - ${error.message}`);
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
            }
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.success("Visual UI Testing MCP Server started");
    }
    getServer() {
        return this.server;
    }
    getLogger() {
        return this.logger;
    }
    // Backend mocker management
    setBackendMocker(mocker) {
        this.backendMocker = mocker;
    }
    getBackendMocker() {
        return this.backendMocker;
    }
}
