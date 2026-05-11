# Plan Review: 优化 PaperNotes ingest 稳定性

## Execution Gate

当前 HTML verdict: `proceed after decisions`，不是 `approved`。

不得执行代码修改，直到满足：

- HTML verdict approved。
- blocking decisions resolved。
- 用户明确说可以执行本 Markdown 计划。

## 术语小抄

| 术语 | 给新手的解释 |
|---|---|
| `blocking` | 阻断项。必须先解决，否则不要执行代码。例如可能误改 `Wiki/`，或者用户还没确认关键决策。 |
| `warning` | 警告项。可以继续 review，但执行前最好确认或记录风险。例如旧 Raw 格式不完整但不打算 retrofit。 |
| `info` | 提示项。帮助理解上下文，不影响是否执行。 |
| `verdict` | 评审结论。告诉你当前计划是建议继续、需要补证据，还是不建议执行。 |
| `approved` | 人类已经确认 HTML 合理，可以把同步 Markdown 交给 agent 执行。 |
| `handoff` | 交接。说明什么时候从“看 HTML 审计划”进入“按 Markdown 执行”。 |
| `Change Scope` | 改动范围。列清会改、可能会改、绝对不能改的文件，防止误伤无关内容。 |

## 需求摘要

优化当前 ingest 模块，让 Raw 生成前后更稳定：

- 在生成 Raw 前后加入结构化校验和可审阅报告。
- 稳定检查 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录。
- 保持 ingest 只动 `Raw/` 和 `log.md`。
- 不触碰 `Wiki/`、`index.md`、已有 Raw 或 PDF。

## 实际读取的文件

已读取：

- `dev/plan-artifact-pipeline.md`
- `dev/project-map.md`
- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `schema.md`
- `log.md` 顶部
- `Raw/2510-igpo.md`
- `Raw/2601-at2po.md`
- `scripts/check-plan-artifact.mjs`
- `scripts/build-review.mjs` 开头
- repo 文件列表

缺失 / 未发现：

- 未发现 `package.json`
- 未发现 lockfile
- 未发现 Makefile 或测试配置文件
- 未发现已有专门的 ingest 校验脚本

## Evidence-backed Claims

- ingest 只动 `Raw/` 和 `log.md`
  - Evidence: `AGENTS.md`, `README.md`, `dev/project-map.md`
  - Confidence: high

- 新 Raw 使用 5-section + 理解型元素
  - Evidence: `schema.md`, `Raw/2510-igpo.md`, `Raw/2601-at2po.md`
  - Confidence: high

- Tags 必须来自 `schema.md` Approved Tags
  - Evidence: `schema.md`
  - Confidence: high

- 当前没有脚本化 ingest guard
  - Evidence: repo scan only found `build-review`, `build-dev-renderer`, `check-plan-artifact`
  - Confidence: medium

- 旧 Raw 不应自动 retrofit
  - Evidence: `AGENTS.md`, `CLAUDE.md`, `README.md`
  - Confidence: high

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
   - 推荐：默认不落盘，只终端输出；成功 ingest 摘要写进 `log.md`。
   - 备选：增加 `--report` 输出到指定路径。
   - Blocking: no，若用户不指定则按推荐执行。

## Change Scope

### Will change

- `scripts/ingest-review.mjs`
  - 新增 Node CLI。
  - 负责读取 `schema.md`、`Raw/`、`log.md`，对 draft 或目标 Raw 做结构化校验。
  - 输出 blocking / warning / info report。

- `docs/ingest-review.md`
  - 新增使用说明。
  - 解释 preflight、template guard、tag guard、review report、post-write check。

- `AGENTS.md`
  - 在 Ingest 工作流中加入运行 review report 的要求。
  - 保持 ingest 只动 `Raw/` 和 `log.md` 的红线。

- `CLAUDE.md`
  - 同步 `AGENTS.md` 的 ingest review 规则。

- `dev/project-map.md`
  - 记录新增 ingest review 脚本入口。

- `log.md`
  - 顶部追加 refactor 记录。

### Might change

- `README.md`
  - 如果需要面向普通用户展示命令，可增加简短说明。
  - 默认可以不改，避免扩大范围。

- `scripts/build-review.mjs`
  - 本轮不推荐修改。
  - 只有当用户希望 `review.html` 显示 ingest health 时再考虑。

### Must not change

- `Wiki/`
- `index.md`
- existing `Raw/*.md`
- `Raw/pdfs/`
- 与 ingest review 无关的 dev renderer 文件

## 目标设计

新增最小闭环：

1. Preflight
   - 输入：论文链接 / PDF / 标题 / Raw draft 路径。
   - 检查：Raw 是否已有相同 arXiv ID、AlphaXiv 链接、明显同题 ID。
   - 重复时 blocking。

2. Template Guard
   - 检查新 Raw 是否包含：
     - `ID`
     - `Tags`
     - `TL;DR`
     - `Method`
     - `Key Results`
     - `Takeaway`
     - `Open Questions`
     - `Related Wiki`
   - 检查理解型元素：
     - 一句话精华
     - Delta from
     - 因果链
     - What would break this
     - 理解核验

