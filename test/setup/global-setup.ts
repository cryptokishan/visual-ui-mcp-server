import { config } from "dotenv";

// Load environment variables from .env files
// .env.local takes precedence over .env for local development
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { TestServerManager } from "../helpers/test-server-manager";

export default async function () {
  await TestServerManager.getInstance().startServer();

  return async () => {
    await TestServerManager.getInstance().stopServer();
    TestServerManager.resetInstance();
  };
}
