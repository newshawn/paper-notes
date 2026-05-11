# Plan Review: 优化 PaperNotes ingest 稳定性

## Execution Gate

当前 HTML verdict: `proceed after decisions`，不是 `approved`。

不得执行代码修改，直到满足：

- HTML verdict approved。
- blocking decisions resolved。
- 用户明确说可以执行本 Markdown 计划。

## 需求摘要

优化当前 ingest 模块，让 Raw 生成前后更稳定：

- 在生成 Raw 前后加入结构化校验和可审阅报告。
- 稳定检查 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录。
- 保持 ingest 只动 `Raw/` 和 `log.md`。
- 不触碰 `Wiki/`、`index.md`、已有 Raw 或 PDF。

## 术语小抄

| 术语 | 给新手的解释 |
|---|---|
| `blocking` | 阻断项。必须先解决，否则不要执行代码。 |
| `warning` | 警告项。可以继续 review，但执行前要知道风险。 |
| `verdict` | 评审结论：这份计划现在能不能继续。 |
| `handoff` | 交接条件：什么时候从“看 HTML 审计划”进入“按 Markdown 执行”。 |
| `Change Scope` | 改动范围：会改、可能改、绝对不能改的文件。 |

## 实际读取的文件

已读取：

- `AGENTS.md`
- `schema.md`
- `log.md` 顶部
- `dev/plan-artifact-pipeline.md`
- `dev/project-map.md`
- `README.md`
- `Raw/2510-igpo.md`
- `Raw/2601-at2po.md`
- `scripts/check-plan-artifact.mjs`

缺失 / 未发现：

- 未发现 `package.json`
- 未发现 lockfile
- 未发现 Makefile 或测试配置文件
- 未发现已有专门的 ingest 校验脚本

## Evidence-backed Claims

- ingest 只动 `Raw/` 和 `log.md`
  - Evidence: `AGENTS.md`, `README.md`, `dev/project-map.md`
  - Confidence: high
  - Impact if wrong: 可能误改 Wiki，破坏两阶段流程。

- 新 Raw 使用 5-section + 理解型元素
  - Evidence: `schema.md`, `Raw/2510-igpo.md`, `Raw/2601-at2po.md`
  - Confidence: high
  - Impact if wrong: Raw 质量不稳定，后续 compile / query 质量下降。

- Tags 必须来自 `schema.md` Approved Tags
  - Evidence: `schema.md`
  - Confidence: high
  - Impact if wrong: tag 漂移会让 Wiki 概念分裂。

- 当前没有专门 ingest guard 脚本
  - Evidence: repo scan only found `build-review`, `build-dev-renderer`, `check-plan-artifact`
  - Confidence: medium
  - Impact if wrong: 如果隐藏在别处，可能重复造工具；目前未发现。

## 当前流程

当前 ingest 的自然语言流程：

1. 用户输入论文链接 / PDF / 笔记。
2. Agent 读取 `schema.md` 和 `log.md` 顶部。
3. Agent 搜索 `Raw/` 判断是否已有相同 arXiv ID 或明显同题论文。
4. Agent 生成 Raw 草稿。
5. Agent 写入 `Raw/<paper-id>.md`。
6. Agent 在 `log.md` 顶部追加 ingest 记录。

当前风险：

- ID 重复、tag 越界、section 缺失、Related Wiki 缺失、log 格式错误，通常要到写完后才发现。
- 约束主要靠 agent 记忆执行，不够稳定。

## 目标流程

新增最小闭环：

1. Preflight
   - 输入：论文链接、PDF、标题或 Raw draft 路径。
   - 在写文件前检查重复 arXiv ID、AlphaXiv 链接、明显同题 ID。
   - 重复时 blocking。

2. Raw Draft
   - 先生成草稿，不立即落盘。
   - 草稿必须能被后续 guards 检查。

3. Template Guard
   - 检查 ID、Tags、TL;DR、Method、Key Results、Takeaway、Open Questions、Related Wiki。
   - 检查理解型元素：一句话精华、Delta from、因果链、What would break this、理解核验。

4. Tag Guard
   - 从 `schema.md` 抽取 Approved Tags。
   - 检查 draft 的 `Tags:` 是否全部受控。
   - 越界 tag blocking。

