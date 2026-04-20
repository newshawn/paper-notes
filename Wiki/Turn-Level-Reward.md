# Turn-Level Reward

[coverage: high]
[last-updated: 2026-04-20]

## Definition

在 multi-turn agent RL 中，对**每一 turn**（一次 think + action + observation 的完整单元）计算独立的奖励/优势信号，而非只在 trajectory 末端给一个 outcome reward。目标：让模型学到"这一 turn 这样做比那样做更好"，而非"整条轨迹整体好/坏"。

## 为什么需要

Trajectory-level reward 的三个病：

1. **Advantage collapse** [2510-igpo]：所有 rollout 得同分 → 梯度为零
2. **Credit entanglement** [2510-salt]：有益和有害 action 在同一 return 下纠缠
3. **误伤有效 action** [2507-arpo]：Tool call 2 失败拖累 tool call 1 的合理 query

## 主流设计

### 1. Information Gain（两种变种）

**1a. Turn-to-turn temporal-difference** [2510-igpo]

$$r_{i,t} = \pi_\theta(a \mid q, o_{i,\leq t}) - \pi_\theta(a \mid q, o_{i,\leq t-1})$$

- 用 policy 自己生成 GT 答案的概率**增量**作 reward
- Always non-zero，消除 advantage collapse
- 无需外部 RM、无需 MC 采样
- ⚠️ 混合 reasoning + querying + retrieval 三种贡献

**1b. Counterfactual baseline** [2604-ig-search]

$$IG_t = \log \pi(a^* \mid \mathcal{C}_t^{\text{real}}) - \frac{1}{N}\sum_j \log \pi(a^* \mid \mathcal{C}_t^{\text{rand},j})$$

- 随机文档来自同 batch 其他题（保长度、剥离相关性）
- 只 modulate query tokens（不动 reasoning / answer）
- 除以 `|Q_t|` 防刷长 query 骗高 IG
- ✨ **隔离纯粹的检索贡献**——明确批评 IGPO "conflates"

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
- [2604-ig-search] **Counterfactual IG** 区分"检索贡献" vs IGPO 的"turn-level 综合提升"——两种 IG 正交可合并
- [2604-ig-search] **Per-token selective modulation** 是防 reward hacking 的巧思——只调 query tokens 避免污染 reasoning
- [2603-mr-search] **Turn-level RLOO advantage** 是 critic-free 的工程实用选择——G-1 leave-one-out 归一化 + γ=1 discount；γ=0 ablation 掉 2.2 点实证 turn-level credit 必要
- [2603-mr-search] 小模型获益显著大（3B +19.3% vs 7B +9.2%）——再次印证 **小模型 scaffolding 假说**（详见 [[Credit-Assignment-in-Agentic-RL]] Contradictions #8）

## Contradictions / Open Questions

### 1. "自评"的合法性

- [2510-igpo] 用 policy 自己算 $P(a \mid \text{context})$ 作 reward
- 担忧：policy 跑偏时 IG 信号自欺欺人
- 反论：[2602-rlanything] 的 RM 与 policy 联合优化证明"自监督闭环"可行
- 开放问题：边界在哪？什么时候会坍缩到退化解？

### 2. Turn 粒度是否永远合理

- [2601-at2po] 证明 turn > token + turn > sequence（在 QA 场景）
- 但 turn 自身定义依赖任务：QA 的 turn = "一次搜索+观察"，coding 的 turn = ?
- [2601-at2po retrofit 观察] **在非 QA 任务上"turn" 的自然边界模糊**——GUI / embodied / long-form 写作没有天然 turn 划分，需要人工定义，削弱了方法的通用性
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

### 5. IG 在长答案下的数值稳定性（retrofit 新增）

- [2510-igpo] 的 IG reward 依赖 $\pi_\theta(a \mid \text{context})$ —— GT 答案长度越长，概率越小（token 级乘积），IG 差分可能被浮点噪声淹没
- QA 场景答案多为 short span，暂未暴露；但开放生成 / 长回答场景风险明显
- **开放问题**：对长答案是否应使用 log-prob 差而非 prob 差？或按长度归一化？

### 6. Temporal-difference IG vs Counterfactual IG（2026-04 新增）

[2510-igpo] 的 IG 是 `P(a|turn_t) - P(a|turn_{t-1})`（时间差）；[2604-ig-search] 的 IG 是 `P(a|real docs) - P(a|random docs)`（真假差）。**测量的东西不一样**：
- IGPO：新 turn（含新 reasoning + 新 query + 新 retrieval）的**综合贡献**
- IG-Search：**纯粹的检索质量**（控制 reasoning 和 query 长度）

IG-Search 作者批评 IGPO "conflates reasoning, querying, and retrieval"——但 IGPO 在 non-search 场景（纯多步推理 QA）依然适用；IG-Search 强依赖检索步骤。

**开放问题**：二者正交吗？turn-level 综合 IG + step-level 反事实 IG 的双层叠加是否会有更好 credit assignment？

## 可深入的方向

1. **非 QA 场景的 IG 迁移**：
   - Coding：用 "能 pass test case 的概率增量"
   - Tool-use：用 "工具返回有效结果的概率增量"
   - GUI：用 "下一步 entropy 降低量" 作代理

2. **混合信号**：IG（稳定 + always non-zero） + tree propagation（捕获长程依赖） + entropy weighting（强化高不确定处）的组合——三者目前各自独立，未见整合

3. **Turn 的自动切分**：当前依赖 tool-call 或 think/action 标签切分，能否用 model-internal signal（如 attention pattern）无监督切分？

4. **Self-supervised golden trace**：best-of-N rollout 的最优 trajectory → 作为 MatchTIR 风格匹配目标 → 闭环 credit assignment，不依赖人工标注

5. **IGPO × IG-Search 双层 IG** [2510-igpo × 2604-ig-search]：turn 综合 + step 反事实的正交组合，可能既保留 "always non-zero" 又剥离 "conflation"

6. **Counterfactual 推广到非检索**：非 search 场景（GUI / tool-use）如何定义 "random baseline"？用 null tool output？用随机其他 action？

7. **Meta-episode × turn-level credit 双轴** [2603-mr-search × 2510-igpo/2604-ig-search]：meta-episode 捕获"跨 attempt 自我校正"（MR-Search）+ 单 episode 内 dense IG（IGPO/IG-Search）——两个维度正交，合并可能同时解决 "always non-zero signal" 和 "跨 attempt exploration"

## Related

- [[Credit-Assignment-in-Agentic-RL]]
- [[Entropy-Guided-Exploration]]
- [[Search-Augmented-RL]] — 搜索 RL 生态，多种 turn-level / step-level 实现
- [[Tree-Based-Rollout]]（待建）
- [[Advantage-Collapse]]（待建）
