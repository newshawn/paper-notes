# Credit Assignment in Agentic RL

[coverage: high]
[last-updated: 2026-04-20]

## Definition

在多轮 LLM Agent 的 RL 训练中，把 trajectory 末端的稀疏 outcome reward 拆解/补充为**每一步 action 的贡献度**的技术。核心目标：解决 "整条轨迹共享一个 reward" 导致的 advantage 方差大、gradient 信号弱、训练不稳定的问题。

## Why Agentic RL ≠ PRM on CoT

传统 CoT 上的 PRM 难做：
- 自然语言推理的"一步"边界模糊
- 需要人工标注"这步对不对"，主观、昂贵
- 打分自洽性差

Agentic 场景变 tractable 的关键：
- **Action 有明确语义边界**：工具调用、点击、代码、请求
- **环境有天然反馈**：tool output、执行结果、error message
- → "给每步打分" 不再依赖人类标注

## 四大路线

### 1. 生成式 Reward Model 路线

| 方法 | 信号来源 | 特点 |
|---|---|---|
| [2602-rlanything] | 生成式 LLM 作 step-wise RM | RM 与 policy 联合优化；**只用 step reward 甚至超越 outcome reward** |

### 2. 结构化聚合路线（无 RM，用 return 回传）

| 方法 | 核心机制 | 状态抽象 |
|---|---|---|
| [2505-gigpo] | 相同状态 s 下收集不同 a 的最终 R | 隐式（状态 hash） |
| [2509-treegrpo] | 显式树状采样，随机挑节点展开 | 显式树 |
| [2510-salt] | **Trajectory graph**（含 DAG 合并） | 通用图 |
| [2601-at2po] | Entropy-guided tree + Monte Carlo 回传 per-turn value | 显式树 + entropy |

**演进**：GiGPO（隐式）→ TreeGRPO（显式树 + 随机）→ AT²PO（显式树 + entropy）→ SALT（更一般的 graph）

### 3. Entropy-Based 路线（无 RM，用不确定性做信号）

| 方法 | 核心机制 |
|---|---|
| [2507-arpo] | Tool call 后 entropy 升高时触发 partial rollout branching；共享前缀 token 共享 advantage |
| [2510-aepo] | Adaptive 采样预算 + branching penalty + **高熵梯度保留**（sg 技巧）|
| [2509-empg] | Step-level entropy 调节梯度幅度 + future clarity bonus |
| [2601-at2po] | Entropy-guided tree expansion + turn-level IS+clip |

**演进**：ARPO（entropy 触发分支）→ AEPO（修正过度分支 + 梯度保留）→ AT²PO（entropy 贯穿采样+credit+优化）。EMPG 是正交视角（不搞树，只改梯度）。

### 4. Dense Reward 路线（无 RM，用代理信号）

| 方法 | 信号 | 适用场景 |
|---|---|---|
| [2510-igpo] | Turn 结束后 policy 生成 GT 答案概率的增量（turn-to-turn IG） | 答案可验证的 QA |
| [2604-ig-search] | Search step 的 counterfactual IG（真文档 vs 随机文档 log-prob 差） | Search-augmented QA，需 gold answer |
| [2601-matchtir] | Predicted turn ↔ golden trace 二部图匹配（KM 或 OT） | 有 golden trace 的 tool-use |

**IG 两种设计对立**：IGPO 测"turn 间整体理解提升"（混推理+检索）；IG-Search 用随机文档 counterfactual 测"纯检索贡献"。详见 Contradictions #7。

### 5. Token-Level Credit 路线（最细粒度）

| 方法 | 核心机制 | 特点 |
|---|---|---|
| [2604-eapo] | Four Quadrant (polarity × entropy) + 按 token entropy 调 \|Ã\| | RLVR 场景；α=0.2, φ=2；PHR 象限是主引擎 |

**独特维度**：之前 credit assignment 都在 step / turn 粒度；EAPO 下探到 token——按 entropy 给每个 token 不同权重。与其他路线**正交**，可组合（见 可深入的方向）。

## Key Claims（跨论文整合）