5. Related Wiki Guard
   - 检查 Related Wiki 是否存在。
   - 检查链接格式是否为 `[Concept](../Wiki/Concept.md)`。
   - 不在 ingest 阶段创建或修改 Wiki。

6. Review Report
   - 把 blocking / warning / info 翻译成人能看懂的报告。
   - 每个失败 / 边界 case 写清：
     - 发生了什么。
     - 为什么重要。
     - 下一步怎么做。

7. Post-write Check
   - 确认 diff 只包含允许路径。
   - 确认 `log.md` newest first。

## Change Scope

### Will change

- `scripts/ingest-review.mjs`
  - 新增 Node CLI。
  - 支持 preflight / draft check / post-write check。
  - 输出 human-readable report。

- `docs/ingest-review.md`
  - 新增使用说明。
  - 包含 success / duplicate / invalid tag / missing element 示例。

- `AGENTS.md`
  - 在 Ingest 工作流中加入 preflight / guard / post-write check。
  - 不改变 ingest 只动 `Raw/` 和 `log.md` 的红线。

- `CLAUDE.md`
  - 同步 `AGENTS.md` 的规则。

- `dev/project-map.md`
  - 记录新增 ingest review 脚本入口。

- `log.md`
  - 顶部追加 refactor 记录。

### Might change

- `README.md`
  - 如果需要面向普通用户展示命令，可增加简短说明。
  - 默认不改，避免扩大范围。

### Must not change

- `Wiki/`
- `index.md`
- existing `Raw/*.md`
- `Raw/pdfs/`
- 与 ingest review 无关的 dev renderer 文件

## 改动前后对比

| 行为 | 保持不变 | 会变化 | 明确不做 |
|---|---|---|---|
| 写入边界 | ingest 仍只动 Raw/log | 写入前后多边界检查 | 不在 ingest 阶段改 Wiki |
| Raw 结构 | 仍用 5-section + 理解型元素 | 缺关键结构时先报告 | 不批量修旧 Raw |
| Tags | 仍以 schema Approved Tags 为准 | 越界 tag 会被阻断或要求用户确认 | 不偷偷自造 tag |
| log | 仍 newest first | 写入后检查格式和位置 | 不为失败 preflight 追加 ingest log |

## End-to-End Demos

### Blocked path：重复论文

用户输入：

```text
帮我 ingest 这篇论文：https://arxiv.org/abs/2510.14967
```

发生了什么：

- Preflight 发现仓库已经有这篇论文：`Raw/2510-igpo.md`。
- 这不是新论文。

为什么重要：

- 如果继续写，会出现第二份 Raw。
- 后续 compile 可能重复统计同一篇论文。
- `log.md` 会留下误导记录。

下一步怎么做：

- 打开已有 `Raw/2510-igpo.md` 看是否够用。
- 如果只是补充笔记，用户必须明确允许 append 到已有 Raw。
- 默认不新增 Raw，也不追加 log。

Report 摘要：

```text
BLOCKING duplicate-paper: 重复论文，先不要写文件
Existing Raw: Raw/2510-igpo.md
Reason: this paper is already ingested
Next: review existing Raw, or ask user whether to append notes to the existing Raw
```

### Success path：新论文链接通过校验

用户输入：

```text
帮我 ingest 这篇论文：https://arxiv.org/abs/2605.12345
```

目标流程：

1. Preflight 扫描 `Raw/`，未发现重复 arXiv ID。
2. Agent 读取 `schema.md` 和 Raw 样例生成 draft。
3. Template Guard 检查 5-section 和理解型元素。
4. Tag Guard 检查 tags 都来自 Approved Tags。
5. Related Wiki Guard 检查链接格式。
6. Review Report 输出 `0 blocking`。
7. Agent 写入 `Raw/2605-shortname.md`。
8. Agent 在 `log.md` 顶部追加 ingest 记录。
9. Post-write Check 确认只动了新 Raw 和 `log.md`。

### Warning path：缺理解型元素

