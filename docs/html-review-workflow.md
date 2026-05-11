# HTML Review Workflow

`review.html` is the human-facing interaction layer for this Markdown wiki. Its primary job is to turn a new requirement into a stable LLM handoff prompt with repository state, likely relevant Raw/Wiki files, workflow rules, and completion checks.

## Source of Truth

- `Raw/` keeps paper-level notes.
- `Wiki/` keeps cross-paper concept pages.
- `schema.md`, `AGENTS.md`, `index.md`, and `log.md` define the agent workflow.
- `review.html` is generated output. Do not treat it as the only source of truth.

## Generate

```bash
node scripts/build-review.mjs
```

The generator reads `Raw/`, `Wiki/`, and `index.md`, then writes `review.html`.

## LLM Interaction Loop

1. Open `review.html`.
2. Start in the Workspace tab.
3. Choose the task type: Code / HTML, Research Query, Ingest, Compile, Lint, or Writing.
4. Write the new requirement and optional focus words.
5. Review matched Wiki and Raw context, then copy the generated Workspace prompt to the LLM.
6. Let the LLM modify Markdown content, wiki structure, or the HTML generator according to `AGENTS.md` and `schema.md`.
7. Regenerate `review.html` and review the next prompt/workflow state.

The Overview, Wiki, Raw, and Prompt tabs remain useful for browsing and compact handoff, but Workspace is the default entry point when the goal is to change code, clarify a new requirement, or ask a research question.

## Agent Rule

When changing the LLM wiki style or functionality, edit `scripts/build-review.mjs` and regenerate `review.html`. When changing research content, edit `Raw/`, `Wiki/`, `index.md`, or `log.md` according to `AGENTS.md` and `schema.md`.