- [2602-rlanything] 只用 step reward（不用 outcome）训练效果反而更好 → 有监督 RM 本身可能足以定义任务
- [2510-igpo] IG reward 永远非零，直接消除 GRPO 的 advantage collapse
- [2510-igpo] **3B 小模型从 dense reward 获益最大**（+15.3 vs 7B 的 +6.8）——小模型更依赖 credit assignment
- [2507-arpo][2510-aepo] Tool call 后的前 10-50 个 token entropy 明显升高，是天然的 branching 触发点
- [2509-empg] **Proposition 1**：softmax policy gradient 的 norm 与 entropy 单调耦合——confident step 学不够快、uncertain step 不稳定
- [2601-at2po] Token-level IS 方差大、sequence-level 粒度过粗 → **turn-level IS** 是正确的折中
- [2510-aepo] GRPO 的 clip 项让高熵 token 梯度为 0 → **sg(δ) 技巧**绕过
- [2601-matchtir] 直接用相似度分数作 reward 会被 gaming（反复调相似工具）；需要 KM / OT 这种硬约束
- [2604-eapo] **Token 级不是均分**：softmax gradient `∇ ∝ (1-π)` 暗示高熵 token 承载更多信号；Four Quadrant 实证 PHR (positive high-entropy) 是 reasoning improvement 主引擎，PLR 需 **5.5× 步数**达同 accuracy
- [2604-eapo] **Accuracy 与 diversity 同时提升**（反 trade-off 罕见现象）——暗示高熵 token 承载 generalizable 信号
- [2604-ig-search] **Counterfactual IG** 明确批评 IGPO "conflates reasoning/querying/retrieval"——用随机文档剥离 topical relevance 隔离纯检索贡献
- [2604-ig-search] **Per-token modulation 防 reward hacking**：只调 query tokens + 除以 `|Q_t|`（防刷长 query 骗高 IG）

## Contradictions / Open Questions

### 1. Entropy 是好信号还是噪声？

- ARPO/AEPO/AT²PO：高 entropy = 值得探索的关键决策点
- EMPG：高 entropy → 梯度**降权**（与上面方向相反！）
- 两者共存的可能解释：**不同阶段的 entropy 含义不同**——tool call 后的 entropy 可能反映"环境刚带来新信息，需要消化"（值得多采）；token 生成过程中的 entropy 可能反映"policy 不确定"（不宜大步更新）

→ **开放问题**：如何区分 "informative uncertainty" vs "random noise"？有没有统一框架同时包含这两种 entropy 作用？

### 2. 自己评自己的合法性？

- [2510-igpo] 用 policy 自己算 $P(a \mid \text{context})$ 作 reward
- 担忧：policy 跑偏 → IG 信号自欺欺人
- 反论：[2602-rlanything] 的 RM 与 policy 联合优化似乎工作得很好
- **开放问题**："自监督闭环" 的稳定性边界在哪？什么时候会坍缩到退化解？

### 3. γ 衰减策略

- [2510-igpo] 默认 γ=1
- [2505-gigpo] 使用 γ<1
- 长轨迹（ALFWorld 60 步）下 γ=1 可能让早期 step 信号被过度放大
- **未系统研究**

### 4. Credit 粒度层级（IS 粒度 vs Advantage 粒度）

两种粒度常被混淆，2026-04 compile 明确区分：

**Importance Sampling 粒度**（GRPO 比较 ratios 的单位）
- Token（GRPO）< Turn（AT²PO）< Sequence（GSPO）
- [2601-at2po] 的 "turn-level IS + Part A gradient / Part B constant ratio" 是推荐折中

**Advantage 粒度**（reward 如何分配给 tokens / steps / turns）
- **Token 级** [2604-eapo]：按 entropy 给每个 token 不同 |Ã|
- **Step 级** [2505-gigpo][2510-salt][2604-ig-search]：按 state-grouping / graph / per-step IG
- **Turn 级** [2510-igpo][2601-matchtir]：按 turn-IG / bipartite match

**开放问题**：两种粒度**正交**——能否组合 turn-level advantage + token-level entropy 调制？（见 可深入的方向 #7）

### 5. 无 ground truth 怎么办？

