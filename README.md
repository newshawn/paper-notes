# Paper Notes — LLM Research Wiki

这是一个面向 **Agentic RL 中 Credit Assignment** 的 AI-maintained 论文知识库。

核心想法很简单：你把论文链接、PDF 或自己的论文笔记丢进来，AI 先生成单篇论文的 `Raw/` 笔记；你确认后，再显式触发 `compile`，把它整合进跨论文的 `Wiki/` 概念页。需要写作、查方法演进或找 open questions 时，再调用 Wiki。

## Human Review

- 在线审阅入口：[PaperNotes Review Cockpit](https://newshawn.github.io/paper-notes/review.html)
- 在线开发可视化入口：[Plan Artifact Renderer](https://newshawn.github.io/paper-notes/dev/)
- 仓库内 HTML 文件：[review.html](review.html)、[dev/index.html](dev/index.html)
- 开发协作文件夹：[dev/](dev/)
- 生成说明：[docs/html-review-workflow.md](docs/html-review-workflow.md)、[dev/README.md](dev/README.md)、[dev/plan-artifact-pipeline.md](dev/plan-artifact-pipeline.md)、[dev/project-map.md](dev/project-map.md)
- `review.html` 用来看仓库 / Wiki 状态；`dev/` 专门放开发用的 renderer、plan 规则和项目地图。`dev/index.html` 只负责渲染 `plan-review.html` 和 `plan-review.md`。

## How It Works

### 1. Ingest: 输入论文

你可以直接用自然语言说：

```text
帮我 ingest 这篇论文：https://arxiv.org/abs/xxxx.xxxxx
把这个 PDF 归档进 wiki：/path/to/paper.pdf
根据下面这段论文笔记生成 Raw：...
```

AI 做的事：

- 读取 [`schema.md`](schema.md)，确认研究范围、Raw 格式和受控标签。
- 检查是否已经 ingest 过，避免重复。
- 生成 `Raw/<YYMM-shortname>.md`。
- 如果有 PDF，保存到 `Raw/pdfs/<paper-id>.pdf`。
- 在 [`log.md`](log.md) 顶部追加一条 `ingest` 记录。
- **不修改 `Wiki/`**，给你保留审阅窗口。

### 2. Review: 你审阅 Raw

Raw 是单篇论文的结构化理解，不是最终知识库结论。你可以快速扫一眼：

- TL;DR 是否抓住核心贡献。
- `Delta from` 是否说清和前作的差别。
- Benchmark 和数字是否具体。
- Takeaway 是否对你的研究有用。

### 3. Compile: 整合进 Wiki

当你确认 Raw 可以进入知识库时，说：

```text
compile 最近还没整合的 Raw
把 2604-ig-search compile 进 Wiki
```

AI 做的事：

- 从 `log.md` 找出未 compile 的 Raw。
- 按 tag 和概念定位相关 Wiki 页。
- 对已有概念页追加新 claim 或 open question。
- 如果新论文和旧 claim 冲突，把冲突写入 `## Contradictions / Open Questions`，不覆盖旧 claim。
- 必要时更新 [`index.md`](index.md)。
- 在 `log.md` 顶部追加一条 `compile` 记录。

### 4. Query: 调用 Wiki

需要使用知识库时，直接问：

```text
查一下 Wiki：entropy-based branching 的方法演进
基于 Wiki 帮我写 credit assignment 的 related work 草稿
哪些论文支持 turn-level reward 比 token-level 更稳？
现在有哪些 open questions 可以发展成课题？
```

AI 会优先读 `Wiki/` 的概念页，再回到相关 `Raw/` 查证具体论文和数字。

## Directory

```text
Raw/           单篇论文笔记，append-only
Raw/pdfs/      论文 PDF，文件名必须等于 paper-id
Wiki/          跨论文概念页
attachments/   图片、图表
docs/          模板和辅助文档
index.md       Wiki 目录和 Raw 时间线
log.md         ingest / compile / lint / refactor 时间线
schema.md      研究方向、受控标签和整合规则
AGENTS.md      AI 工作红线和操作说明
CLAUDE.md      兼容 Claude Code 的同款工作说明
```

## Raw Format

新 Raw 使用 5-section + 5 个理解型元素：

| Section | 内容 |
|---|---|
| `TL;DR` | 3 条核心总结 + 一句话精华 |
| `Method` | 核心思路、对比表、Delta from 前作、流程示例、因果链、What-breaks |
| `Key Results` | 训练配置、Benchmark 三问、核心结果和意外发现 |
| `Takeaway` | 对当前研究的可操作启示 + 3 个理解核验问题 |
| `Open Questions` | limitation 和值得深入的方向 |

早期 Raw 保持原状，不为了格式统一而 retrofit。

## Wiki Format

```markdown
# <Concept>

[coverage: high|medium|low]
[last-updated: YYYY-MM-DD]

## Definition

## Key Claims

## Contradictions / Open Questions

## Related
```

所有引用都用 GitHub 可点击的 markdown 链接：

- Wiki → Raw：`[2510-igpo](../Raw/2510-igpo.md)`
- Wiki → Wiki：`[Turn-Level-Reward](Turn-Level-Reward.md)`
- Raw → Wiki：`[Turn-Level-Reward](../Wiki/Turn-Level-Reward.md)`

## Principles

- `schema.md` 是规则源头：研究范围、受控 tag、概念页创建阈值都以它为准。
- `ingest` 只动 `Raw/` 和 `log.md`。
- `compile` 只在用户明确要求时更新 `Wiki/`。
- Raw 只增不改；已有早期 Raw 不做格式追溯改造。
- Wiki 是活的，但旧 claim 不覆盖；冲突进入 `Contradictions / Open Questions`。
- 每次状态变更都记录到 `log.md` 顶部。

## Current State

- Raw: 14 篇论文笔记。
- Wiki: 4 个概念页。
- Focus: Agentic RL credit assignment, especially step/turn-level reward design for LLM agents.
