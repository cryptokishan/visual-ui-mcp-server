declare global {
    var mcpServer: any;
}
declare function globalSetup(): Promise<void>;
export default globalSetup;
