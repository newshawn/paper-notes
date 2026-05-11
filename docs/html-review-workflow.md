# HTML Review Workflow

`review.html` is the human-facing observation layer for this Markdown wiki. Its primary job is to make the current Raw/Wiki/log state easy to inspect before asking an LLM to change content.

Development planning rules live in [`dev/plan-artifact-pipeline.md`](../dev/plan-artifact-pipeline.md) and [`dev/project-map.md`](../dev/project-map.md). Use [`dev/`](../dev/) only to render and review `plan-review.html` plus `plan-review.md`.

## Source of Truth

- `Raw/` keeps paper-level notes.
- `Wiki/` keeps cross-paper concept pages.
- `schema.md`, `AGENTS.md`, `index.md`, and `log.md` define the agent workflow.
- `review.html` is generated output. Do not treat it as the only source of truth.
- `dev/index.html` is also generated output. Its source of truth is `scripts/build-dev-renderer.mjs`; the planning rules live in `dev/plan-artifact-pipeline.md` and `dev/project-map.md`.

## Generate

```bash
node scripts/build-review.mjs
```

The generator reads `Raw/`, `Wiki/`, and `index.md`, then writes `review.html`.

## Review Loop

1. Open `review.html`.
2. Check overall coverage, pending concepts, top tags, and concept pages.
3. Use Wiki / Raw tabs to inspect source-linked evidence.
4. Use the Prompt tab for compact handoff if the task is simple.
5. For development work, switch to `dev/`.
6. Regenerate `review.html` after changing `scripts/build-review.mjs`.

## Agent Rule

When changing the LLM wiki style or functionality, edit `scripts/build-review.mjs` and regenerate `review.html`. When changing research content, edit `Raw/`, `Wiki/`, `index.md`, or `log.md` according to `AGENTS.md` and `schema.md`.
