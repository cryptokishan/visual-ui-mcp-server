export async function handleRunUserJourney(server, args) {
    await server.validateBrowserState("run_user_journey");
    if (!server.journeySimulator) {
        throw new Error("Journey simulator not initialized. Please launch browser first.");
    }
    if (!args ||
        typeof args.name !== "string" ||
        !Array.isArray(args.steps)) {
        throw new Error("Name and steps parameters are required for run_user_journey");
    }
    // Parse journey options
    const journeyOptions = {
        name: args.name,
        steps: args.steps.map((step) => ({
            id: step.id,
            action: step.action,
            selector: step.selector,
            value: step.value,
            condition: step.condition || undefined, // Keep as string for JourneySimulator to handle
            timeout: step.timeout || 10000,
            retryCount: step.retryCount || 0,
            onError: step.onError || "fail",
            description: step.description,
        })),
        onStepComplete: args.onStepComplete
            ? (step, result) => {
                server.logger.info(`Step completed: ${step.id} - ${result}`);
            }
            : undefined,
        onError: args.onError
            ? (error, step) => {
                server.logger.error(`Journey error in step ${step.id}: ${error.message}`);
            }
            : undefined,
        maxDuration: args.maxDuration,
        baseUrl: args.baseUrl,
    };
    const journeyResult = await server.journeySimulator.runJourney(journeyOptions);
    return {
        content: [
            {
                type: "text",
                text: `Journey "${journeyOptions.name}" ${journeyResult.success ? "completed successfully" : "failed"}:
- Duration: ${journeyResult.duration}ms
- Steps Completed: ${journeyResult.completedSteps}/${journeyResult.totalSteps}
- Screenshots: ${journeyResult.screenshots.length}
- Errors: ${journeyResult.errors.length}
${journeyResult.performanceMetrics
                    ? `- Average Step Time: ${Math.round(journeyResult.performanceMetrics.averageStepTime)}ms
- Slowest Step: ${journeyResult.performanceMetrics.slowestStep.stepId} (${journeyResult.performanceMetrics.slowestStep.duration}ms)`
                    : ""}
${journeyResult.errors.length > 0
                    ? `\nErrors:\n${journeyResult.errors
                        .map((err) => `- ${err.stepId}: ${err.error}`)
                        .join("\n")}`
                    : ""}`,
            },
        ],
    };
}
export async function handleRecordUserJourney(server, args) {
    if (!server.journeySimulator) {
        throw new Error("Browser not launched. Please launch browser first.");
    }
    if (!args || typeof args.name !== "string") {
        throw new Error("Name parameter is required for record_user_journey");
    }
    const oldStyleJourney = await server.journeySimulator.recordJourney(args.name);
    return {
        content: [
            {
                type: "text",
                text: `Journey recording started for "${args.name}". Note: Recording functionality is currently basic and returns a template structure.`,
            },
        ],
    };
}
export async function handleValidateJourneyDefinition(server, args) {
    if (!args ||
        typeof args.name !== "string" ||
        !Array.isArray(args.steps)) {
        throw new Error("Name and steps parameters are required for validate_journey_definition");
    }
    // Create a temporary journey simulator for validation
    const tempJourneySimulator = new server.JourneySimulator();
    const journeyDefinition = {
        name: args.name,
        description: args.description,
        steps: args.steps.map((step) => ({
            id: step.id,
            action: step.action,
            selector: step.selector,
            value: step.value,
            condition: step.condition,
            timeout: step.timeout,
            retryCount: step.retryCount,
            onError: step.onError,
            description: step.description,
        })),
        created: new Date(),
        modified: new Date(),
    };
    const validationResult = await tempJourneySimulator.validateJourney(journeyDefinition);
    return {
        content: [
            {
                type: "text",
                text: `Journey Validation for "${args.name}":
- Status: ${validationResult.isValid ? "VALID" : "INVALID"}
${validationResult.errors.length > 0
                    ? `- Errors:\n${validationResult.errors
                        .map((err) => `  • ${err}`)
                        .join("\n")}`
                    : ""}
${validationResult.warnings.length > 0
                    ? `- Warnings:\n${validationResult.warnings
                        .map((warn) => `  • ${warn}`)
                        .join("\n")}`
                    : ""}`,
            },
        ],
    };
}
export async function handleOptimizeJourneyDefinition(server, args) {
    if (!args ||
        typeof args.name !== "string" ||
        !Array.isArray(args.steps)) {
        throw new Error("Name and steps parameters are required for optimize_journey_definition");
    }
    // Create a temporary journey simulator for optimization
    const tempOptimizer = new server.JourneySimulator();
    const journeyToOptimize = {
        name: args.name,
        description: args.description,
        steps: args.steps.map((step) => ({
            id: step.id,
            action: step.action,
            selector: step.selector,
            value: step.value,
            condition: step.condition,
            timeout: step.timeout,
            retryCount: step.retryCount,
            onError: step.onError,
            description: step.description,
        })),
        created: new Date(),
        modified: new Date(),
    };
    const optimizedJourney = await tempOptimizer.optimizeJourney(journeyToOptimize);
    return {
        content: [
            {
                type: "text",
                text: `Journey Optimization for "${args.name}":
- Original Steps: ${journeyToOptimize.steps.length}
- Optimized Steps: ${optimizedJourney.steps.length}
- Changes: ${journeyToOptimize.steps.length !== optimizedJourney.steps.length
                    ? "Timeouts standardized, redundant waits removed"
                    : "No changes needed"}`,
            },
        ],
    };
}