3. Tag Guard
   - 从 `schema.md` Approved Tags 中抽取受控标签。
   - 检查 Raw `Tags:` 中每个 tag 是否受控。
   - 越界 tag blocking。
   - 没有合适 tag 时提示用户确认新增，不自动修改 schema。

4. Related Wiki Guard
   - 检查 `Related Wiki` 是否存在。
   - 检查链接格式是否为 `[Concept](../Wiki/Concept.md)`。
   - 只报告，不在 ingest 时创建或修改 Wiki。

5. Log Guard
   - 检查 `log.md` 顶部格式是否符合：
     - `## [YYYY-MM-DD] <action> | <target>`
   - post-write 时确认新增记录在顶部。

6. Boundary Guard
   - post-write 时确认 diff 只包含允许路径。
   - ingest 场景允许：新 Raw、必要 PDF、`log.md`。
   - 本次工具开发允许：本 Change Scope 中的文档和脚本。
   - 禁止：`Wiki/`、`index.md`、已有 Raw、PDF 重命名。

## End-to-End Demos

### Success path

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

### Blocked path：重复论文（为什么要停）

用户输入：

```text
帮我 ingest 这篇论文：https://arxiv.org/abs/2510.14967
```

目标流程：

1. Preflight 发现仓库里已经有这篇论文的笔记：`Raw/2510-igpo.md`。
2. Report 用人能理解的话解释：
   - 发生了什么：这不是新论文，`2510.14967` 已经对应到 `Raw/2510-igpo.md`。
   - 为什么要停：继续写入会产生重复 Raw，后续 compile 可能重复统计同一篇论文，`log.md` 也会多一条误导记录。
   - 下一步怎么做：打开已有 Raw 检查是否够用；如果用户只是想补充内容，需要明确说“允许 append 到这篇已有 Raw”。
3. Review Report 可以同时保留机器可读摘要：

```text
BLOCKING duplicate-paper：重复论文，先不要写文件
Existing Raw: Raw/2510-igpo.md
Reason: this paper is already ingested
Next: review existing Raw, or ask user whether to append notes to the existing Raw
```

4. Agent 停止，不写任何文件。

### Warning path

Raw draft 缺少：

```markdown
### ⚠️ What would break this
```

目标处理：

- 如果是新 Raw：blocking，要求补齐后再写入。
- 如果是旧 Raw 健康检查：warning-only，不 retrofit。
- Report 必须明确说明是哪一种上下文。

### Tag 越界 case

Raw draft:

```markdown
- **Tags**: #credit-assignment #entropy-guided
```

目标处理：

```text
BLOCKING invalid-tag
Invalid: #entropy-guided
Suggested existing tag: #entropy
Action: use approved tag or ask user to add new tag to schema.md first.
```

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
   - `scripts/build-review.mjs` 中可复用的 markdown parser 风格

2. 实现 `scripts/ingest-review.mjs`
   - 使用 Node ESM。
   - 支持最小命令形态：
     - `node scripts/ingest-review.mjs --draft path/to/draft.md`
     - `node scripts/ingest-review.mjs --preflight "https://arxiv.org/abs/2510.14967"`
     - `node scripts/ingest-review.mjs --post-write`
   - 输出 JSON 或 human-readable report。推荐默认 human-readable，后续再加 `--json`。

3. 脚本检查项
   - schema Approved Tags 抽取。
   - draft ID 格式。
   - duplicate link / id 检查。
   - required sections。
   - required understanding elements。
   - `Related Wiki` 链接格式。
   - `log.md` newest-first 格式。
   - optional post-write path boundary check。

4. 新增 `docs/ingest-review.md`
   - 说明何时运行。
   - 给出 success / duplicate / invalid tag / missing element 示例。
   - 说明旧 Raw warning-only，不 retrofit。
   - 说明不修改 `Wiki/`。

5. 更新 agent 规则
   - `AGENTS.md` Ingest 流程加入 preflight / draft review / post-write check。
   - `CLAUDE.md` 同步同样规则。
   - 不改变两阶段原则。

6. 更新 `dev/project-map.md`
   - 在 Raw Notes 或 Workflow Docs 中增加 `scripts/ingest-review.mjs`。
   - 标明它是 ingest 稳定性检查入口。

7. 可选更新 `README.md`
   - 只有当需要面向普通用户展示命令时才改。
   - 若改，只加一两行，不扩展成大教程。

8. 更新 `log.md`
   - 顶部追加 refactor 记录。
   - 写明 Wiki touched: none。

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

如果生成临时 draft 做负例测试，使用 `/private/tmp`，不要写入仓库。

## 完成后的记录 / 提交要求

如果执行了代码或文档修改：

1. 更新 `log.md`。
2. 运行验证命令。
3. 确认 `git status --short` 只包含本计划允许文件。
4. 按仓库规则提交并 push，除非用户明确说不要。

## Post-execution Handoff

执行完成后必须回填：

- 实际改动文件，也就是实际修改 / 新增的文件。
- 和 HTML plan 一致的地方。
- 偏离 HTML / Markdown 的地方，以及为什么偏离。
- 实际运行的验证命令和结果。
- 是否更新了 `dev/project-map.md`。
- 是否还需要后续把 ingest health 接入 `review.html`。
