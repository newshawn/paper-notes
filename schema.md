# Schema

> 本文件定义 PaperNotes 知识库的覆盖范围、结构约定和维护规则。
> 所有 Wiki 整合决策以本文件为准。

## 研究方向

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

## Wiki 组织规则

### 概念页粒度

- 一个"可讨论的学术概念"一页（如 `Credit-Assignment-in-Agentic-RL.md`、`Entropy-Guided-Exploration.md`）
- 不要为单篇论文建概念页（论文笔记属于 Raw/）
- 页名用 Title-Case，空格用连字符

### 概念页结构

```markdown
# <Concept>

## Definition
<一句话定义>

## Key Claims
- [<paper-id>] 主要主张
- [<paper-id>] 另一主张

## Contradictions / Open Questions
<论文间冲突和未解问题>

## Related
- [[Concept-A]]
- [[Concept-B]]
```

### Raw 文件命名

`Raw/<YYMM-shortname>.md`
- YY: 论文年份后两位
- MM: 月份
- shortname: 方法名或短标题

示例：`Raw/2602-rlanything.md`、`Raw/2510-igpo.md`、`Raw/2601-at2po.md`

### Raw 文件结构

```markdown
# <Paper Title>

- **ID**: <YYMM-shortname>
- **Authors**:
- **Venue / Year**:
- **Link**: arxiv / code
- **Tags**: #credit-assignment #entropy #...

## TL;DR
三句话内

## Method
核心方法 + 公式

## Key Results
关键实验结论

## Takeaway
对我研究的启示

## Open Questions
```

## 整合规则

1. 新增 Raw 后，Claude 须 grep 所有标签概念，更新相关 Wiki 页
2. 当新论文与既有 Wiki 结论冲突，**不直接覆盖**——在 `## Contradictions / Open Questions` 里追加，引用两篇 Raw
3. 新概念首次出现 ≥2 次（在不同 Raw 里）才建 Wiki 页，避免噪声
4. Wiki 页引用 Raw 时用 `[<paper-id>]` 格式，方便溯源
5. 相同方法的改进论文，在前作 Raw 笔记末尾 append `## Superseded by: [<new-paper-id>]`
