import { SecurityUtils } from "../index.js";
export async function handleLoadMockConfig(server, args) {
    await server.validateBrowserState("load_mock_config", false);
    await server.validateArgs(args, ["name", "rules"], "load_mock_config");
    const configToLoad = {
        name: args.name,
        description: args.description,
        rules: args.rules,
        enabled: args.enabled !== false,
    };
    await server.backendMocker.loadMockConfig(configToLoad);
    return {
        content: [
            {
                type: "text",
                text: `Mock configuration "${configToLoad.name}" loaded with ${configToLoad.rules.length} rules`,
            },
        ],
    };
}
export async function handleSaveMockConfig(server, args) {
    await server.validateArgs(args, ["name"], "save_mock_config");
    // Validate and sanitize the config name
    const sanitizedConfigName = SecurityUtils.validateFileName(args.name);
    if (!server.backendMocker) {
        server.backendMocker = new server.BackendMocker();
    }
    await server.backendMocker.saveMockConfig(sanitizedConfigName);
    return {
        content: [
            {
                type: "text",
                text: `Mock configuration saved as "${sanitizedConfigName}"`,
            },
        ],
    };
}
export async function handleAddMockRule(server, args) {
    await server.validateArgs(args, ["url", "response"], "add_mock_rule");
    if (!server.backendMocker) {
        server.backendMocker = new server.BackendMocker();
    }
    const ruleId = await server.backendMocker.addMockRule(args);
    return {
        content: [
            {
                type: "text",
                text: `Mock rule added with ID: ${ruleId}`,
            },
        ],
    };
}
export async function handleRemoveMockRule(server, args) {
    await server.validateArgs(args, ["ruleId"], "remove_mock_rule");
    if (!server.backendMocker) {
        server.backendMocker = new server.BackendMocker();
    }
    await server.backendMocker.removeMockRule(args.ruleId);
    return {
        content: [
            {
                type: "text",
                text: `Mock rule ${args.ruleId} removed`,
            },
        ],
    };
}
export async function handleUpdateMockRule(server, args) {
    await server.validateArgs(args, ["ruleId", "updates"], "update_mock_rule");
    if (!server.backendMocker) {
        server.backendMocker = new server.BackendMocker();
    }
    await server.backendMocker.updateMockRule(args.ruleId, args.updates);
    return {
        content: [
            {
                type: "text",
                text: `Mock rule ${args.ruleId} updated`,
            },
        ],
    };
}
export async function handleGetMockRules(server, args) {
    if (!server.backendMocker) {
        server.backendMocker = new server.BackendMocker();
    }
    const mockRules = await server.backendMocker.getMockRules();
    return {
        content: [
            {
                type: "text",
                text: `Active mock rules (${mockRules.length}):\n${mockRules
                    .map((rule) => `- ${rule.method || "ALL"} ${rule.url} → ${rule.response.status} (${rule.priority || 0})`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleGetMockedRequests(server, args) {
    server.validateMockingState("get_mocked_requests");
    const mockedRequests = await server.backendMocker.getMockedRequests();
    return {
        content: [
            {
                type: "text",
                text: `Mocked requests history (${mockedRequests.length}):\n${mockedRequests
                    .slice(-10)
                    .map((req) => `${new Date(req.timestamp).toISOString()} ${req.method} ${req.url} → ${req.response.status}`)
                    .join("\n")}`,
            },
        ],
    };
}
export async function handleClearAllMocks(server, args) {
    if (!server.backendMocker) {
        throw new Error("Backend mocker not initialized");
    }
    await server.backendMocker.clearAllMocks();
    return {
        content: [
            {
                type: "text",
                text: "All mock rules cleared",
            },
        ],
    };
}
export async function handleSetupJourneyMocks(server, args) {
    await server.validateArgs(args, ["journeyName", "mockConfig"], "setup_journey_mocks");
    if (!server.backendMocker) {
        server.backendMocker = new server.BackendMocker();
    }
    const journeyConfig = {
        name: `${args.journeyName}_mocks`,
        description: `Mocks for journey: ${args.journeyName}`,
        rules: args.mockConfig.rules,
        enabled: true,
    };
    await server.backendMocker.loadMockConfig(journeyConfig);
    return {
        content: [
            {
                type: "text",
                text: `Journey mocks setup for "${args.journeyName}" with ${journeyConfig.rules.length} rules`,
            },
        ],
    };
}
export async function handleEnableBackendMocking(server, args) {
    await server.validateBrowserState("enable_backend_mocking");
    server.validateMockingState("enable_backend_mocking", false);
    const pageToEnable = server.browserManager.getPage();
    if (!pageToEnable || !server.backendMocker) {
        throw new Error("Browser or backend mocker not available");
    }
    await server.backendMocker.enableMocking(pageToEnable);
    server.updateBrowserState(false, false, true); // Update mocking state to active
    return {
        content: [
            {
                type: "text",
                text: "Backend mocking enabled for current page",
            },
        ],
    };
}
export async function handleDisableBackendMocking(server, args) {
    server.validateMockingState("disable_backend_mocking");
    const pageToDisable = server.browserManager.getPage();
    if (!pageToDisable || !server.backendMocker) {
        throw new Error("Browser or backend mocker not available");
    }
    await server.backendMocker.disableMocking(pageToDisable);
    server.updateBrowserState(false, false, false); // Clear mocking state
    return {
        content: [
            {
                type: "text",
                text: "Backend mocking disabled",
            },
        ],
    };
}
