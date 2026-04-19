# Skill: Estimate Session Cost

Use when you need to determine or estimate the token and cost footprint of a session by inspecting logs, tool calls, and model usage traces.

## Best Owner

`architect` for investigation or `coordinator` for reporting

## Goal

Produce the best available estimate of session usage and cost, while clearly distinguishing:

- exact billed usage
- tool-reported usage
- inferred estimates

## Inputs

- session logs
- tool call traces
- model names
- token usage fields if present
- pricing reference, if available

## Steps

1. Find session logs, transcripts, or tool outputs that contain usage metadata.
2. Extract any exact token counts such as input, output, cached, or reasoning tokens.
3. Identify the model used for each relevant turn or tool-driven subtask.
4. If pricing metadata is available, compute exact or near-exact cost from the recorded usage.
5. If exact token counts are missing, estimate usage from the available traces and clearly label the result as an estimate.
6. Summarize the result with assumptions, confidence, and any missing data that prevents exact calculation.

## Output

- source files or logs inspected
- model or models identified
- usage data found
- estimated or exact token totals
- estimated or exact session cost
- assumptions and confidence level
- missing data needed for a precise calculation

## Rules

- Prefer exact usage metadata over estimation.
- Never present an estimate as an exact billed amount.
- Separate model cost from any non-token tool charges if those appear.
- If pricing is time-sensitive or not present locally, call that out explicitly before using external pricing data.
