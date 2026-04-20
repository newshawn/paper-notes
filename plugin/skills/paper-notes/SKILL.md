---
name: paper-notes
description: LLM Wiki for academic paper notes (Karpathy pattern). Handles arxiv/PDF ingestion, cross-paper concept compilation, wiki-based query, and schema lint. Activates when user runs the /paper-notes command or manages a paper-notes-style directory (with schema.md + Raw/ + Wiki/). Schema-driven — reads the active wiki's schema.md for domain-specific rules.
argument-hint: "ingest <url|pdf-path> | compile [<since>] | query <question> | lint"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, WebFetch
---

# paper-notes skill

LLM Wiki for academic paper notes. Four subcommands: `ingest`, `compile`, `query`, `lint`.

## Relationship with wiki's CLAUDE.md

本文件是**执行细则**（how to do — Setup + 6 Steps + 11 quality rules）。

Wiki root 的 `CLAUDE.md` 提供 **宪法级红线**（what NOT to do — 5 红线 + hard nos）。两者分工：
- 本 SKILL.md：本 skill 调用范围内，执行层面权威
- CLAUDE.md：常驻 context，红线在任何情况下都不能破

**遇到本文件与 CLAUDE.md 的红线不一致**：停下来报告用户，这是 repo 维护漂移的信号。

## Core principle: schema.md is the constitution

Every subcommand **MUST** first read the active wiki's `schema.md`. All formatting, tagging, file-naming, and integration decisions follow it. Never hardcode rules that belong in schema.md.

## Setup (run on every invocation, before routing)

1. **Find wiki root.** Walk up from cwd looking for a directory containing ALL of: `schema.md`, `Raw/`, `Wiki/`. That is the wiki root. If not found, report an error with guidance on running `init` (not implemented yet — suggest creating structure manually following the Karpathy LLM Wiki pattern).

2. **Read `schema.md`.** Understand the wiki's research direction, tag conventions, file-naming rules, concept-page-creation threshold (e.g. "≥2 Raw before creating Wiki page"), and integration rules.

3. **Read `index.md` and tail of `log.md`.** Understand current state: existing concept pages, coverage levels, last ingest/compile timestamps.

4. **Route by first argument** to the appropriate subcommand below. Pass through remaining arguments.

## Subcommand routing

The invoking slash command specifies which subcommand to run. Four possible commands:
- `/paper-notes:ingest <url|path>` → run `ingest` subcommand below
- `/paper-notes:compile [<since>]` → run `compile` subcommand below
- `/paper-notes:query <question>` → run `query` subcommand below
- `/paper-notes:lint` → run `lint` subcommand below

In each case, `$ARGUMENTS` contains only that subcommand's arguments (the source URL, since-date, question, or empty).

---

## Subcommand: ingest <arxiv-url | pdf-path>

**Goal:** add a new Raw/ paper note. Do NOT update Wiki/ in this stage.

### Step 0: Dedup check (重要 — 省 token，防重复)

**Before anything else**, check if this paper is already in the wiki:

1. If arxiv URL → extract arxiv id (e.g. `2510.20022`)
2. `Grep` `Raw/*.md` for the arxiv id (also search for the clean id without version suffix)
3. If match found → **STOP and ask the user**:
   > "Paper `<arxiv-id>` is already ingested as `Raw/<existing-paper-id>.md`. Options:
   > (a) **refresh** — regenerate the Raw note (overwrites existing; append `## Superseded by: [...]` to the old one if schema says so)
   > (b) **abort** — do nothing
   > (c) **show** — just open the existing Raw"

4. If no arxiv id match, do a **title similarity check**:
   - WebFetch abs page → get title → normalize (lowercase, strip punctuation)
   - `Grep` Raw files for meaningful words from the title
   - If a candidate match exists → warn user with both paper-ids; user decides

Only proceed to Step 1 after dedup passes (or user explicitly chose "refresh").

### Step 1: fetch and parse source

- If arxiv URL (`https://arxiv.org/abs/...`, `/pdf/...`, `/html/...`):
  1. Extract arxiv id (e.g. `2510.20022`)
  2. WebFetch `https://arxiv.org/abs/<id>` → extract title, authors, venue (if stated), abstract
  3. Try WebFetch `https://arxiv.org/html/<id>` for full HTML body. Fall back to `https://arxiv.org/pdf/<id>` if HTML unavailable.
  4. Try downloading PDF via `curl -sL -o Raw/pdfs/<paper-id>.pdf https://arxiv.org/pdf/<id>.pdf`. If fail, log warning and continue without PDF.

