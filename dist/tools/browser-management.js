import { browserManager } from "../browser-manager.js";
import { ElementLocator } from "../element-locator.js";
import { FormHandler } from "../form-handler.js";
import { JourneySimulator } from "../journey-simulator.js";
import { BackendMocker } from "../backend-mocker.js";
export async function handleLaunchBrowser(server, args) {
    const result = await browserManager.launchBrowser(args);
    // Initialize ElementLocator, FormHandler, JourneySimulator, and BackendMocker with the current page
    const page = browserManager.getPage();
    if (page) {
        server.elementLocator = new ElementLocator(page);
        server.formHandler = new FormHandler(page, server.elementLocator);
        server.journeySimulator = new JourneySimulator(page);
        server.backendMocker = new BackendMocker();
    }
    server.updateBrowserState(true, undefined, undefined, "launch_browser");
    return result;
}
export async function handleCloseBrowser(server) {
    const closeResult = await browserManager.closeBrowser();
    server.updateBrowserState(false, false, false); // Reset all states
    return closeResult;
}
