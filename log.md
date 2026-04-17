# Log

> Append-only 时间线。每次 ingest / compile / lint 追加一条。
> 格式：`## [YYYY-MM-DD] <action> | <target>`
> action ∈ {ingest, compile, lint, rename, refactor}

## [2026-04-18] compile | full batch (10 papers)

- **Raw added**: 2505-gigpo, 2507-arpo, 2509-treegrpo, 2509-empg, 2510-aepo, 2510-salt, 2601-at2po, 2601-matchtir
- **Raw existed**: 2602-rlanything, 2510-igpo
- **Wiki touched**:
  - Updated: Credit-Assignment-in-Agentic-RL (full cross-paper integration)
  - Created: Entropy-Guided-Exploration, Turn-Level-Reward
- **New infrastructure**: index.md, log.md, coverage tags in schema
- **Rationale**: user wanted full batch ingest of the 8 pending papers; used this as the first real compile to verify LLM Wiki workflow scales

## [2026-04-17] ingest | 2510-igpo + 2602-rlanything (demo seed)

- Created first Raw notes as demo of Karpathy LLM Wiki pattern
- Created first Wiki page: Credit-Assignment-in-Agentic-RL
- Purpose: validate format before committing to full batch

## [2026-04-17] init | PaperNotes repo

- Folder structure: Raw/, Wiki/, attachments/
- schema.md scaffold
- Pushed to https://github.com/newshawn/paper-notes
