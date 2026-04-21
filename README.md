# Paper Notes — LLM Wiki

基于 [Karpathy LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 的自维护论文知识库。主方向：**Agentic RL 中的 Credit Assignment**（详见 [schema.md](schema.md)）。

**一句话**：读一篇论文 → Claude 生成结构化 Raw → 你审阅后 compile 到 Wiki 概念页（跨论文整合、冲突保留、可追溯）。

> 为什么这样设计（痛点 / 两阶段 / 理解型元素 / 端到端例子），看 [docs/why.md](docs/why.md)。

## 两阶段工作流

```
arxiv 链接 ──▶ INGEST ──▶ Raw/<id>.md ──(审阅)──▶ COMPILE ──▶ Wiki/<Concept>.md
              抓论文+写笔记                         跨论文整合、
                                                     冲突入 Contradictions
```

**Ingest 只动 Raw，Compile 才动 Wiki**——审阅窗口在你手上。

## 怎么用

### 💬 方式 A：聊天（日常，免装 plugin）

直接把 arxiv 链接 / PDF 路径发给 Claude，自然语言描述意图：

```
"帮我 ingest 这篇：https://arxiv.org/abs/2510.XXXXX"
"读一下 XXXX，重点讲 entropy 部分"
"这篇 ingest 完和 IGPO 对比下：XXXX"
"把 ~/Downloads/paper.pdf 归档进 wiki"
```

Claude 识别意图 → 调 `paper-notes` skill → 完成后问你要不要 compile。**零学习成本**，支持复杂多步请求。

### 🖥️ 方式 B：终端 slash（批量 / 自动化，需装 plugin）

```
/paper-notes:ingest <arxiv-url | pdf-path>   # 抓论文 + 写 Raw + 下 PDF
/paper-notes:compile                          # Raw 整合进 Wiki 概念页
/paper-notes:query "<问题>"                   # 跨论文检索 + 合成答案
/paper-notes:lint                             # 健康检查（broken-refs / stale / schema 违规）
```

各命令内部步骤见 [plugin/skills/paper-notes/SKILL.md](plugin/skills/paper-notes/SKILL.md)。

**混用比例建议**：80% 聊天（日常）+ 20% slash（批量 / 严格场景）。二者底层共用同一套 SKILL.md，生成内容完全一致。

## Plugin 安装（方式 B 需要）

```bash
git clone https://github.com/newshawn/paper-notes ~/Documents/PaperNotes
cd ~/Documents/PaperNotes
```

在 Claude Code 里：

```
/plugin marketplace add newshawn/paper-notes
/plugin install paper-notes@paper-notes
```

重启 Claude Code → `/paper-notes:` 4 个命令可用。（手配 `~/.claude/settings.json` 见 [plugin/README.md](plugin/README.md)）

## 目录结构

```
Raw/              每篇论文的原始 takeaway（append-only）
Raw/pdfs/         对应 PDF 原文（文件名 = paper-id）
Wiki/             跨论文整合的概念页（AI 维护）
schema.md         领域词汇 + 整合规则（宪法）
index.md          所有 Wiki / Raw 索引
log.md            ingest / compile / lint 时间线（append-only, newest-first）
plugin/           Claude Code plugin 源（commands / skills / hooks）
docs/             架构 / why / fork 指南
```

## 格式约定

**Raw 笔记** `Raw/YYMM-shortname.md`：5 个 section，其中 3 个嵌入"理解型元素"

| Section | 常规内容 | 理解型元素 |
|---|---|---|
| TL;DR | 3 bullets 摘要 | 💡 一句话精华（全文压到 140 字） |
| Method | 核心思路 / 对比表 / 流程 | 🧬 Delta vs 前作 · 🧩 因果链 · ⚠️ What-breaks |
| Key Results | Benchmark + 训练配置 | — |
| Takeaway | 可操作启示 | 🧠 理解核验（3 个自测问题） |
| Open Questions | Limitation + 研究机会 | — |

**5 个理解型元素是核心**——它们强制你思考"vs 前作改了什么 / 机制链是什么 / 什么时候失效 / 你真懂没"。详细 rationale 见 [docs/why.md](docs/why.md)。

早期 10 篇（2505–2602）的简版 5-section 格式兼容保留。

**Wiki 概念页** `Wiki/Title-Case.md`：

```
[coverage: high|medium|low]   high ≥3 篇 / medium 2 篇 / low 1 篇或新兴
[last-updated: YYYY-MM-DD]

## Definition       一句话
## Key Claims       跨论文主张，[paper-id] 溯源
## Contradictions   论文间冲突（累积不覆盖）
## Related          [Concept-A](Concept-A.md) 相关链接
```

**核心原则**：
- Raw 只增不改；Wiki 冲突累积不覆盖
- ≥2 篇 Raw 触及同一概念才建 Wiki 页（避免噪声）
- 所有 tag 必须从 [schema.md](schema.md) 的受控词汇选
- 每次状态变更追加进 log.md

## 当前状态

- ✅ 10 篇 Raw（2505-gigpo → 2602-rlanything）
- ✅ 3 个 Wiki 概念页：[Credit-Assignment-in-Agentic-RL](Wiki/Credit-Assignment-in-Agentic-RL.md) / [Entropy-Guided-Exploration](Wiki/Entropy-Guided-Exploration.md) / [Turn-Level-Reward](Wiki/Turn-Level-Reward.md)
- ⏳ Raw/pdfs/ 为空（早期 10 篇从现成笔记转的）

## 延伸阅读

- [docs/why.md](docs/why.md) — 为什么这样设计（痛点 / 两阶段哲学 / 理解型元素 / 端到端例子）
- [docs/architecture.md](docs/architecture.md) — Plugin / Skill / CLAUDE.md 三层机制的分工
- [docs/fork-guide.md](docs/fork-guide.md) — 想用这套模式做自己的领域？4 步 fork 流程
- [plugin/README.md](plugin/README.md) — plugin 详细文档（CHANGELOG / Roadmap / Pipeline）
