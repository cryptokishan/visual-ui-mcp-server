import { browserManager } from "../browser-manager.js";
import { JourneyRecorder } from "../journey-recorder.js";

export async function handleStartJourneyRecording(server: any, args: any) {
  if (!server.journeySimulator) {
    throw new Error("Browser not launched. Please launch browser first.");
  }

  if (!args || typeof args.name !== "string") {
    throw new Error("Name parameter is required for start_journey_recording");
  }

  const startRecordingPage = browserManager.getPage();
  if (!startRecordingPage) {
    throw new Error("No active browser page for recording");
  }

  // Create a new instance for this session
  const recorder = JourneyRecorder.getInstance();

  const startRecordingSession = await recorder.startRecording(
    startRecordingPage,
    args as any
  );

  // Store this session ID so other tools can access it
  server.currentRecordingSessionId = startRecordingSession.id;

  return {
    content: [
      {
        type: "text",
        text: `Journey recording started for "${args.name}":
- Session ID: ${startRecordingSession.id}
- Filters: ${args.filter ? "Enabled" : "Disabled"}
- Auto-selectors: ${args.autoSelectors ? "Enabled" : "Disabled"}
- Current URL: ${startRecordingSession.currentUrl}`,
      },
    ],
  };
}

export async function handleStopJourneyRecording(server: any, args: any) {
  if (!args || !args.sessionId) {
    throw new Error(
      "Session ID parameter is required for stop_journey_recording"
    );
  }

  const stopRecorder = JourneyRecorder.getInstance(args.sessionId as string);
  const stopRecordedJourney = await stopRecorder.stopRecording(
    args.sessionId as string
  );

  // Clean up the instance after stopping recording
  JourneyRecorder.removeInstance(args.sessionId as string);

  return {
    content: [
      {
        type: "text",
        text: `Journey recording stopped for "${
          stopRecordedJourney.name
        }":
- Recorded Steps: ${stopRecordedJourney.steps.length}
- Source: ${stopRecordedJourney.source || "manual"}
- Recorded From: ${stopRecordedJourney.recordedFrom || "unknown"}
- Created: ${stopRecordedJourney.created.toISOString()}`,
      },
    ],
  };
}

export async function handlePauseJourneyRecording(server: any, args: any) {
  if (!args || !args.sessionId) {
    throw new Error(
      "Session ID parameter is required for pause_journey_recording"
    );
  }

  const pauseRecorder = JourneyRecorder.getInstance(args.sessionId as string);
  await pauseRecorder.pauseRecording(args.sessionId as string);

  return {
    content: [
      {
        type: "text",
        text: `Journey recording paused for session "${args.sessionId}"`,
      },
    ],
  };
}

export async function handleResumeJourneyRecording(server: any, args: any) {
  if (!args || !args.sessionId) {
    throw new Error(
      "Session ID parameter is required for resume_journey_recording"
    );
  }

  const resumeRecorder = JourneyRecorder.getInstance(args.sessionId as string);
  await resumeRecorder.resumeRecording(args.sessionId as string);

  return {
    content: [
      {
        type: "text",
        text: `Journey recording resumed for session "${args.sessionId}"`,
      },
    ],
  };
}

export async function handleGetRecordingStatus(server: any, args: any) {
  // Get the first active instance to check status
  const activeInstances = JourneyRecorder.getActiveInstances();
  if (activeInstances.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No active recording session",
        },
      ],
    };
  }

  const statusRecorder = JourneyRecorder.getInstance(activeInstances[0]);
  const statusSession = await statusRecorder.getCurrentSession();

  if (!statusSession) {
    return {
      content: [
        {
          type: "text",
          text: "No active recording session",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Recording Session Status:
- Name: ${statusSession.name}
- Recording: ${statusSession.isRecording ? "✅ Active" : "⏸️ Paused"}
- Steps Recorded: ${statusSession.steps.length}
- Current URL: ${statusSession.currentUrl}
- Started: ${statusSession.startTime.toISOString()}
- Duration: ${Math.round(
          (Date.now() - statusSession.startTime.getTime()) / 1000
        )}s`,
      },
    ],
  };
}

export async function handleSuggestElementSelectors(server: any, args: any) {
  if (!args || !args.selectors || !Array.isArray(args.selectors)) {
    throw new Error(
      "Selectors parameter is required for suggest_element_selectors"
    );
  }

  const suggestPage = browserManager.getPage();
  if (!suggestPage) {
    throw new Error("Browser not launched. Please launch browser first.");
  }

  // Use element locator to find the element first
  if (!server.elementLocator) {
    throw new Error("Element locator not available");
  }

  const foundElement = await server.elementLocator.findElement(args as any);
  if (!foundElement) {
    throw new Error("Element not found for selector suggestions");
  }

  const { JourneyRecorder: Recorder6 } = await import("../journey-recorder.js");
  const suggestRecorder = new Recorder6();

  // Convert element handle to locator for suggestions
  const locator = suggestPage.locator(args.selectors[0].value);
  const suggestions = await suggestRecorder.suggestSelectors(
    suggestPage,
    locator
  );

  return {
    content: [
      {
        type: "text",
        text: `Element Selector Suggestions (${
          suggestions.length
        } found):\n${suggestions
          .map(
            (sug: any) =>
              `- ${sug.type.toUpperCase()}: "${
                sug.selector
              }" (Reliability: ${Math.round(sug.reliability * 100)}%)`
          )
          .join("\n")}`,
      },
    ],
  };
}