- 当前方法多依赖 answer 可验证（QA）或有 golden trace（MatchTIR）
- Open-ended 任务（creative writing、long-form reasoning）空白
- [2601-matchtir] 论文自己建议的方向：**用 best-of-N rollout 的最优 trajectory 作为匹配目标**（self-play credit assignment）

### 6. 状态等价性 & 超参数泛化（跨方法共性陷阱）

两个被各论文回避但实际影响可用性的基础问题：

**状态等价性**
- [2505-gigpo] "同状态聚类" 依赖状态判等——字符串完全相同？HTML 不同 viewport 算一个吗？论文未说
- [2510-salt] trajectory graph 合并中间状态面临同样问题——阈值过严退化为 tree，过松则合并错位
- 未有任一方法提出**任务无关的自适应等价判据**

**超参数敏感性（限制方法可用性）**
- [2507-arpo] entropy 阈值 τ 跨模型不鲁棒 + 后期 entropy collapse 令阈值失效
- [2510-aepo] 新增 α / β / γ / k / ε 组合爆炸
- [2509-empg] k / k' 难调
- [2601-matchtir] 三维相似度（name / param / content）加权未系统消融

**开放问题**：是否存在"自适应状态等价 + 自适应超参数"的通用机制？若有，可能解锁一大类方法的跨场景迁移。

### 7. IG 的两种设计：时间差 vs 反事实（2026-04 新增）

[2510-igpo] 和 [2604-ig-search] 都用 Information Gain 作 reward，但**测量对象完全不同**：

**[2510-igpo] turn-level temporal-difference IG**
- $r_t = \pi(a \mid context_t) - \pi(a \mid context_{t-1})$
- 测"新 turn 带来的理解提升"——**混合 reasoning + querying + retrieval 三种贡献**

**[2604-ig-search] step-level counterfactual IG**
- $IG_t = \log \pi(a^* \mid real) - \text{avg}_j \log \pi(a^* \mid random_j)$
- 随机文档来自同 batch 其他题（保长度，剥离相关性）
- **隔离纯粹的检索贡献**

IG-Search 作者明确批评 IGPO "conflates reasoning, querying, and retrieval within each turn"。但反过来：IGPO 在**无 search 场景**（纯多步推理 QA）仍然适用，IG-Search 强依赖检索步骤才能构造 counterfactual。

两者**正交**——research opportunity: 合并成"turn-level IG × step-level counterfactual IG"双层设计（见 可深入的方向 #8）。

## 可深入的方向（优先级排序）

1. **IG + self-consistency**：无 GT 时用多次采样一致性作为 IG 代理（IGPO 建议）
2. **非 QA 场景迁移**：coding 用 "pass-rate 概率增量"、tool-use 用 "工具返回有效概率"、GUI 用 "下一步 entropy 降低量"
3. **Entropy + IG 组合**：entropy 做 branching trigger、IG 做 credit——二者正交，没人合过
4. **小模型专属 credit assignment**：IGPO 的 +15.3 暗示小模型有独特需求，值得专门研究
5. **Self-play golden trace**（MatchTIR 建议）：消除对标注 trace 的依赖
6. **梯度缩放 × entropy balance**（EMPG × AEPO）：方向相反但可能互补，组合消融值得做
7. **Token-level × Turn-level credit 组合** [2604-eapo × 2510-igpo/2601-at2po]：EAPO 的 token-entropy 调制 + turn-level IG 正交维度，没人合过
8. **Turn + Counterfactual IG 双层** [2510-igpo × 2604-ig-search]：IGPO 测整体提升 + IG-Search 测纯检索，叠加可能解决 "conflation" 问题
9. **Four Quadrant 分析法通用化** [2604-eapo]：polarity × entropy 2×2 能否迁到 step / turn 粒度？如"正确 turn 的高熵 vs 低熵"是否也有类似模式？

## Related

- [[Turn-Level-Reward]]
- [[Entropy-Guided-Exploration]]
- [[Tree-Based-Rollout]]（待建）
- [[Importance-Sampling-Granularity]]（待建）
- [[Generative-Reward-Model]]（待建）
- [[Advantage-Collapse]]（待建）
