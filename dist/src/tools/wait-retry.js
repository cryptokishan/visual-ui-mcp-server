import { waitRetrySystem } from "../wait-retry.js";
export async function handleWaitForElement(server, args) {
    return await waitRetrySystem.waitForElement(args);
}
export async function handleWaitForCondition(server, args) {
    return await waitRetrySystem.waitForCondition(args);
}
