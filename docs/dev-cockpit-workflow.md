# 开发工作台教程

`dev-cockpit.html` 是本仓库的 plan artifact review shell。它的目标不是替你直接写代码，而是把“需求 + 项目规则”变成一份可视化 plan artifact：先让大模型生成 `plan-review.html` 和 `plan-review.md`，你审阅 HTML 是否讲清楚现状、方案、例子和风险，确认后再把 markdown 交给执行模型。

一句话流程：

```text
需求 prompt -> 生成 HTML + Markdown plan -> 人类看 HTML review -> 修改 plan artifact -> 交给 LLM 执行
```

## 真相源

- 源码、Markdown 文档、`Raw/`、`Wiki/`、`schema.md` 和 `log.md` 仍然是真相源。
- `dev-cockpit.html` 是生成物，只帮助组织输入、预览大模型生成的 plan artifact，不应该手改。
- 生成器是 `scripts/build-dev-cockpit.mjs`。

## 生成

```bash
node scripts/build-dev-cockpit.mjs
```

生成器会扫描仓库文件、最近的 `log.md` 记录，以及轻量 Raw/Wiki 摘要，然后写入 `dev-cockpit.html`。

## 什么时候用哪个入口

不要因为“会用到 HTML”就永远选“可视化评审”。这里的关键不是 HTML 本身，而是你想怎么 review 这次需求。

- **最小闭环**：需求还不稳定，只想先跑通一个小版本。
- **稳健计划**：日常改代码、改算法、改流程时的默认选择，目标是得到可靠执行计划。
- **可视化评审**：你希望 plan 本身被 HTML 可视化，方便检查“现有系统是什么、要改什么、例子是否合理、风险在哪里”。
- **先理解**：先看清仓库结构或某个模块，再决定是否动手。

如果你的目标是“让 LLM 先生成一个可读的 HTML plan，我 review 后再执行”，就选“可视化评审”。

## 项目规则上下文有什么用

这里的“项目规则上下文”不是让页面展示一大段仓库概览，而是把必要事实塞进复制给 LLM 的指令里，避免执行时跑偏。

在这个仓库里，它主要包含：

- `AGENTS.md` / `schema.md` / `log.md` 这些必须先读的规则。
- 相关文件匹配结果，比如 `scripts/build-dev-cockpit.mjs`、`docs/dev-cockpit-workflow.md`。
- 项目特有边界，比如 ingest 只动 `Raw/` 和 `log.md`，compile 才能改 `Wiki/`。
- 生成物规则，比如改生成器后要重新生成 HTML。

别的项目也能用，但要换成那个项目自己的规则源。例如普通前端项目可以换成 `README.md`、`package.json`、`src/`、测试命令、设计系统约束；算法项目可以换成核心模块、数据格式、实验脚本和评测命令。能迁移的是 pipeline，不是 PaperNotes 的 Raw/Wiki 规则本身。

## 完整 pipeline

1. 打开 `dev-cockpit.html`。
2. 选择任务入口。日常默认“稳健计划”；想看 HTML plan demo 时选“可视化评审”。
3. 在需求框里写清楚你要改什么，以及为什么改。
4. 在关键词里填相关模块名、文件名或概念，比如 `ingest Raw schema tags log lint`。
5. 点击“复制 artifact 生成指令”，把指令交给大模型。
6. 要求大模型只返回两个 code block：`plan-review.html` 和 `plan-review.md`。
7. 把 HTML 和 markdown 粘贴回 `dev-cockpit.html` 的 artifact 区域。
8. 看 HTML：它应该像一个小型设计评审页面，而不是一段普通 markdown。
9. 如果 HTML 没讲清楚现状、方案、例子或风险，就让大模型继续改 HTML 和 markdown。
10. review 通过后，复制已审 markdown 或执行 prompt 给 LLM 执行。

## 合格的 plan HTML 应该包含什么

一份有用的 `plan-review.html` 至少包含五块：

