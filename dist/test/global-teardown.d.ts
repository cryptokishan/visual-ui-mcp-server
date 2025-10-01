declare global {
    var mcpServer: any;
}
declare function globalTeardown(): Promise<void>;
export default globalTeardown;
