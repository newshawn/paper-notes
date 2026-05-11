# Dev Cockpit Workflow

`dev-cockpit.html` is the development planning layer for this repository. It is inspired by the HTML workflow examples where planning, comparison, demos, and export live in one self-contained page instead of a long markdown wall.

## Source of Truth

- Source code, Markdown docs, `Raw/`, `Wiki/`, `schema.md`, and `log.md` remain the source of truth.
- `dev-cockpit.html` is generated output. It helps plan changes but should not be edited by hand.
- The generator is `scripts/build-dev-cockpit.mjs`.

## Generate

```bash
node scripts/build-dev-cockpit.mjs
```

The generator scans repository files, recent `log.md` entries, and lightweight Raw/Wiki summaries, then writes `dev-cockpit.html`.

## Development Loop

1. Open `dev-cockpit.html`.
2. Choose one workflow card:
   - `Explore`: compare possible implementation paths.
   - `Plan`: turn a clear goal into milestones and checks.
   - `Demo`: build a demo-backed prompt with examples.
   - `Inspect`: understand the repo before editing.
3. Write one requirement sentence.
4. Add focus words such as file paths, modules, concepts, or tags.
5. Compare approaches, skim the generated plan/demo/context, then copy the generated LLM prompt or markdown plan.
6. Let the LLM execute in the repository, then regenerate `dev-cockpit.html` if its generator or scanned context changed.

## Maintenance Rule

When changing the cockpit structure or interaction, edit `scripts/build-dev-cockpit.mjs` and regenerate `dev-cockpit.html`. Keep demos small and illustrative; production behavior should live in the real source files, not in the generated HTML.
