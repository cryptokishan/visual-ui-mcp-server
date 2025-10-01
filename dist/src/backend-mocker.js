import * as fs from 'fs-extra';
import * as path from 'path';
export class BackendMocker {
    mockRules = new Map();
    mockedRequests = [];
    isEnabled = false;
    currentPage;
    ruleCounter = 0;
    /**
     * Load mock configuration from a file or object
     */
    async loadMockConfig(config) {
        let mockConfig;
        if (typeof config === 'string') {
            // Load from file
            const configPath = path.resolve(config);
            if (!await fs.pathExists(configPath)) {
                throw new Error(`Mock configuration file not found: ${configPath}`);
            }
            mockConfig = await fs.readJson(configPath);
        }
        else {
            mockConfig = config;
        }
        // Clear existing rules
        this.clearAllMocks();
        // Add new rules
        for (const rule of mockConfig.rules) {
            await this.addMockRule(rule);
        }
        if (mockConfig.persistToFile) {
            await this.saveMockConfig(mockConfig.name);
        }
        console.log(`✅ Loaded mock configuration: ${mockConfig.name} with ${mockConfig.rules.length} rules`);
    }
    /**
     * Save current mock configuration to file
     */
    async saveMockConfig(name) {
        const config = {
            name,
            description: `Auto-saved mock configuration`,
            rules: Array.from(this.mockRules.values()),
            enabled: this.isEnabled,
            persistToFile: true
        };
        const configPath = path.resolve(`mocks/${name}.json`);
        await fs.ensureDir(path.dirname(configPath));
        await fs.writeJson(configPath, config, { spaces: 2 });
        console.log(`💾 Saved mock configuration to: ${configPath}`);
    }
    /**
     * Enable request interception and mocking for a page
     */
    async enableMocking(page) {
        this.currentPage = page;
        this.isEnabled = true;
        // Enable request interception
        await page.route('**/*', (route) => this.handleRequest(route));
        console.log('🎭 Backend mocking enabled for page');
    }
    /**
     * Disable request interception and mocking
     */
    async disableMocking(page) {
        this.isEnabled = false;
        this.currentPage = undefined;
        // Disable request interception
        await page.unroute('**/*');
        console.log('🚫 Backend mocking disabled');
    }
    /**
     * Add a new mock rule
     */
    async addMockRule(rule) {
        const ruleId = rule.id || `rule_${++this.ruleCounter}`;
        const mockRule = {
            ...rule,
            id: ruleId,
            priority: rule.priority || 0
        };
        this.mockRules.set(ruleId, mockRule);
        console.log(`➕ Added mock rule: ${ruleId} for ${rule.method || 'ALL'} ${rule.url}`);
        return ruleId;
    }
    /**
     * Remove a mock rule
     */
    async removeMockRule(ruleId) {
        if (this.mockRules.has(ruleId)) {
            this.mockRules.delete(ruleId);
            console.log(`➖ Removed mock rule: ${ruleId}`);
        }
        else {
            throw new Error(`Mock rule not found: ${ruleId}`);
        }
    }
    /**
     * Update an existing mock rule
     */
    async updateMockRule(ruleId, updates) {
        if (!this.mockRules.has(ruleId)) {
            throw new Error(`Mock rule not found: ${ruleId}`);
        }
        const existingRule = this.mockRules.get(ruleId);
        const updatedRule = {
            ...existingRule,
            ...updates,
            id: ruleId // Ensure ID doesn't change
        };
        this.mockRules.set(ruleId, updatedRule);
        console.log(`🔄 Updated mock rule: ${ruleId}`);
    }
    /**
     * Get all active mock rules
     */
    async getMockRules() {
        return Array.from(this.mockRules.values()).sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    /**
     * Get history of mocked requests
     */
    async getMockedRequests() {
        return [...this.mockedRequests];
    }
    /**
     * Clear all mock rules
     */
    async clearAllMocks() {
        this.mockRules.clear();
        this.ruleCounter = 0;
        console.log('🧹 Cleared all mock rules');
    }
    /**
     * Reset request history
     */
    async resetRequestHistory() {
        this.mockedRequests = [];
        console.log('🔄 Reset mock request history');
    }
    /**
     * Handle intercepted requests
     */
    async handleRequest(route) {
        if (!this.isEnabled) {
            await route.continue();
            return;
        }
        const request = route.request();
        const url = request.url();
        const method = request.method();
        // Find matching mock rule
        const matchingRule = this.findMatchingRule(url, method, request);
        if (matchingRule) {
            // Mock the response
            await this.mockResponse(route, request, matchingRule);
        }
        else {
            // Continue with original request
            await route.continue();
        }
    }
    /**
     * Find matching mock rule for a request
     */
    findMatchingRule(url, method, request) {
        const rules = Array.from(this.mockRules.values())
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const rule of rules) {
            // Check URL match
            if (!this.matchesUrl(url, rule.url)) {
                continue;
            }
            // Check method match
            if (rule.method && rule.method !== method) {
                continue;
            }
            // Check headers match
            if (rule.headers && !this.matchesHeaders(request.headers(), rule.headers)) {
                continue;
            }
            // Check custom condition
            if (rule.condition && !rule.condition(request)) {
                continue;
            }
            return rule;
        }
        return null;
    }
    /**
     * Check if URL matches rule pattern
     */
    matchesUrl(url, pattern) {
        if (typeof pattern === 'string') {
            // Simple string match or wildcard
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(url);
            }
            return url.includes(pattern);
        }
        else {
            // RegExp match
            return pattern.test(url);
        }
    }
    /**
     * Check if request headers match rule headers
     */
    matchesHeaders(requestHeaders, ruleHeaders) {
        for (const [key, value] of Object.entries(ruleHeaders)) {
            const requestValue = requestHeaders[key];
            if (!requestValue) {
                return false;
            }
            if (value.includes('*')) {
                const regex = new RegExp(value.replace(/\*/g, '.*'));
                if (!regex.test(requestValue)) {
                    return false;
                }
            }
            else if (requestValue !== value) {
                return false;
            }
        }
        return true;
    }
    /**
     * Mock the response for a matched request
     */
    async mockResponse(route, request, rule) {
        const response = rule.response;
        // Add delay if specified
        if (response.delay) {
            await new Promise(resolve => setTimeout(resolve, response.delay));
        }
        // Prepare response body
        let body = response.body;
        if (typeof body === 'object') {
            body = JSON.stringify(body);
        }
        // Prepare response headers
        const headers = {
            'Content-Type': 'application/json',
            ...response.headers
        };
        // Fulfill the route with mock response
        await route.fulfill({
            status: response.status,
            headers,
            body: body ? body : undefined
        });
        // Record the mocked request
        const mockedRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            timestamp: Date.now(),
            mockRule: rule,
            response: {
                status: response.status,
                headers,
                body: response.body
            }
        };
        // Try to get request body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(request.method())) {
            try {
                const requestBody = request.postData();
                if (requestBody) {
                    mockedRequest.body = requestBody;
                }
            }
            catch (error) {
                // Ignore errors when getting request body
            }
        }
        this.mockedRequests.push(mockedRequest);
        console.log(`🎭 Mocked ${request.method()} ${request.url()} → ${response.status}`);
    }
    /**
     * Generate dynamic response content with templating
     */
    generateDynamicResponse(template) {
        if (typeof template === 'string') {
            // Simple templating with {{variable}} syntax
            return template
                .replace(/\{\{random\}\}/g, Math.random().toString(36).substr(2, 9))
                .replace(/\{\{timestamp\}\}/g, Date.now().toString())
                .replace(/\{\{uuid\}\}/g, this.generateUUID());
        }
        if (typeof template === 'object' && template !== null) {
            const result = Array.isArray(template) ? [] : {};
            for (const [key, value] of Object.entries(template)) {
                result[key] = this.generateDynamicResponse(value);
            }
            return result;
        }
        return template;
    }
    /**
     * Generate a simple UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
