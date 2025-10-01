import { uiInteractions } from "../ui-interactions.js";
export async function handleFindElement(server, args) {
    if (!server.elementLocator) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    const element = await server.elementLocator.findElement(args);
    return {
        content: [
            {
                type: "text",
                text: element
                    ? "Element found successfully"
                    : "Element not found",
            },
        ],
    };
}
export async function handleClickElement(server, args) {
    return await uiInteractions.clickElement(args);
}
export async function handleTypeText(server, args) {
    return await uiInteractions.typeText(args);
}
export async function handleGetElementText(server, args) {
    return await uiInteractions.getElementText(args);
}
