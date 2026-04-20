# Schema

> 本文件定义 PaperNotes 知识库的覆盖范围、结构约定和维护规则。
> 所有 Wiki 整合决策以本文件为准。

## 研究方向 `[🔴 你的领域定制]`

### 主方向：Agentic RL 中的 Credit Assignment

训练 LLM Agent 时，如何把 trajectory-level 的稀疏奖励拆成 turn/step-level 的密集监督信号。

**核心信念**：传统 PRM 在 CoT 上难做（自然语言推理边界模糊、需人工标注、主观性强）；但 Agent 每一步是**可执行的 action**（工具调用、代码、请求），有明确语义边界和环境反馈——让"给每步打分"变 tractable。

### 关注的子问题

1. **Reward Model 路线**：用生成式 LLM 作为 step-wise reward model，与 policy 联合优化（典型：RLAnything）
2. **无 Reward Model 路线**：
   - 用环境 return 回传做 step advantage（GiGPO、TreeGRPO、AT2PO）
   - 用 entropy 作为探索/置信度信号（ARPO、AEPO、EMPG）
   - 用 information gain 作为 turn-level reward（IGPO）
   - 用 bipartite matching 对齐 predicted vs golden trace（MatchTIR）
3. **探索策略**：entropy-guided tree expansion、branching penalty、adaptive sampling budget
4. **优化粒度**：token-level vs turn-level vs sequence-level importance sampling / clipping

### 关键问题清单

- 无 ground truth / golden trace 时，step reward 从哪来？（self-consistency？model-as-judge？）
- Entropy 作为信号的边界：什么时候 entropy 高代表"需要探索"，什么时候代表"噪声"？
- Turn-level IS ratio 如何设计才能同时避免 token-level 高方差和 sequence-level 粒度过粗？
- 长轨迹下 γ 衰减策略（IGPO 默认 γ=1 是否需要改）
- 从 QA / search 场景迁移到 coding、GUI 操作的可迁移性

## 目录结构 `[🟢 通用 · 照搬]`

```
Raw/           原始论文 takeaway 笔记（append-only，永不修改）
Wiki/          AI 维护的概念页（会被新论文改写）
attachments/   图片、图表
index.md       wiki 目录（按类别组织的 catalog）
log.md         append-only 时间线（每次 ingest / compile 记录）
schema.md      本文件
README.md
```

## 两阶段 Ingest 工作流 `[🟢 通用 · 照搬]`

**Stage 1: Ingest（自动）**
- 用户给论文（arxiv / PDF / 用户笔记）
- Claude 生成 `Raw/<YYMM-shortname>.md`
- Claude 在 `log.md` append 一条 ingest 记录
- **Wiki 不立即更新**——给用户审阅 Raw 的窗口

**Stage 2: Compile（用户触发）**
- 用户说 "compile" 或 "更新 Wiki"
- Claude 读 `log.md` 找出 uncompiled Raw
- 扫描相关 Wiki 概念页，整合新论文
- 更新 `index.md` 和 `log.md`

设计意图：让你有机会在 Wiki 被改前先看 Raw、决定重点。

## Wiki 组织规则 `[🟢 通用 · 照搬]`

### 概念页粒度

- 一个"可讨论的学术概念"一页（如 `Credit-Assignment-in-Agentic-RL.md`、`Entropy-Guided-Exploration.md`）
- 不要为单篇论文建概念页（论文笔记属于 Raw/）
- 页名用 Title-Case，空格用连字符

### 概念页结构

```markdown
# <Concept>

[coverage: high|medium|low]
[last-updated: YYYY-MM-DD]

## Definition
<一句话定义>

## Key Claims
- [<paper-id>](../Raw/<paper-id>.md) 主要主张
- [<paper-id>](../Raw/<paper-id>.md) 另一主张

## Contradictions / Open Questions
<论文间冲突和未解问题>

## Related
- [Concept-A](Concept-A.md)
- [Concept-B](Concept-B.md)
```

> **链接格式**（2026-04-20 起）：**Wiki → Raw** 用 `[<paper-id>](../Raw/<paper-id>.md)`；**Wiki → Wiki** 用 `[Concept](Concept.md)`；**Raw → Wiki** 用 `[Concept](../Wiki/Concept.md)`。弃用之前的 `[paper-id]` 纯方括号和 `[[Concept]]` wiki-link 格式——它们在 GitHub 上不渲染。

**Coverage 标签含义**：
- `high`：≥3 篇论文覆盖，主流方法明确，结论稳定
- `medium`：2 篇论文，有初步共识，存在分歧
- `low`：1 篇论文或尚在探索期，结论暂时性

### Raw 文件命名

`Raw/<YYMM-shortname>.md`
- YY: 论文年份后两位
- MM: 月份
- shortname: 方法名或短标题

示例：`Raw/2602-rlanything.md`、`Raw/2510-igpo.md`、`Raw/2601-at2po.md`

### Raw 文件结构

> **注**：2026-04-18 起新 ingest 用此**5-section + 理解型元素**格式。早期 10 篇（2505 - 2602）结构兼容，后续可按需补充 Delta / 因果链等元素。

