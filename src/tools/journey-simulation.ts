import { browserManager } from "../browser-manager.js";

export async function handleRunUserJourney(server: any, args: any) {
  await server.validateBrowserState("run_user_journey");

  if (!server.journeySimulator) {
    throw new Error(
      "Journey simulator not initialized. Please launch browser first."
    );
  }
  if (
    !args ||
    typeof args.name !== "string" ||
    !Array.isArray(args.steps)
  ) {
    throw new Error(
      "Name and steps parameters are required for run_user_journey"
    );
  }

  // Parse journey options
  const journeyOptions = {
    name: args.name as string,
    steps: (args.steps as any[]).map((step) => ({
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
    onStepComplete: (args as any).onStepComplete
      ? (step: any, result: any) => {
          server.logger.info(`Step completed: ${step.id} - ${result}`);
        }
      : undefined,
    onError: (args as any).onError
      ? (error: any, step: any) => {
          server.logger.error(
            `Journey error in step ${step.id}: ${error.message}`
          );
        }
      : undefined,
    maxDuration: (args as any).maxDuration,
    baseUrl: (args as any).baseUrl,
  };

  const journeyResult = await server.journeySimulator.runJourney(
    journeyOptions
  );

  return {
    content: [
      {
        type: "text",
        text: `Journey "${journeyOptions.name}" ${
          journeyResult.success ? "completed successfully" : "failed"
        }:
- Duration: ${journeyResult.duration}ms
- Steps Completed: ${journeyResult.completedSteps}/${journeyResult.totalSteps}
- Screenshots: ${journeyResult.screenshots.length}
- Errors: ${journeyResult.errors.length}
${
  journeyResult.performanceMetrics
    ? `- Average Step Time: ${Math.round(
        journeyResult.performanceMetrics.averageStepTime
      )}ms
- Slowest Step: ${journeyResult.performanceMetrics.slowestStep.stepId} (${
        journeyResult.performanceMetrics.slowestStep.duration
      }ms)`
    : ""
}
${
  journeyResult.errors.length > 0
    ? `\nErrors:\n${journeyResult.errors
        .map((err: any) => `- ${err.stepId}: ${err.error}`)
        .join("\n")}`
    : ""
}`,
      },
    ],
  };
}

export async function handleRecordUserJourney(server: any, args: any) {
  if (!server.journeySimulator) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.name !== "string") {
    throw new Error("Name parameter is required for record_user_journey");
  }

  const oldStyleJourney = await server.journeySimulator.recordJourney(
    args.name as string
  );

  return {
    content: [
      {
        type: "text",
        text: `Journey recording started for "${args.name}". Note: Recording functionality is currently basic and returns a template structure.`,
      },
    ],
  };
}

export async function handleValidateJourneyDefinition(server: any, args: any) {
  if (
    !args ||
    typeof args.name !== "string" ||
    !Array.isArray(args.steps)
  ) {
    throw new Error(
      "Name and steps parameters are required for validate_journey_definition"
    );
  }

  // Create a temporary journey simulator for validation
  const tempJourneySimulator = new server.JourneySimulator();
  const journeyDefinition = {
    name: args.name as string,
    description: (args as any).description,
    steps: (args.steps as any[]).map((step) => ({
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

  const validationResult = await tempJourneySimulator.validateJourney(
    journeyDefinition
  );

  return {
    content: [
      {
        type: "text",
        text: `Journey Validation for "${args.name}":
- Status: ${validationResult.isValid ? "VALID" : "INVALID"}
${
  validationResult.errors.length > 0
    ? `- Errors:\n${validationResult.errors
        .map((err: any) => `  • ${err}`)
        .join("\n")}`
    : ""
}
${
  validationResult.warnings.length > 0
    ? `- Warnings:\n${validationResult.warnings
        .map((warn: any) => `  • ${warn}`)
        .join("\n")}`
    : ""
}`,
      },
    ],
  };
}

export async function handleOptimizeJourneyDefinition(server: any, args: any) {
  if (
    !args ||
    typeof args.name !== "string" ||
    !Array.isArray(args.steps)
  ) {
    throw new Error(
      "Name and steps parameters are required for optimize_journey_definition"
    );
  }

  // Create a temporary journey simulator for optimization
  const tempOptimizer = new server.JourneySimulator();
  const journeyToOptimize = {
    name: args.name as string,
    description: (args as any).description,
    steps: (args.steps as any[]).map((step) => ({
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

  const optimizedJourney = await tempOptimizer.optimizeJourney(
    journeyToOptimize
  );

  return {
    content: [
      {
        type: "text",
        text: `Journey Optimization for "${args.name}":
- Original Steps: ${journeyToOptimize.steps.length}
- Optimized Steps: ${optimizedJourney.steps.length}
- Changes: ${
          journeyToOptimize.steps.length !== optimizedJourney.steps.length
            ? "Timeouts standardized, redundant waits removed"
            : "No changes needed"
        }`,
      },
    ],
  };
}
