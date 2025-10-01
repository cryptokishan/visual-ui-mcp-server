import { spawn } from "child_process";
export interface MCPServer {
    process: ReturnType<typeof spawn>;
    responseBuffer: string;
    requestId: number;
    pendingRequests: Map<number, {
        resolve: (value?: any) => void;
        reject: (reason?: any) => void;
        timer?: NodeJS.Timeout;
    }>;
}
export interface MCPRequest {
    jsonrpc: "2.0";
    id: number;
    method: string;
    params?: unknown;
}
export interface MCPResponse {
    jsonrpc: "2.0";
    id: number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
    };
}
/**
 * Creates and starts an MCP server process for testing using npm run dev
 */
export declare function startMCPServer(): Promise<MCPServer>;
/**
 * Sends a JSON-RPC request to the MCP server
 */
export declare function sendMCPRequest(server: MCPServer, method: string, params?: unknown): Promise<any>;
/**
 * Stops the MCP server process
 */
export declare function stopMCPServer(server: MCPServer): void;
/**
 * Initializes MCP connection and returns server info
 */
export declare function initializeMCPConnection(server: MCPServer): Promise<any>;
/**
 * Gets available tools from the MCP server
 */
export declare function getMCPTools(server: MCPServer): Promise<any>;
/**
 * Validates that expected tools are available
 */
export declare function validateToolsAvailability(availableTools: any[], expectedTools: string[]): void;
