import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BackendMocker } from "../backend-mocker.js";
import { BrowserMonitor } from "../browser-monitor.js";
import { ElementLocator } from "../element-locator.js";
import { FormHandler } from "../form-handler.js";
import { JourneySimulator } from "../journey-simulator.js";
import { PerformanceMonitor } from "../performance-monitor.js";
import { Logger } from "../utils/helpers.js";
export interface ToolHandlerContext {
    server: Server;
    logger: Logger;
    elementLocator?: ElementLocator | null;
    formHandler?: FormHandler | null;
    browserMonitor?: BrowserMonitor | null;
    journeySimulator?: JourneySimulator | null;
    performanceMonitor?: PerformanceMonitor | null;
    backendMocker?: BackendMocker | null;
}
export declare function validateBrowserState(logger: Logger, operation: string, requiresActivePage?: boolean): void;
export declare function validateMonitoringState(logger: Logger, operation: string, requiresActive?: boolean): void;
export declare function handleLaunchBrowser(args: any, logger: Logger, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleCloseBrowser(args: any, logger: Logger): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleFindElement(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleFillForm(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleSubmitForm(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleClickElement(args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleTypeText(args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetElementText(args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleTakeElementScreenshot(args: any, logger: Logger): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleTakeResponsiveScreenshots(args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetJourneyScreenshots(args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleLoadMockConfig(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleSaveMockConfig(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleAddMockRule(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleRemoveMockRule(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleUpdateMockRule(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetMockRules(context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleEnableBackendMocking(context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleDisableBackendMocking(context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleGetMockedRequests(context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleClearAllMocks(context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleSetupJourneyMocks(args: any, context: ToolHandlerContext): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function handleToolRequest(name: string, args: any, context: ToolHandlerContext): Promise<any>;
