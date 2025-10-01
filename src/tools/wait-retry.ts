import { waitRetrySystem } from "../wait-retry.js";

export async function handleWaitForElement(server: any, args: any) {
  return await waitRetrySystem.waitForElement(args);
}

export async function handleWaitForCondition(server: any, args: any) {
  return await waitRetrySystem.waitForCondition(args);
}