```markdown
# <Paper Title>

- **ID**: <YYMM-shortname>
- **Authors**:
- **Venue / Year**:
- **Link**: arxiv / code
- **Tags**: #credit-assignment #entropy #...

## TL;DR
三条 bullet（结论 / 方法 / 为什么有效）+ 💡 一句话精华（140 字内）

## Method
核心思路 + 关键设计 + 对比表 +
🧬 Delta from [前作]（核心改动一两句话）+
流程示例（必须举例）+
🧩 因果链（问题 → 根因 → 解法 → 效应）+
⚠️ What would break this

## Key Results
训练配置 + Benchmark 详解（三问：任务来源 / 执行环境 / 分数计算）+ 核心结果（含意外发现）

## Takeaway
对我研究的启示（可操作）+
🧠 理解核验（3 个自检问题）

## Open Questions
Limitation + 值得深入的方向

## Superseded by
如有后续论文改进本工作 [<new-paper-id>]

## Related Wiki
- [Concept-A](../Wiki/Concept-A.md)
```

**5 个理解型元素的设计意图**：
- 🧬 **Delta from 前作**：agentic RL credit assignment 领域全是小改动堆积，看清"vs 前作改了什么"才抓到演进链
- 🧩 **因果链**：把"为什么有效"拆到机制层，而不是泛泛而谈
- ⚠️ **What would break this**：边界条件，防止误用
- 💡 **一句话精华**：能压缩就说明真懂
- 🧠 **理解核验**：3 个自检问题——未来验证理解深度的锚

## 受控标签（Approved Tags） `[🔴 你的领域定制]`

> **核心约束**：Raw 笔记的 `Tags:` 字段 **只能**使用下列词汇。遇到论文引入的新概念，需先在本 section 登记新 tag（含一行定义），再写入 Raw。
>
> **目的**：防止 tag 漂移（`#entropy` / `#entropy-based` / `#entropy-guided` 三选一混用 → compile 时分裂成三个 Wiki 概念 → 知识库退化）。

### 研究方向
- `#credit-assignment` — trajectory reward → step/turn-level advantage 拆解
- `#agentic-rl` — LLM Agent 的强化学习训练

### 信号机制（step reward 从哪来）
- `#reward-model` — 外部 reward model（含 generative RM）
- `#no-reward-model` — 完全不依赖 RM
- `#information-gain` — IG 作 turn reward（IGPO 类）
- `#bipartite-matching` — predicted ↔ golden trace 匹配（MatchTIR 类）
- `#entropy` — token / step entropy 作信号（ARPO/AEPO/EMPG/AT²PO）

### Advantage 粒度
- `#token-level-reward` — token 粒度的 advantage / 梯度调节（比 step 更细，如 EAPO 按 entropy 调每个 token 的 |Ã|）
- `#step-wise-reward` — 每步单独打分
- `#turn-level-reward` — 每 turn 一个奖励
- `#turn-level-is` — turn-level importance sampling

### 采样结构
- `#tree-rollout` — 显式树状采样（TreeGRPO/AT²PO）
- `#branching` — 动态分支采样（ARPO）
- `#branching-penalty` — 分支惩罚避免过度集中（AEPO）
- `#same-state-grouping` — 相同状态聚类（GiGPO）
- `#trajectory-graph` — 轨迹 DAG（SALT）

### 梯度 / 优化
- `#gradient-modulation` — entropy 调节梯度幅度（EMPG）
- `#future-clarity` — 下一步 entropy 低给 bonus（EMPG）

### 场景 / 应用
- `#tool-use` — 工具调用
- `#tool-integrated-reasoning` — TIR 框架
- `#gui-agent` — 图形界面 agent
- `#coding-agent` — 代码 agent
- `#multi-turn-agent` — 多轮交互
- `#long-horizon-agent` — 长程任务

### 数据 / 假设
- `#ground-truth-trace` — 依赖金标准轨迹
- `#self-adaptive-env` — 环境自适应调整
- `#plug-and-play` — 即插即用（不改 rollout）

### 新增 tag 的流程

1. Ingest 时 Claude 发现现有 tags 覆盖不了论文核心概念
2. Claude 提示："建议新增 `#<name>` — 含义：<一行定义>。确认？(yes/no)"
3. 用户 yes → Claude 编辑本 section 添加一行（含定义），**再**写入 Raw 的 Tags 字段
4. 用户 no → 复用最接近的现有 tag

**原则**：宁可复用近义 tag，不要随手新增。每个新 tag 都是对词汇表的承诺。

## 整合规则 `[🟢 通用 · 照搬]`

1. 新 Raw 默认**不**自动更新 Wiki（遵循两阶段规则）
2. `compile` 时，grep 所有标签概念，更新相关 Wiki 页
3. 当新论文与既有 Wiki 结论冲突，**不直接覆盖**——在 `## Contradictions / Open Questions` 里追加，引用两篇 Raw
4. 新概念首次出现 ≥2 次（在不同 Raw 里）才建 Wiki 页，避免噪声
5. Wiki 页引用 Raw 时用 `[<paper-id>](../Raw/<paper-id>.md)` markdown 链接格式（2026-04-20 起）；Wiki 之间用 `[Concept](Concept.md)`；Raw → Wiki 用 `[Concept](../Wiki/Concept.md)`——GitHub 上可点，Obsidian 也支持。**不要**用纯方括号 `[paper-id]` 或 `[[Concept]]` wiki-link 格式
6. 相同方法的改进论文，在前作 Raw 笔记末尾 append `## Superseded by: [<new-paper-id>]`
7. 每次 compile 后更新 `index.md` 的 coverage 标签和 last-updated
8. 每次 ingest / compile 在 `log.md` 追加一行，格式见 log.md 头部说明
