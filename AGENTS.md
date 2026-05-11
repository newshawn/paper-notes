# AGENTS.md

这是 paper-notes LLM Wiki（Karpathy 模式的论文知识库，主方向 Agentic RL 中的 Credit Assignment）。每次在这个目录下工作，都按本文件和 [`schema.md`](schema.md) 执行。

## 操作前必读

- [`schema.md`](schema.md) — 研究方向、Raw/Wiki 结构、受控 tag 词汇、整合规则
- [`log.md`](log.md) 头部几行 — 最近一次 ingest / compile / lint / refactor 状态
- 生成新 Raw 前，先读一篇 existing Raw 对齐详略和术语，推荐 `Raw/2510-igpo.md` 或 `Raw/2601-at2po.md`

## 工作红线

1. **两阶段**：`ingest` 只动 `Raw/` 和 `log.md`，绝不改 `Wiki/`；`compile` 只在用户显式触发时进行。
2. **Raw 只增不改**：已有早期 Raw 保留现状，不 retrofit，除非用户明说。
3. **Tag 受控**：Raw 的 `Tags:` 只能从 `schema.md` 的受控标签中选；没有合适 tag 时，先让用户确认并登记到 `schema.md`。
4. **Wiki 冲突累积不覆盖**：新论文与旧 claim 冲突时，写入该概念页的 `## Contradictions / Open Questions`，引用双方 `[paper-id](...)`；不要改动原 claim。
5. **Git 自动提交**：完成用户要求的 repo 文件改动并通过基本检查后，默认直接 `git add` 相关改动、`git commit`、`git push`；除非用户明确说“先别提交 / 别 push / 只改文件”。不 force push、不跳 hooks、不提交 secrets。

## 自然语言工作流

### Ingest

触发方式：用户扔 arxiv 链接、PDF 路径、论文标题、论文笔记，或说“ingest / 归档 / 加进 wiki”。

执行规则：

- 先读 `schema.md` 和 `log.md` 头部。
- 检查 `Raw/` 是否已有相同 arxiv id 或明显同题论文。
- 只使用 `schema.md` 受控标签。
- 新建 `Raw/<YYMM-shortname>.md`，必要时保存 PDF 到 `Raw/pdfs/<paper-id>.pdf`。
- Raw 使用 5-section + 5 个理解型元素：TL;DR / Method / Key Results / Takeaway / Open Questions，以及一句话精华、Delta、因果链、What-breaks、理解核验。
- 在 `log.md` 顶部追加 ingest 记录。
- 不修改 `Wiki/`。

### Compile

触发方式：用户明确说“compile / 更新 Wiki / 整合进 Wiki”。

执行规则：

- 从 `log.md` 找出最近一次 compile 之后的 ingest，或按用户指定 paper-id / 日期确定范围。
- 读取相关 Raw，按 tag 和概念定位 Wiki 页。
- 已有 Wiki 页：追加新 claim、open question 或 contradiction；更新 coverage / last-updated。
- 新概念：遵循 `schema.md` 的创建阈值，默认至少 2 篇 Raw 触及才建页。
- 更新 `index.md`。
- 在 `log.md` 顶部追加 compile 记录。

### Query

触发方式：用户问研究问题、要 related work、要比较方法、要找 open questions。

执行规则：

- 优先读 `Wiki/`，再按 citation 回到 `Raw/` 查具体论文和数字。
- 回答中保留可追溯引用，使用 markdown 链接。
- 如果 Wiki 覆盖不足，明确说明缺口，不编造共识。

### Lint / Health Check

触发方式：用户说“检查健康 / lint / 看看哪里乱了”。

检查项：

- Raw 是否缺必要 section、ID、Tags、Related Wiki。
- Tags 是否越出 `schema.md` 受控词汇。
- Wiki / Raw 链接是否仍是可点击 markdown 链接。
- log 是否 newest first。
- 是否有 ingest 后尚未 compile 的 Raw。

默认只报告，不自动修复，除非用户要求。

## 文件约定

- `Raw/<YYMM-shortname>.md` — 例：`2510-igpo.md`
- `Raw/pdfs/<paper-id>.pdf` — 文件名必须等于 paper-id
- `Wiki/<Title-Case>.md` — 例：`Credit-Assignment-in-Agentic-RL.md`
- `log.md` — 顶部追加，格式：`## [YYYY-MM-DD] <action> | <target>`

## 链接格式

- Wiki → Raw：`[<paper-id>](../Raw/<paper-id>.md)`
- Wiki → Wiki：`[Concept](Concept.md)`
- Raw → Wiki：`[Concept](../Wiki/Concept.md)`
- Raw → Raw：`[<other-id>](<other-id>.md)`

不要使用纯方括号 `[2510-igpo]` 或 wiki-link `[[Concept]]`。

## 绝对不做

- 不修改 `Wiki/` 里已有 `Key Claims` 来覆盖旧结论。
- 不无视 `schema.md` 自造 tag。
- 不重命名 `Raw/pdfs/` 里的 PDF。
- 不在 Wiki 概念页里提到单篇论文却不给可点击 Raw 链接。
- 不提交 secrets / API keys / 私人邮箱等敏感信息。

## 上下文

- 用户 GitHub: `newshawn`
- 用户研究方向：Agentic RL Credit Assignment（LLM Agent 的 step/turn-level reward 设计）
- 用户所在：浙江大学 2027 届研究生
- 远程 repo：https://github.com/newshawn/paper-notes
