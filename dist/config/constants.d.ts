export declare const DEFAULT_RETRY_CONFIG: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
};
export declare const colors: {
    reset: string;
    bright: string;
    dim: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    gray: string;
    bgRed: string;
    bgGreen: string;
    bgYellow: string;
    bgBlue: string;
    bgMagenta: string;
    bgCyan: string;
};
export declare const SERVER_CONFIG: {
    name: string;
    version: string;
};
export declare const DEFAULT_SESSION_STATE: {
    browserLaunched: boolean;
    monitoringActive: boolean;
    mockingActive: boolean;
    lastActivity: Date;
    activeTools: never[];
};
export declare const DIRECTORIES: {
    logs: string;
    screenshots: string;
    baselines: string;
};
export declare const LOG_FILES: {
    server: string;
    session: string;
};
