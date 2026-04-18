# Paper Notes — LLM Wiki

基于 [Karpathy LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 的自维护论文知识库。主方向：**Agentic RL 中的 Credit Assignment**（详见 [schema.md](schema.md)）。

## 快速使用

配合 [`paper-notes` Claude Code plugin](../../.claude/plugins/paper-notes/plugin/README.md) 使用：

```
cd ~/Documents/PaperNotes

# 在 Claude Code 里：
/paper-notes:ingest https://arxiv.org/abs/2510.XXXXX    # 吸入一篇新论文
/paper-notes:compile                                    # 整合到 Wiki
/paper-notes:query "entropy 触发 branching 的方法有哪些"  # 检索提问
/paper-notes:lint                                       # 健康检查
```

Plugin 未安装也能用——直接让 Claude 按 schema.md 的规则写 Raw / 更新 Wiki 即可。

## 目录结构

```
Raw/           每篇论文的原始 takeaway（append-only，10 篇已有 + 新 ingest）
Raw/pdfs/      对应 PDF 原文
Wiki/          跨论文整合的概念页（AI 维护，会被改写）
attachments/   图片、图表
schema.md      知识库宪法：研究方向 + 组织规则
index.md       目录：所有 Wiki 概念页 + Raw 时间线
log.md         时间线：每次 ingest / compile / lint 的记录（append-only）
```

## Raw 笔记格式

5-section + 5 个"理解型元素"（从 2026-04-18 起）：

| Section | 内部结构 |
|---|---|
| TL;DR | 3 bullets + 💡 一句话精华（140 字内） |
| Method | 核心思路 / 对比表 / 🧬 Delta from 前作 / 流程示例 / 🧩 因果链 / ⚠️ What-breaks |
| Key Results | 训练配置 / Benchmark 三问 / 核心结果 |
| Takeaway | 可操作启示 / 🧠 理解核验（3 问） |
| Open Questions | Limitation + 研究机会 |

**为什么这样设计**：credit assignment 论文多数是小改动堆积（ARPO → AEPO → AT²PO → SALT）。核心理解在于"vs 前作改了什么"（🧬 Delta）、"为什么有效到机制层"（🧩 因果链）、"什么场景会失效"（⚠️ What-breaks）。Section 数量和早期 10 篇保持一致，只是内部结构更利于理解。

早期 10 篇（2505 - 2602）的简版 5-section 格式兼容保留。

## Wiki 概念页格式

```
# <Concept>
[coverage: high|medium|low]
[last-updated: YYYY-MM-DD]

## Definition             一句话
## Key Claims             跨论文整合的主张，[paper-id] 溯源
## Contradictions         论文间冲突 & 未解问题（不覆盖，累积）
## Related               [[Concept-A]] 双链
```

Coverage 标签：high (≥3 篇) / medium (2 篇) / low (1 篇或新兴)。

## 两阶段工作流

1. **Ingest** — 吸入新论文 → 写 Raw + 下 PDF + log 记录。**Wiki 不动**
2. **Review** — 你审阅 Raw，小改
3. **Compile** — 手动触发整合 → Wiki 受影响概念页更新 + index.md 更新

设计意图：给你审阅窗口。Ingest 生成的内容不等于你真正采纳。

## 原则

- **Raw 只增不改**：论文的原始理解是历史记录
- **Wiki 是活的**：可以被新证据改写，但矛盾累积不覆盖
- **schema.md 是宪法**：所有整合决策以它为准
- **每次状态变更** 进 log.md
- **≥2 篇 Raw** 触及同一概念才建 Wiki 页（避免噪声）

## 当前状态

- ✅ 10 篇 Raw（2505-gigpo → 2602-rlanything）
- ✅ 3 个 Wiki 概念页：[Credit-Assignment-in-Agentic-RL](Wiki/Credit-Assignment-in-Agentic-RL.md) / [Entropy-Guided-Exploration](Wiki/Entropy-Guided-Exploration.md) / [Turn-Level-Reward](Wiki/Turn-Level-Reward.md)
- ⏳ Raw/pdfs/ 为空（早期 10 篇是从现成笔记转的，没下 PDF）
- ⏳ 部分候选 Wiki 概念待更多 Raw 涉及后建立（详见 [index.md](index.md)）
