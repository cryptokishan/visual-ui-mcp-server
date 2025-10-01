import { uiInteractions } from "../ui-interactions.js";

export async function handleFindElement(server: any, args: any) {
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

export async function handleClickElement(server: any, args: any) {
  return await uiInteractions.clickElement(args);
}

export async function handleTypeText(server: any, args: any) {
  return await uiInteractions.typeText(args);
}

export async function handleGetElementText(server: any, args: any) {
  return await uiInteractions.getElementText(args);
}