| 情况 | 发生了什么 | 为什么重要 | 下一步怎么做 |
|---|---|---|---|
| 缺 `Tags` | Raw draft 没有 Tags 行 | compile 时无法稳定定位概念 | blocking，补 Tags 后再写入 |
| 出现 `#entropy-guided` | schema 没有这个 tag | tag 漂移会让 Wiki 概念分裂 | blocking，映射到 `#entropy` 或让用户确认新增 tag |
| 缺 `What would break this` | 新 Raw 少了边界条件分析 | 读者不知道方法什么时候会失效 | 新 Raw 建议 blocking；旧 Raw warning-only |

## Human Decisions

执行前需要用户拍板：

1. 是否新增 `scripts/ingest-review.mjs`
   - 推荐：新增。
   - 原因：把 ingest 校验从 agent 记忆变成可重复检查。
   - 备选：只写文档，不加脚本。
   - Blocking: yes。

2. 缺理解型元素算 warning 还是 blocking
   - 推荐：新 Raw blocking；旧 Raw warning-only。
   - 原因：既保证新 ingest 稳定，又不 retrofit 旧 Raw。
   - Blocking: yes。

3. Review Report 是否落盘
   - 推荐：默认不落盘，只终端输出。
   - 备选：增加 `--report` 输出到指定路径。
   - Blocking: no，若用户不指定则按推荐执行。

## Acceptance Checklist

- 我能看懂当前 ingest 是自然语言工作流，不是已有专门脚本。
- 我确认新增 guard 是为了稳定新 Raw，不是批量修旧 Raw。
- 我确认 `Wiki/`、`index.md`、已有 Raw、PDF 不应被修改。
- 我确认失败 demo 已说明发生了什么、为什么重要、下一步怎么做。
- 我确认 Human Decisions 中的 blocking 问题已经拍板。
- 我接受执行后需要回填实际改动、验证结果和计划偏离。

## 执行步骤

仅在 Execution Gate 通过后执行：

1. 重新读取必读文件
   - `AGENTS.md`
   - `CLAUDE.md`
   - `schema.md`
   - `log.md` 顶部
   - `dev/project-map.md`
   - `Raw/2510-igpo.md`
   - `Raw/2601-at2po.md`
   - `scripts/check-plan-artifact.mjs`

2. 实现 `scripts/ingest-review.mjs`
   - 使用 Node ESM。
   - 支持：
     - `node scripts/ingest-review.mjs --preflight "https://arxiv.org/abs/2510.14967"`
     - `node scripts/ingest-review.mjs --draft path/to/draft.md`
     - `node scripts/ingest-review.mjs --post-write`
   - 默认输出 human-readable report。

3. 新增 `docs/ingest-review.md`
   - 说明何时运行。
   - 说明 duplicate、invalid tag、missing element 的处理方式。
   - 说明旧 Raw warning-only，不 retrofit。

4. 更新 agent 规则
   - `AGENTS.md`
   - `CLAUDE.md`

5. 更新项目地图和日志
   - `dev/project-map.md`
   - `log.md`

## 验证命令

至少运行：

```bash
node --check scripts/ingest-review.mjs
node scripts/ingest-review.mjs --preflight "https://arxiv.org/abs/2510.14967"
node scripts/ingest-review.mjs --draft Raw/2510-igpo.md
node scripts/ingest-review.mjs --draft Raw/2601-at2po.md
git diff --check
```

预期：

- `--preflight 2510.14967` 报 duplicate blocking，指向 `Raw/2510-igpo.md`。
- 两个现有 Raw 样例不应被修改。
- 如果脚本对历史兼容问题有 warning，不得自动修复。
- `git diff` 不包含 `Wiki/`、`index.md`、existing Raw 或 PDF 修改。

## 完成后的记录 / 提交要求

如果执行了代码或文档修改：

1. 更新 `log.md`。
2. 运行验证命令。
3. 确认 `git status --short` 只包含本计划允许文件。
4. 按仓库规则提交并 push，除非用户明确说不要。

## Post-Execution Handoff

执行完成后必须回填：

- 实际改动文件，也就是实际修改 / 新增的文件。
- 和 HTML plan 一致的地方。
- 偏离 HTML / Markdown 的地方，以及为什么偏离。
- 实际运行的验证命令和结果。
- 是否更新了 `dev/project-map.md`。
- 是否还需要后续把 ingest health 接入 `review.html`。
