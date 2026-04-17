# TreeGRPO: Tree Search for LLM Agent Reinforcement Learning

- **ID**: 2509-treegrpo
- **Venue**: ICLR 2026
- **Link**: [alphaxiv](https://www.alphaxiv.org/abs/2509.21240) · [code](https://github.com/AMAP-ML/Tree-GRPO) (306⭐)
- **Tags**: #tree-rollout #credit-assignment #no-reward-model

## TL;DR

把 rollout 显式建成树：每个 prompt 一棵树，根节点是 prompt，先采 M 条完整轨迹，再**随机**挑 N 个非叶节点展开，重复 L 次。Advantage 做 **inter-tree + intra-tree 双层聚合**——前缀 token 的 advantage 被多个后续回答累加。**注意：已被 AEPO 和 AT²PO 打败**。

## Method

### 树构建

1. 每个 prompt 作为根 root
2. M 条初始完整 trajectory，构成 M 个直接子树
3. 从 M 个子树中**随机**挑 N 个非叶节点继续采样
4. 重复 L 次

### 两类 advantage

1. **Inter-tree advantage**（Q-A 内部 GRPO）
   - H1-H4 分别是 4 条链路
   - 共享前缀的 token 会在多条链路中分别被更新 → 相当于 advantage **累加**
   - 示例：若 Turn1 在 H1 和 H3 都出现，mean=0.5, std=0.5，H1 和 H3 advantage 都是 1 → Turn1 的 advantage = 2

2. **Intra-tree advantage**（树内）
   - H1 vs H3（H3 从 H1 分叉）、H2 vs H4
   - 衡量"同前缀下不同分支的差异"

### 示例

```
Q_A
├── H₁: Turn1→Turn2→Answer("Boston")     R=1 ✅
├── H₂: Turn1→Turn2→Answer("New York")   R=0 ❌
├── H₃: [fork自H₁的Turn1]→Turn2'→Answer("Boston")  R=1 ✅
└── H₄: [fork自H₂的Turn1]→Turn2'→Answer("London")  R=0 ❌
```

## Key Results

- 消融：只用 intra 会性能崩溃（信号太稀疏）
- 29 引用、306 stars

## Takeaway

1. **树结构让 credit assignment 可视化**：分叉前后的影响清楚分离
2. **"随机挑节点"是主要弱点**——后继方法（AEPO、AT²PO）都改成了 entropy-guided
3. **Inter + intra 的设计思路值得借鉴**：前缀共享、分叉独立

## Open Questions

- 随机节点挑选浪费采样预算——AT²PO 正面回应了这个
- 没用 entropy 判断哪些节点值得展开
- Scaling（更深树）的性能表现？

## Superseded by
- [2601-at2po] Entropy-guided tree expansion + turn-level IS + branching penalty
- [2510-aepo] Adaptive sampling budget + gradient preservation

## Related Wiki
- [[Tree-Based-Rollout]]
- [[Credit-Assignment-in-Agentic-RL]]
