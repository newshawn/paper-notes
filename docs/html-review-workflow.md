# HTML Review Workflow

`review.html` is the human-facing review layer for this Markdown wiki.

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

## Human Review Loop

1. Open `review.html`.
2. Check overall coverage, pending concepts, top tags, and concept pages.
3. Use the Prompt tab to copy a compact agent brief.
4. Ask the agent to modify Markdown content, wiki structure, or the HTML generator.
5. Regenerate `review.html` and review the result again.

## Agent Rule

When changing the LLM wiki style or functionality, edit `scripts/build-review.mjs` and regenerate `review.html`. When changing research content, edit `Raw/`, `Wiki/`, `index.md`, or `log.md` according to `AGENTS.md` and `schema.md`.
