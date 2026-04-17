# Index

Wiki 概念页和 Raw 论文笔记的总览。自动维护。

## Wiki 概念页

### 核心概念

| 页面 | Coverage | Last updated |
|---|---|---|
| [Credit-Assignment-in-Agentic-RL](Wiki/Credit-Assignment-in-Agentic-RL.md) | high | 2026-04-18 |
| [Entropy-Guided-Exploration](Wiki/Entropy-Guided-Exploration.md) | high | 2026-04-18 |
| [Turn-Level-Reward](Wiki/Turn-Level-Reward.md) | high | 2026-04-18 |

### 方法论（待建）

触发规则：≥2 篇 Raw 都涉及同一技术点。候选：
- `Tree-Based-Rollout`（覆盖：TreeGRPO, AT²PO, GiGPO, SALT）
- `Importance-Sampling-Granularity`（GRPO / GSPO / AT²PO）
- `Generative-Reward-Model`（RLAnything，目前仅 1 篇）
- `Advantage-Collapse`（IGPO 明确讨论；GRPO 是病源）

## Raw 论文笔记（按时间倒序）

| Paper ID | Title | Tags | Ingested |
|---|---|---|---|
| [2602-rlanything](Raw/2602-rlanything.md) | RLAnything | #credit-assignment #reward-model | 2026-04-17 |
| [2601-matchtir](Raw/2601-matchtir.md) | MatchTIR | #credit-assignment #bipartite-matching | 2026-04-18 |
| [2601-at2po](Raw/2601-at2po.md) | AT²PO | #turn-level-is #tree-rollout | 2026-04-18 |
| [2510-salt](Raw/2510-salt.md) | SALT | #credit-assignment | 2026-04-18 |
| [2510-aepo](Raw/2510-aepo.md) | AEPO | #entropy #branching-penalty | 2026-04-18 |
| [2510-igpo](Raw/2510-igpo.md) | IGPO | #information-gain #turn-level-reward | 2026-04-17 |
| [2509-empg](Raw/2509-empg.md) | EMPG | #entropy #gradient-modulation | 2026-04-18 |
| [2509-treegrpo](Raw/2509-treegrpo.md) | TreeGRPO | #tree-rollout | 2026-04-18 |
| [2507-arpo](Raw/2507-arpo.md) | ARPO | #entropy #branching | 2026-04-18 |
| [2505-gigpo](Raw/2505-gigpo.md) | GiGPO | #step-wise-reward #same-state-grouping | 2026-04-18 |

## 主题地图（可深入方向）

- **Entropy as signal**：ARPO → AEPO → AT²PO → EMPG（熵作为探索触发器 / 梯度调节器）
- **Tree rollout**：TreeGRPO → AT²PO（树状采样 + turn-wise credit）
- **Dense reward without human labels**：IGPO（IG）、MatchTIR（bipartite match）、RLAnything（RM as judge）
- **Granularity of IS/clip**：token (GRPO) → sequence (GSPO) → turn (AT²PO)
