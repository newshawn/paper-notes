# CLAUDE.md

这是 paper-notes LLM Wiki（Karpathy 模式的论文知识库，主方向 Agentic RL 中的 Credit Assignment）。每次你在这个目录下工作时都会自动读到本文件。

## 操作前必读

- [`schema.md`](schema.md) — 研究方向 + 受控 tag 词汇 + 整合规则
- [`log.md`](log.md) 头部几行 — 最近一次 ingest / compile / refactor 状态

## 工作红线（任何情况都要遵守）

1. **两阶段**：`ingest` 只动 `Raw/` 和 `log.md`，**绝不改 `Wiki/`**；`compile` 只在用户显式触发时进行
2. **Raw 只增不改**：已有 10 篇（`2505-*` 至 `2602-*`）保留现状，**不 retrofit**（除非用户明说）
3. **Tag 必须从 schema.md 的"受控标签"词汇中选**——发现新概念无对应 tag 时，先让用户确认 + 登记到 schema.md，再写入 Raw
4. **Wiki 冲突累积不覆盖**：新论文与旧 claim 冲突 → 写入该概念页的 `## Contradictions / Open Questions` 段落，引用双方 `[paper-id]`；**不要改动原 claim**
5. **Git**：commit 完**直接 push**（用户偏好已确认，见 `~/.claude/projects/.../memory/git_auto_push.md`）；不 force push、不跳 hooks

## 推荐工作流

### 装了 paper-notes plugin（本 repo 自带，见 `plugin/`）

- 用户扔 arxiv 链接 / PDF 路径 / 说 "ingest" → 调用 `paper-notes` skill 的 `ingest` 子流程
- 用户审阅 Raw 后说 "compile" → 调用 skill 的 `compile` 子流程
- 用户问研究问题 → 调用 skill 的 `query` 子流程
- 用户说"检查健康" → 调用 skill 的 `lint` 子流程

Skill 详细工作流见 [`plugin/skills/paper-notes/SKILL.md`](plugin/skills/paper-notes/SKILL.md)。

### 没装 plugin（plugin repo 未启用时的 fallback）

按 [`plugin/skills/paper-notes/SKILL.md`](plugin/skills/paper-notes/SKILL.md) 的 **Setup + 6 Steps** 手动执行。关键步骤：
- 生成 Raw 前 **先 Read 一篇 existing Raw**（推荐 `Raw/2510-igpo.md` 或 `Raw/2601-at2po.md`）对齐格式 / 详略 / 术语
- Raw 格式 = 5-section + 5 个理解型元素（💡 / 🧬 / 🧩 / ⚠️ / 🧠）
- 每次状态变更必须 append `log.md`

## 文件约定

- `Raw/<YYMM-shortname>.md` — 例：`2510-igpo.md` / `2601-at2po.md`
- `Raw/pdfs/<paper-id>.pdf` — **文件名必须等于 paper-id**，它是 Raw 笔记链接锚
- `Wiki/<Title-Case>.md` — 例：`Credit-Assignment-in-Agentic-RL.md`
- `log.md` **顶部追加**（newest first），格式见 [`plugin/skills/paper-notes/references/log-format.md`](plugin/skills/paper-notes/references/log-format.md)

## 链接格式（2026-04-20 起）

**全部用 markdown 链接格式，GitHub 可渲染为可点链接**：

- **Wiki → Raw**：`[<paper-id>](../Raw/<paper-id>.md)` — 例：`[2510-igpo](../Raw/2510-igpo.md)`
- **Wiki → Wiki**（同目录）：`[Concept](Concept.md)` — 例：`[Turn-Level-Reward](Turn-Level-Reward.md)`
- **Raw → Wiki**：`[Concept](../Wiki/Concept.md)`
- **Raw → Raw**（同目录）：`[<other-id>](<other-id>.md)`

**不要用**：
- ❌ 纯方括号 `[2510-igpo]`（不是链接，点不动）
- ❌ Wiki-link `[[Concept-Name]]`（GitHub 不渲染）

## 绝对不做

- ❌ 修改 `Wiki/` 里现有的 `Key Claims` 段落（所有新信息走 `Contradictions` 或追加）
- ❌ 无视 schema.md 的 tag 词汇自造 tag
- ❌ 重命名 `Raw/pdfs/` 里的 PDF（破坏 paper-id 链接锚）
- ❌ 在 Wiki 概念页里提到单篇论文却不用 `[paper-id]` 格式（破坏可追溯性）
- ❌ Commit 敏感信息（secrets / API keys / 私人邮箱若未脱敏）

## 与 plugin SKILL.md 的关系（优先级说明）

本文件提供 **宪法级红线**（high-level principles）。当 skill 被触发（用户聊天里说 ingest / compile / query / lint 任一意图）时，plugin 的 [`plugin/skills/paper-notes/SKILL.md`](plugin/skills/paper-notes/SKILL.md) **在执行细节上权威**——遵循它的 Setup + Step 1-6 工作流。

**精度分工**：
- **CLAUDE.md**（本文件）：*what NOT to do* —— 五条红线 + 绝对不做清单
- **SKILL.md**：*how to do* —— 精确步骤 + 11 条 quality rules

**遇到不一致时**：
- 执行层面（格式 / 步骤 / tool 调用）→ 以 SKILL.md 为准（在 skill 调用范围内）
- 红线层面（两阶段 / append-only / tag 受控 / 冲突累积 / Git）→ **任何情况下都不能破**

如果发现 SKILL.md 与本文件的红线冲突，**停下来报告给用户**——这是 repo 维护漂移的信号，不应由 Claude 自行决定。

## 上下文

- 用户 GitHub: `newshawn`
- 用户研究方向：Agentic RL Credit Assignment（LLM Agent 的 step/turn-level reward 设计）
- 用户所在：浙江大学 2027 届研究生
- 远程 repo：https://github.com/newshawn/paper-notes
- Plugin 通过本 repo 的 `.claude-plugin/marketplace.json` 发布，install 指令见 [README.md](README.md#plugin-安装)
