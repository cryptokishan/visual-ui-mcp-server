// Shared type definitions for the MCP server
// Enhanced error types with recovery suggestions
export class AgentFriendlyError extends Error {
    code;
    recoverySuggestion;
    canRetry;
    constructor(code, message, recoverySuggestion, canRetry = false) {
        super(message);
        this.code = code;
        this.recoverySuggestion = recoverySuggestion;
        this.canRetry = canRetry;
        this.name = "AgentFriendlyError";
    }
}
