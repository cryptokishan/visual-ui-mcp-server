#!/usr/bin/env node
export declare class SecurityUtils {
    static validateFileName(fileName: string): string;
    static validateFilePath(filePath: string, allowedDirectories?: string[]): string;
    static sanitizeErrorMessage(error: Error): string;
    static getAllowedDirectories(): string[];
}
declare class AgentFriendlyError extends Error {
    code: string;
    recoverySuggestion: string;
    canRetry: boolean;
    constructor(code: string, message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class BrowserError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class ElementLocatorError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class FormHandlerError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class VisualTestingError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class PerformanceMonitorError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class JourneyError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class BackendMockError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class FileSystemError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class ValidationError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class NetworkError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export declare class TimeoutError extends AgentFriendlyError {
    constructor(message: string, recoverySuggestion: string, canRetry?: boolean);
}
export {};
