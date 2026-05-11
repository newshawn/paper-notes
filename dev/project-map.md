# Project Map

这份文档说明当前项目的模块分布、每个模块负责什么，以及 agent 在生成 `plan-review.html` 时应该从哪里深入读取代码。

它不是代码真相源；代码和 Markdown 文件本身仍然是真相源。它的作用是帮助 agent 快速定位相关区域，生成更准确的 plan artifact。

## 如何生成 / 维护这份文档

首次创建时，让 agent 按下面步骤生成：

1. 读取 `README.md`、`AGENTS.md`、`schema.md`、`log.md` 顶部。
2. 扫描顶层目录和 `docs/`、`scripts/`、`Raw/`、`Wiki/`。
3. 对每个模块写清：
   - 模块职责。
   - 关键文件。
   - 常见改动入口。
   - 生成 / 验证命令。
   - 不能破坏的约束。
4. 不要把每个文件都展开成清单，只记录 agent 做 plan 时真正需要的导航信息。

实时维护规则：

- 新增或重命名顶层模块时，更新本文件。
- 改变某个工作流边界时，更新对应模块的“约束”。
- 新增生成脚本、lint 脚本或 review 入口时，更新“常见改动入口”和“验证命令”。
- 不要把论文内容摘要复制到这里；论文知识仍在 `Raw/` 和 `Wiki/`。

## 模块地图

### Root Rules

职责：定义整个仓库的 agent 行为、知识库结构和维护边界。

关键文件：

- `AGENTS.md`：Codex / agent 在本仓库工作时必须遵守的规则。
- `CLAUDE.md`：Claude 风格的同类规则说明。
- `schema.md`：PaperNotes 知识库 schema、Raw/Wiki 结构、受控标签。
- `log.md`：append-only 时间线，记录 ingest / compile / lint / refactor。
- `README.md`：面向人的总入口。

常见改动入口：

- 工作流规则变化：改 `AGENTS.md`、`CLAUDE.md`、`schema.md` 或相关 `docs/`。
- 每次 repo 文件改动：在 `log.md` 顶部追加记录。

约束：

- `log.md` newest first。
- 不在未触发 compile 时修改 `Wiki/`。
- Raw 已有文件默认 append-only，不随意 retrofit。

### Raw Notes

职责：保存单篇论文的结构化笔记。

关键文件：

- `Raw/<paper-id>.md`：单篇论文笔记。
- `Raw/pdfs/<paper-id>.pdf`：论文 PDF，文件名必须等于 paper-id。

常见改动入口：

- 用户给论文链接 / PDF / 笔记时，新建 Raw。
- ingest 时读取已有 Raw 以对齐风格，推荐 `Raw/2510-igpo.md` 或 `Raw/2601-at2po.md`。

约束：

- ingest 只动 `Raw/` 和 `log.md`。
- Tags 只能使用 `schema.md` 的受控标签。
- 新 Raw 使用 5-section + 理解型元素格式。

### Wiki Concepts

职责：保存跨论文概念页和整合后的 claim。

关键文件：

- `Wiki/*.md`：概念页。
- `index.md`：Wiki catalog。

常见改动入口：

- 用户明确说 compile / 更新 Wiki 时，读取最近未 compile 的 Raw 并整合。
- 查询问题时，优先读 Wiki，再回到 Raw 查证数字和证据。

约束：

- 新论文与旧 claim 冲突时，追加到 `Contradictions / Open Questions`，不要覆盖旧 claim。
- 单篇论文不单独建 Wiki 概念页。
- Wiki 提到论文时必须给可点击 Raw 链接。

### HTML Review Layer

职责：让人类更容易观察仓库状态、审阅 Raw/Wiki、review plan artifact。

关键文件：

- `review.html`：仓库 / Wiki 状态观察层。
- `dev/index.html`：HTML + Markdown plan artifact renderer。
- `dev-cockpit.html`：兼容旧链接的跳转页。
- `scripts/build-review.mjs`：生成 `review.html`。
- `scripts/build-dev-renderer.mjs`：生成 `dev/index.html` 和 `dev-cockpit.html`。

常见改动入口：

- 改 review 页面：编辑 `scripts/build-review.mjs`，再运行 `node scripts/build-review.mjs`。
- 改 plan artifact renderer：编辑 `scripts/build-dev-renderer.mjs`，再运行 `node scripts/build-dev-renderer.mjs`。
- 改 plan pipeline：编辑 `dev/plan-artifact-pipeline.md` 和本文件。

约束：

- HTML 文件是生成物，不直接手改。
- 改生成器后必须重新生成对应 HTML。
- `dev/index.html` 只负责渲染，不承担 prompt 生成、规则展示或复杂决策 UI。

### Workflow Docs

职责：解释为什么这么维护，以及如何迁移/复用。

关键文件：

- `dev/plan-artifact-pipeline.md`：生成 HTML+Markdown plan artifact 的规则。
- `dev/project-map.md`：当前项目模块分布说明。
- `dev/README.md`：dev renderer 使用方式。
- `docs/html-review-workflow.md`：review.html 使用方式。
- `docs/architecture.md`、`docs/why.md`、`docs/fork-guide.md`、`docs/schema-template.md`：背景、架构和迁移说明。

常见改动入口：

- 流程抽象变化：优先更新 `dev/plan-artifact-pipeline.md`。
- 模块分布变化：更新本文件。
- 用户入口变化：更新 README 和相关 workflow 文档。

约束：

- 文档应服务 agent 执行和人类 review，不堆无用说明。
- Pipeline 规则尽量保持项目可迁移，项目特定细节放在本文件。
