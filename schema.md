# Schema

> 本文件定义 PaperNotes 知识库的覆盖范围、结构约定和维护规则。
> 所有 Wiki 整合决策以本文件为准。

## 研究方向

<!-- TODO: 待填写。示例：
- 主方向：LLM reasoning / RL alignment / multimodal ...
- 子主题：chain-of-thought, RLHF, verifier-free RL, ...
- 关注的问题：如何提升推理能力 / 如何对齐无 reward model ...
-->

## Wiki 组织规则

### 概念页粒度

- 一个"可讨论的学术概念"一页（如 `RLHF.md`、`Process-Reward-Model.md`）
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

## Contradictions
<论文间的冲突和当前未解问题>

## Related
- [[Concept-A]]
- [[Concept-B]]
```

### Raw 文件命名

`Raw/<YYYY-arxivID-shortname>.md`
示例：`Raw/2024-2310.01234-verifier-free-rl.md`

### Raw 文件结构

```markdown
# <Paper Title>

- **Authors**:
- **Venue / Year**:
- **Link**: arxiv / pdf
- **Tags**: #concept-a #concept-b

## TL;DR
三句话内

## Method
核心方法

## Key Results
实验结论

## Takeaway
对我研究的启示

## Open Questions
```

## 整合规则

1. 新增 Raw 后，Claude 须 grep 所有标签概念，更新相关 Wiki 页
2. 当新论文与既有 Wiki 结论冲突，**不直接覆盖**——在 `## Contradictions` 里追加，引用两篇 Raw
3. 新概念首次出现 ≥2 次（在不同 Raw 里）才建 Wiki 页，避免噪声
4. Wiki 页引用 Raw 时用 `[<paper-id>]` 格式，方便溯源