- If local PDF path: Read directly.
- If other URL: WebFetch and best-effort extraction.

### Step 2: derive paper-id

Format: `<YY><MM>-<shortname>` where:
- `YY` = last 2 digits of publication year
- `MM` = publication month, zero-padded (use arxiv submission month if venue month unclear)
- `shortname` = method name (lowercase, hyphens for spaces), e.g. `igpo`, `at2po`, `match-tir`

Before committing, check for collision: `Glob Raw/<YYMM-shortname>.md`. If exists, append `-v2` or use a slightly different shortname.

### Step 3: generate the Raw note (understanding-focused 5-section format)

**Output format** (canonical, see `references/raw-template.md`):

```
## TL;DR                 3 bullets + 💡 一句话精华
## Method
   - 核心思路 / 关键设计 / 对比表
   - 🧬 Delta from [前作]         ← 最关键，credit assignment 领域全是小改动
   - 流程示例（必须项）
   - 🧩 因果链（问题 → 根因 → 解法 → 效应）
   - ⚠️ What would break this
## Key Results
   - 训练配置
   - Benchmark 详解（三问：任务来源 / 执行环境 / 分数计算）
   - 核心结果（含意外发现）
## Takeaway
   - 对我研究的启示（可操作）
   - 🧠 理解核验（3 个自检问题）
## Open Questions
## Superseded by
## Related Wiki
```

**设计原则**：section 结构与现有 10 篇 Raw 一致；**section 内部** 加入 5 个「理解型元素」——Delta / 因果链 / What-breaks / 一句话精华 / 理解核验。目标是**让未来的你（或合作者）能快速在脑子里重建这篇论文的 mental model**。

**Invoke the `paper-reading` skill's methodology** if available at `~/.claude/skills/paper-reading/SKILL.md` — it has detailed fetch priorities and extraction focus areas.

**Quality rules** (must satisfy all):
1. **TL;DR 三位一体**：做了什么（结论+数字） + 怎么做（机制一句话） + 为什么有效（解决的根本问题）
2. **一句话精华必须有**：140 字内压缩全文要点——能压缩就说明真懂
3. **🧬 Delta 是本领域核心**：对 agentic RL credit assignment，每篇都是小改动堆积。必须明确指出**和最接近前作比改了什么**（通常 1-2 行就能说清）
4. **流程示例必须项**：每篇都要举具体例子走完整流程，点明与 baseline 的核心差异
5. **🧩 因果链 四要素**：问题 + 根因 + 解法 + 效应——把"为什么有效"拆解到机制层
6. **⚠️ What-breaks 要真实**：论文 Limitation 没明说时可以补充合理推理，但标注"(推测)"
7. **🧠 理解核验 针对核心**：3 个自检问题要刺向方法本质，而非表层事实
8. **数字要具体**：写 "+2.3% on GAIA L3"，不写 "大幅提升"
9. **启示要可操作**：具体 trick / 组件 / 迁移方式，不写 "可以借鉴思路" 类空话
10. **Benchmark 要讲透**：必说清 (a) 任务来源 (b) 执行环境 (c) 分数计算方式
11. **训练细节完整**：基座模型+参数量+数据+算法+硬件，缺失标注「论文未提及」

### Step 4: write Raw file

Load `references/raw-template.md` for header frontmatter. Populate:
- `id`, title, authors, venue, link(s), code link (if found)
- **Tags — MUST follow schema.md's `## 受控标签 (Approved Tags)` vocabulary**
  - Read schema.md's Approved Tags section
  - Pick only from the approved list
  - **If paper introduces a genuinely new concept not covered by existing tags**:
    1. STOP and propose: "Paper uses concept `<X>` which has no approved tag. Suggest new tag `#<suggestion>` — meaning: `<one-line definition>`. Confirm? (yes / no / use existing tag `#<alternative>`)"
    2. If user confirms → **Edit schema.md** to add the new tag + definition to the appropriate category, **THEN** write it into the Raw
    3. If user picks alternative → use the existing tag
  - **Principle**: prefer reusing a close-match existing tag over introducing a new one. Each new tag is a commitment to the vocabulary.
- Body: follow format decision from Step 3

Write to `Raw/<paper-id>.md`.

### Step 5: append log entry

Append to `log.md` **at the top** (newest first) after the header:

