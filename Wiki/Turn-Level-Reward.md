# Turn-Level Reward

[coverage: high]
[last-updated: 2026-04-18]

## Definition

在 multi-turn agent RL 中，对**每一 turn**（一次 think + action + observation 的完整单元）计算独立的奖励/优势信号，而非只在 trajectory 末端给一个 outcome reward。目标：让模型学到"这一 turn 这样做比那样做更好"，而非"整条轨迹整体好/坏"。

## 为什么需要

Trajectory-level reward 的三个病：

1. **Advantage collapse** [2510-igpo]：所有 rollout 得同分 → 梯度为零
2. **Credit entanglement** [2510-salt]：有益和有害 action 在同一 return 下纠缠
3. **误伤有效 action** [2507-arpo]：Tool call 2 失败拖累 tool call 1 的合理 query

## 主流设计

### 1. Information Gain [2510-igpo]

$$r_{i,t} = \pi_\theta(a \mid q, o_{i,\leq t}) - \pi_\theta(a \mid q, o_{i,\leq t-1})$$

- 用 policy 自己生成 GT 答案的概率**增量**作 reward
- **Always non-zero**，消除 advantage collapse
- 无需外部 RM、无需 MC 采样

### 2. Step-level Grouping [2505-gigpo]

- 不同 trajectory 在相同状态 $\tilde{s}$ 下收集 (action, return) 对
- 在同状态 group 内对 return 做标准化 → step advantage
- 依赖**状态可识别**（文字环境、网页、文件系统）

### 3. Tree Value Propagation [2601-at2po] [2509-treegrpo]

- 构造显式树，leaf 的 outcome reward 沿树回传
- AT²PO 的聚合：

$$V_n = \sum_c w_c V_c, \quad w_c = \frac{H(c)}{\sum H(c')}$$

- 按熵加权而非均值，保留探索信号

### 4. Trajectory Graph [2510-salt]

- 比 tree 更一般：不同轨迹的中间状态可**合并**成 DAG
- 在 graph 上量化 step quality
- Plug-and-play，不改 rollout

### 5. Bipartite Matching [2601-matchtir]

- Predicted turn ↔ golden trace step 做最优匹配
- KM（硬匹配）或 OT（软匹配）派生 turn reward
- **依赖 ground-truth trace**

## Key Claims

- [2510-igpo] **3B 小模型** 用 turn-level dense reward 提升 +15.3（vs 7B 的 +6.8）——小模型更依赖 turn-level 信号
- [2601-at2po] Turn-level IS 是 token-level (GRPO) 和 sequence-level (GSPO) 之间的正确粒度
- [2602-rlanything] 当 RM 足够好时，**只用 step reward（不用 outcome）效果更好**——turn-level 信号足以定义任务

## Contradictions / Open Questions

### 1. "自评"的合法性

- [2510-igpo] 用 policy 自己算 $P(a \mid \text{context})$ 作 reward
- 担忧：policy 跑偏时 IG 信号自欺欺人
- 反论：[2602-rlanything] 的 RM 与 policy 联合优化证明"自监督闭环"可行
- 开放问题：边界在哪？什么时候会坍缩到退化解？

### 2. Turn 粒度是否永远合理

- [2601-at2po] 证明 turn > token + turn > sequence
- 但 turn 自身定义依赖任务：QA 的 turn = "一次搜索+观察"，coding 的 turn = ?
- 开放问题：有没有比 turn 更合理的粒度？如"语义子段"？

### 3. 没有 ground truth / golden trace 时的替代

- 当前方法多数依赖：
  - GT 答案可验证（IGPO 用 F1，需要 GT）
  - Golden trace 标注（MatchTIR）
- 开放问题：
  - **IG 用 self-consistency 代理**（IGPO 建议）——多次采样的一致性概率
  - **Best-of-N 作为 golden trace**（MatchTIR 建议）——self-play credit
  - 两者组合值得研究

### 4. Long-horizon 的 γ

- [2510-igpo] 默认 γ=1
- [2505-gigpo] 使用 γ<1
- 长轨迹（60 步）下 γ=1 让早期 step 信号被过度放大
- 开放问题：γ 的任务自适应策略

## 可深入的方向

1. **非 QA 场景的 IG 迁移**：
   - Coding：用 "能 pass test case 的概率增量"
   - Tool-use：用 "工具返回有效结果的概率增量"
   - GUI：用 "下一步 entropy 降低量" 作代理

2. **混合信号**：IG（稳定 + always non-zero） + tree propagation（捕获长程依赖） + entropy weighting（强化高不确定处）的组合——三者目前各自独立，未见整合

3. **Turn 的自动切分**：当前依赖 tool-call 或 think/action 标签切分，能否用 model-internal signal（如 attention pattern）无监督切分？

4. **Self-supervised golden trace**：best-of-N rollout 的最优 trajectory → 作为 MatchTIR 风格匹配目标 → 闭环 credit assignment，不依赖人工标注

## Related

- [[Credit-Assignment-in-Agentic-RL]]
- [[Entropy-Guided-Exploration]]
- [[Tree-Based-Rollout]]（待建）
- [[Advantage-Collapse]]（待建）
