import { SessionState, FilePaths } from "../types/interfaces.js";
export declare class Logger {
    private logFile;
    private sessionState;
    private enableConsole;
    constructor();
    private loadSessionState;
    private saveSessionState;
    updateSessionState(updates: Partial<SessionState>): void;
    getSessionState(): SessionState;
    private formatMessage;
    private formatConsoleMessage;
    private logToFile;
    info(message: string): void;
    error(message: string): void;
    debug(message: string): void;
    warn(message: string): void;
    success(message: string): void;
}
export declare function validateArgs(args: any, requiredFields: string[], operation: string): void;
export declare function updateBrowserState(logger: Logger, launched: boolean, monitoring?: boolean, mocking?: boolean, tool?: string): void;
export declare function getFilePaths(): FilePaths;
export declare function formatBytes(bytes: number): string;
export declare function formatDuration(ms: number): string;
export declare function sanitizeFileName(name: string): string;
export declare function parseJsonSafe<T>(data: string, fallback: T): T;