1. **当前系统**：现在的模块、流程、数据结构或文件职责是什么。
2. **目标需求**：这次到底要改变什么，不要只写抽象愿望。
3. **改动方案**：新增什么模块、改哪些文件、保留哪些边界。
4. **具体例子**：给一个最小输入、预期输出、错误例子或 UI 状态。
5. **验收方式**：怎么知道 plan 能执行，怎么知道执行后没有破坏约束。

HTML 的价值在于让这些内容更容易扫读和比较。可以用流程图、对比表、模块卡片、状态示例，但不要为了好看而脱离真实代码。

## 最小 demo：优化 ingest 模块

页面内置了一个最小 demo：“载入 ingest 优化示例”。它演示了一份合格 plan artifact 应该长什么样。

### 示例需求

```text
优化当前 ingest 模块：在生成 Raw 前后加入结构化校验和可审阅报告，
确保 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录都稳定；
保持 ingest 只动 Raw/ 和 log.md，不触碰 Wiki/。
```

### 对应的 HTML 必须讲清楚

- **现有 ingest 如何实现**：用户输入论文或笔记后，先读 `schema.md` / `log.md` / existing Raw，再查重、写 `Raw/<id>.md`、保存 PDF、追加 `log.md`，并且不修改 `Wiki/`。
- **当前问题是什么**：规则靠 LLM 记忆，缺 section、tag 越界、ID 重复、Related Wiki 缺失、log 格式错误都可能晚发现。
- **优化模块怎么设计**：用 `Preflight` 做写入前检查，用 `Template Guard` 检查 Raw 结构，用 `Tag Guard` 对齐 `schema.md` 受控标签，用 `Review Report` 生成审阅摘要。
- **具体实现例子是什么**：例如缺 `Tags` 应报错，出现 `#entropy-guided` 应提示映射到 `#entropy`，缺 `What would break this` 应给警告。
- **验收方式是什么**：构造最小 Raw 样例跑 lint，确认历史 Raw 只报告兼容问题，不自动 retrofit，并确认 ingest 仍只动 `Raw/` 和 `log.md`。

### 对应的 Markdown 可以这样组织

```markdown
# Plan Review：优化当前 ingest 模块

## 当前 ingest 流程
- 输入：用户给 arxiv / PDF / 笔记。
- 读规则：先读 schema.md、log.md、existing Raw。
- 查重：在 Raw/ 查 arxiv id / 同题论文。
- 写 Raw：按 5-section + 理解型元素生成 Raw/<id>.md。
- 记 log：在 log.md 顶部追加 ingest 记录，不改 Wiki。

## 优化模块
- Preflight：写 Raw 前检查 ID、重复论文、受控 tags 候选。
- Template Guard：检查 TL;DR / Method / Key Results / Takeaway / Open Questions 是否齐全。
- Tag Guard：从 schema.md 解析 approved tags，禁止自造 tag。
- Review Report：生成 ingest review 摘要，列出需要人工确认的数字、PDF、benchmark 和 tag。

## 具体实现例子
Raw/2605-demo.md
- 缺 Tags -> 报错：Missing required metadata: Tags
- 含 #entropy-guided -> 报错：Tag not approved; consider #entropy
- 缺 What would break this -> 警告：Method section lacks break-condition check
```

## Review 检查清单

在把 plan 交给执行模型前，至少问五个问题：

- HTML 是否明确展示了“现有系统如何工作”。
- HTML 是否展示了“优化后如何工作”，而不是只写愿景。
- 是否有具体输入、输出、错误或状态示例。
- Markdown 是否足够让另一个 LLM 独立执行。
- 是否遵守仓库边界，比如 ingest 不能改 `Wiki/`，Raw 不能随意 retrofit，tags 必须受控。

## 维护规则

改工作台结构或交互时，编辑 `scripts/build-dev-cockpit.mjs` 并重新生成 `dev-cockpit.html`。真正的 plan demo 应该由大模型根据当前需求和项目规则生成；本页面只提供输入组织、预览和导出执行包。
