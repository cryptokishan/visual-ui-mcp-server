import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Logger } from "./utils/helpers.js";
export declare class VisualUITestingServer {
    private server;
    private logger;
    private backendMocker?;
    constructor();
    private setupRequestHandlers;
    start(): Promise<void>;
    getServer(): Server;
    getLogger(): Logger;
    setBackendMocker(mocker: any): void;
    getBackendMocker(): any;
}
