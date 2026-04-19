# Team Workflows

## Default Engineering Workflow

1. `Coordinator` runs `plan-work`.
2. `Architect` runs `analyze-codebase`.
3. `UX` runs `design-ui-ux` if the task changes the interface or user flow.
4. `Builder` runs `implement-change`.
5. `Reviewer` runs `review-change`.
6. `Coordinator` decides whether to iterate or close.

## When To Use UX

Include `UX` when:

- a feature changes screens or components
- the request affects navigation or task flow
- there are form, onboarding, dashboard, or settings changes
- empty, error, loading, or success states matter
- visual direction or usability is part of the outcome

Skip `UX` when:

- the task is purely backend or infrastructure
- the change is internal refactoring with no user-facing effect
- the UI change is purely mechanical and already fully specified

## Parallelization Rules

Parallelize only when outputs are independent enough to avoid churn.

Good parallel work:

- `Architect` traces backend impact while `UX` defines the user flow
- multiple `Builder` tasks with disjoint file ownership
- `Reviewer` prepares a risk checklist while validation is still running

Avoid parallelizing when:

- one task depends directly on the exact result of another
- ownership is unclear
- two agents would likely edit the same files

## Escalation Rules

Pause and escalate to the user when:

- there are major product tradeoffs
- architecture options have different long-term cost
- a risky migration or destructive action is required
- the requested scope conflicts with the current codebase direction

## Suggested Initial Tools

Give agents only the tools they need:

- `Coordinator`: planning, task management, agent delegation
- `Architect`: fast search, file reads, repo inspection
- `Builder`: file edits, test runner, formatter, build tools
- `Reviewer`: diff inspection, test results, static analysis
- `UX`: design docs, screenshots, Figma or frontend context tools