```
## [YYYY-MM-DD] ingest | <paper-id> <paper-title-short>

- **Raw**: Raw/<paper-id>.md
- **PDF**: Raw/pdfs/<paper-id>.pdf (if downloaded)
- **Tags**: #tag1 #tag2 #tag3
- **Wiki touched**: none (two-stage — compile pending)
```

### Step 6: report to user + optional compile prompt

Summarize:
- Paper-id and title
- Tags assigned (from controlled vocabulary)
- Whether PDF was downloaded
- Link to the generated Raw file

Then **ask the user** with three options:

> **立刻 compile 吗？**
> - `y` / `yes` / `compile` → 立刻跑 compile subcommand 把这篇整合进 Wiki
> - `n` / `no` / `later` → 先不 compile，我会审阅 Raw（默认；遵循两阶段原则）
> - `show` → 打开 Raw 文件给我看看

**Default behavior** (user doesn't respond / ambiguous): treat as `later` — **do NOT auto-compile**. Two-stage is the safe default; auto-compile is opt-in per ingest.

**If user says `y`**: immediately invoke the **compile subcommand** (below) on just this paper-id. This is a shortcut for confident users who trust the Raw output.

**If user says `n` / `later`**: finish. Wiki unchanged. User triggers `/paper-notes:compile` manually later.

---

## Subcommand: compile [<since-date>]

**Goal:** integrate uncompiled Raw notes into Wiki/ concept pages. Update index.md.

### Step 1: determine scope

- If `<since-date>` provided (YYYY-MM-DD): compile all ingests since that date
- Else: read `log.md` from the top, collect all `ingest` entries newer than the most recent `compile` entry

Report to user which Raws will be compiled. Ask for confirmation if >5 papers (expensive).

### Step 2: extract tag groups

For each Raw in scope:
1. Read the file
2. Extract `#tag` tokens from Tags frontmatter line
3. Extract method names / concepts mentioned in body (grep for proper nouns + schema.md's "关注的子问题" terms)

Group papers by shared tags/concepts.

### Step 3: per-concept integration

For each concept:
1. Try to find existing Wiki page at `Wiki/<Title-Case-Name>.md` (apply schema.md's naming rule)
2. **If exists**:
   - Append new paper's claim to Key Claims section with markdown link citation: `[<paper-id>](../Raw/<paper-id>.md)` （**2026-04-20 起新格式——不用纯方括号 `[paper-id]`，不用 `[[Concept]]` wiki-link**）
   - If claim **contradicts** an existing claim (different methods, opposite direction): append to `## Contradictions / Open Questions` with citations to both Raws — DO NOT overwrite the existing claim
   - Update `[last-updated: YYYY-MM-DD]` header
   - Reconsider `[coverage: ...]` tag based on paper count (per schema.md thresholds)
3. **If not exists**:
   - Check creation threshold from schema.md (default: ≥2 Raws across different papers mention the concept)
   - If threshold met: load `references/wiki-template.md`, create `Wiki/<Title-Case>.md` populated with all papers touching this concept
   - If not met: skip — note in report as "candidate concept, awaiting more papers"

**Link format reference**（always use markdown links, never `[[]]` or bare `[id]`）:
- Wiki → Raw: `[<paper-id>](../Raw/<paper-id>.md)`
- Wiki → Wiki: `[Concept](Concept.md)` (same dir)
- Raw → Wiki: `[Concept](../Wiki/Concept.md)`
- Raw → Raw: `[<other-id>](<other-id>.md)` (same dir)

### Step 4: update index.md

1. Add newly-created Wiki pages to the "核心概念" or "方法论" table
2. Update `coverage` and `last-updated` for all touched concept pages
3. Add new Raw entries to "Raw 论文笔记" table (maintain chronological order, newest first)
4. Update 主题地图 section if new conceptual threads emerge

### Step 5: append log entry

```
## [YYYY-MM-DD] compile | N raws → M wiki pages touched

- **Raws**: <paper-id-1>, <paper-id-2>, ...
- **Wiki updated**: <concept-a>, <concept-b>, ...
- **Wiki created**: <concept-c> (threshold ≥2 met)
- **Candidates awaiting more papers**: <concept-d>
- **Contradictions recorded**: brief list if any
```

### Step 6: report to user

- Summary of changes
- **Prompt**: "git add/commit/push 吗？" (default: yes, commit with a summary message unless user says otherwise)

---

## Subcommand: query <question>

**Goal:** answer a research question using the wiki, with citations.

### Step 1: decompose the question

Identify key concepts/terms in the question. E.g. for "entropy 作为 branching trigger 有哪些方法？":
- Concepts: "entropy", "branching"
- Wiki candidates: `Wiki/Entropy-Guided-Exploration.md`

### Step 2: retrieve

1. Grep `Wiki/` for each key concept (content mode, -i, show file + matching lines)
2. Grep `Raw/` similarly
3. Rank results: Wiki pages first (integrated answers), Raw papers second (specific claims)
4. Read top hits (limit: 5 Wiki + 5 Raw)

### Step 3: synthesize

Write a structured answer:
- Lead with the most integrated claim from relevant Wiki page(s)
- Support with specific `[paper-id]` citations
- If the wiki has contradictions on this topic, present both sides
- If retrieval yielded little, explicitly say "wiki coverage is low for this topic" and suggest running `ingest` on relevant papers

### Step 4: offer to save

If the query was substantive and might be re-asked: offer "Save this answer to `Wiki/queries/YYYY-MM-DD-<slug>.md`?" (default: no — to keep wiki focused on concepts, not Q&A).

---

## Subcommand: lint

**Goal:** validate wiki health. Report issues, do NOT auto-fix unless user requests.

Run these checks (Bash + Grep):

1. **Broken cross-references**: For each markdown link `[<text>](<path>)` in Wiki/ and Raw/, verify target file exists. Common patterns to check:
   - Wiki → Raw: `[id](../Raw/id.md)` — verify `Raw/id.md` exists
   - Wiki → Wiki: `[Concept](Concept.md)` — verify `Wiki/Concept.md` exists
   - Raw → Wiki: `[Concept](../Wiki/Concept.md)` — verify `Wiki/Concept.md` exists
   - **Flag any legacy `[[Concept]]` or bare `[paper-id]` not wrapped as link**——应该已经迁移到 markdown 链接（2026-04-20 起）

2. **Orphan Wiki pages**: For each `Wiki/*.md`, check it is referenced by at least one `Raw/*.md` (via `[paper-id](paper-id.md)` or inline mention) or by `index.md`.

3. **Stale Raws**: Raws in `Raw/` not referenced by any `Wiki/*.md` `Key Claims`. Check their log.md entries — if ingested but never compiled (log.md has `ingest` but no subsequent `compile` touching that paper-id), flag.

4. **Stale Wiki pages**: Any `Wiki/*.md` with `[last-updated: >90 days ago]`.

5. **Schema.md violations**:
   - Raw filenames match `Raw/<YYMM-<shortname>>.md`
   - Required frontmatter fields present (id, Link, Tags)
   - Wiki pages have `[coverage: ...]` and `[last-updated: ...]` tags

6. **Missing PDF**: Raw with `link: arxiv` but no corresponding `Raw/pdfs/<paper-id>.pdf`.

### Output format

```
# Lint report — YYYY-MM-DD

## ❌ Errors (<count>)
- [broken-link] Wiki/Turn-Level-Reward.md line 42: `[[Nonexistent-Concept]]` → file missing
- [schema] Raw/2510-igpo.md: missing `Tags` frontmatter field

## ⚠️ Warnings (<count>)
- [stale-wiki] Wiki/Generative-Reward-Model.md: last-updated 2026-01-02 (> 90 days)
- [missing-pdf] Raw/2601-at2po.md: no Raw/pdfs/2601-at2po.pdf

## 💡 Candidates (<count>)
- [concept-threshold-met] "Importance-Sampling-Granularity" appears in 3 Raws (2601-at2po, 2505-gigpo, 2510-aepo). Create Wiki page?

Ask user whether to fix any of the above.
```

---

## General rules

1. **Always read schema.md first.** It is the source of truth.
2. **Raw is append-only** — never modify an existing Raw's body; add `## Superseded by: [new-id]` section if needed.
3. **Wiki is living** — may be rewritten, but `## Contradictions` section accumulates (never overwrite contradicting claims).
4. **Every state change must be logged** to `log.md` with `## [YYYY-MM-DD] <action> | <target>`.
5. **Never auto-commit** — always ask the user before `git add/commit/push`. (plugin is not responsible for git; that is the user's call.)
6. **Cite with `[paper-id]`** for Raws and `[[Wiki-Page]]` for concept links.
7. If in doubt, ask the user.
