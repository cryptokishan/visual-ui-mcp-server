import { Page, Request } from 'playwright';
export interface MockRule {
    id?: string;
    url: string | RegExp;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    response: {
        status: number;
        headers?: Record<string, string>;
        body?: any;
        delay?: number;
    };
    condition?: (request: Request) => boolean;
    priority?: number;
}
export interface MockConfig {
    name: string;
    description?: string;
    rules: MockRule[];
    enabled: boolean;
    persistToFile?: boolean;
}
export interface MockedRequest {
    id: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    timestamp: number;
    mockRule?: MockRule;
    response: {
        status: number;
        headers: Record<string, string>;
        body: any;
    };
}
export declare class BackendMocker {
    private mockRules;
    private mockedRequests;
    private isEnabled;
    private currentPage?;
    private ruleCounter;
    /**
     * Load mock configuration from a file or object
     */
    loadMockConfig(config: MockConfig | string): Promise<void>;
    /**
     * Save current mock configuration to file
     */
    saveMockConfig(name: string): Promise<void>;
    /**
     * Enable request interception and mocking for a page
     */
    enableMocking(page: Page): Promise<void>;
    /**
     * Disable request interception and mocking
     */
    disableMocking(page: Page): Promise<void>;
    /**
     * Add a new mock rule
     */
    addMockRule(rule: MockRule): Promise<string>;
    /**
     * Remove a mock rule
     */
    removeMockRule(ruleId: string): Promise<void>;
    /**
     * Update an existing mock rule
     */
    updateMockRule(ruleId: string, updates: Partial<MockRule>): Promise<void>;
    /**
     * Get all active mock rules
     */
    getMockRules(): Promise<MockRule[]>;
    /**
     * Get history of mocked requests
     */
    getMockedRequests(): Promise<MockedRequest[]>;
    /**
     * Clear all mock rules
     */
    clearAllMocks(): Promise<void>;
    /**
     * Reset request history
     */
    resetRequestHistory(): Promise<void>;
    /**
     * Handle intercepted requests
     */
    private handleRequest;
    /**
     * Find matching mock rule for a request
     */
    private findMatchingRule;
    /**
     * Check if URL matches rule pattern
     */
    private matchesUrl;
    /**
     * Check if request headers match rule headers
     */
    private matchesHeaders;
    /**
     * Mock the response for a matched request
     */
    private mockResponse;
    /**
     * Generate dynamic response content with templating
     */
    private generateDynamicResponse;
    /**
     * Generate a simple UUID
     */
    private generateUUID;
}
