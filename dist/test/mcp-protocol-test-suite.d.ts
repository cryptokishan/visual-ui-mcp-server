import { MCPServer } from "./mcp-test-setup";
/**
 * Test validation result
 */
export interface ToolValidationResult {
    name: string;
    tested: boolean;
    success: boolean;
    errors: string[];
    executionTime: number;
}
/**
 * Comprehensive MCP Protocol Test Suite
 *
 * This suite provides systematic testing of all MCP server functionality
 * through the complete MCP protocol simulation.
 */
export declare class MCPProtocolTestSuite {
    private server;
    private validationResults;
    private startTime;
    constructor(server: MCPServer);
    /**
     * Validates MCP protocol initialization and basic communication
     */
    testProtocolInitialization(): Promise<void>;
    /**
     * Tests state management and session handling
     */
    testStateManagement(): Promise<void>;
    /**
     * Comprehensive browser lifecycle testing
     */
    testBrowserManagement(): Promise<void>;
    /**
     * Tests all element interaction tools in sequence
     */
    testElementInteractions(): Promise<void>;
    /**
     * Tests form interaction capabilities
     */
    testFormInteractions(): Promise<void>;
    /**
     * Tests visual testing tools
     */
    testVisualTesting(): Promise<void>;
    /**
     * Tests developer tools and monitoring
     */
    testDeveloperTools(): Promise<void>;
    /**
     * Tests performance monitoring capabilities
     */
    testPerformanceMonitoring(): Promise<void>;
    /**
     * Tests backend mocking functionality
     */
    testBackendMocking(): Promise<void>;
    /**
     * Tests user journey capabilities
     */
    testJourneyCapabilities(): Promise<void>;
    /**
     * Tests waiting and conditional operations
     */
    testWaitAndRetry(): Promise<void>;
    /**
     * Runs comprehensive protocol compliance test
     */
    runComprehensiveTestSuite(): Promise<void>;
    /**
     * Generates test coverage report
     */
    generateCoverageReport(): void;
}
/**
 * Factory function to create and configure test suite
 */
export declare function createMCPProtocolTestSuite(server: MCPServer): Promise<MCPProtocolTestSuite>;
