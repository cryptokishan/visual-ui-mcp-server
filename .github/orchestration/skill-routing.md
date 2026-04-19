# Skill Routing

The `coordinator` must assign both an agent and a skill whenever work is delegated.

Each handoff should include:

- assigned agent
- assigned skill
- objective
- constraints
- expected output

## Default Routing

Use these default pairings unless there is a clear reason to override them:

- `coordinator` -> `plan-work`
- `architect` -> `analyze-codebase`
- `ux` -> `design-ui-ux`
- `builder` -> `implement-change`
- `reviewer` -> `review-change`

## Routing Rules

Assign `coordinator` with `plan-work` when:

- the request is ambiguous
- the work spans multiple domains
- execution order is unclear
- there are likely parallel work opportunities

Assign `architect` with `analyze-codebase` when:

- the current system must be understood first
- affected files or integration points are unclear
- the task has architectural or regression risk

Assign `ux` with `design-ui-ux` when:

- the task changes screens, flows, forms, or user-facing states
- the request affects navigation, hierarchy, or interaction behavior
- copy, accessibility, or responsiveness matters to success

Assign `builder` with `implement-change` when:

- scope is approved
- implementation can begin
- code or tests need to be changed

Assign `reviewer` with `review-change` when:

- implementation is ready for critique
- regression risk must be assessed
- tests or coverage need evaluation

## Multi-Step Routing

For most feature work, the default sequence is:

1. `coordinator` + `plan-work`
2. `architect` + `analyze-codebase`
3. `ux` + `design-ui-ux` if user-facing behavior changes
4. `builder` + `implement-change`
5. `reviewer` + `review-change`

## Handoff Standard

The `coordinator` should name the skill explicitly in each handoff, for example:

- assigned agent: `architect`
- assigned skill: `analyze-codebase`
- objective: identify impacted modules and propose implementation order
- constraints: no code edits
- expected output: relevant files, current behavior, scope, risks, implementation order
