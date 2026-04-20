# Search-Augmented RL

[coverage: high]
[last-updated: 2026-04-20]

## Definition

为 LLM agent 学习 **多轮 search + reasoning** 的强化学习范式。与普通 agent RL 的核心差别：
- **外部检索作为主要信息来源**（retrieved docs 作 context）
- **多 search turns** (通常 max 3-5 次 search/query)
- **文档噪声**是核心挑战——policy 要从 top-k 嘈杂 docs 里推理
- **Credit 跨 search steps** 难分配：哪次 query 精准、哪次 redundant？

公共 benchmark：NQ / TriviaQA / PopQA（single-hop）+ HotpotQA / 2Wiki / Musique / Bamboogle（multi-hop）。基座几乎全是 Qwen2.5-3B / 7B，retriever 用 E5-base-v2 + Dec 2018 Wikipedia dump。

## 演进脉络（本 wiki 涵盖的 4 篇，时间序）

| 时间 | 方法 | 核心创新 | 改动类型 |
|---|---|---|---|
| 2025-05 | [2505-autorefine] | `<refine>` 显式蒸馏步骤 + stairstep dual reward | **协议 + reward shaping** |
| 2025-10 | [2510-igpo] | Turn-level IG (temporal-difference): `P(a|t) - P(a|t-1)` | **Dense reward 设计** |
| 2026-03 | [2603-mr-search] | Meta-episode (N=3) + reflection + turn-level RLOO | **训练范式 + algorithm** |
| 2026-04 | [2604-ig-search] | Step-level IG with counterfactual random docs | **Dense reward 细化** |

**共同演进方向**：从"怎么整体训"（AutoRefine 协议）→ "如何细化 credit"（IGPO turn-IG）→ "如何跨 episode 学习"（MR-Search）→ "如何精确定位检索贡献"（IG-Search）。逐步向更细、更精准的 credit assignment 前进。

## Key Claims（跨论文整合）

### 关于 retrieval-augmented 训练本身

- [2505-autorefine] **显式分离"信息蒸馏"** 是降低 policy 认知负荷的关键——refine 把 600+ tokens 噪声 docs 压到 100-200 tokens 关键 facts，4x 压缩
- [2505-autorefine] **Refine 和 dual reward 必须合一**——任一单独 → 退回 baseline；两者 synergy 显著
- [2505-autorefine][2510-igpo][2603-mr-search][2604-ig-search] **Multi-hop 是 search-RL 的主战场**——所有方法的 gain 都在 multi-hop benchmarks（HotpotQA / 2Wiki / Musique / Bamboogle）更大。多跳推理对检索质量的依赖度远高于 single-hop

### 关于 credit assignment 设计

- [2505-autorefine] **Stairstep 非线性 reward** (`R_ans if R_ans>0 else 0.1 if R_ret>0`) 显著优于线性加权——避免次要信号干扰主任务
- [2510-igpo] **IG reward always non-zero** 直接消除 advantage collapse；但 **混合 reasoning + querying + retrieval 三种贡献**
- [2603-mr-search] **Turn-level RLOO advantage**（critic-free, G-1 leave-one-out）是 search-RL 的工程实用选择；γ=0 ablation 掉 2.2 点实证 discount factor 对 turn-level credit 的必要性
- [2604-ig-search] **Counterfactual random docs** 隔离纯检索贡献——明确批评 IGPO 的 conflation
- [2604-ig-search] **Per-token selective modulation**（只调 query tokens + 除以 `|Q_t|`）是防 reward hacking 的巧思

### 关于规模与 scaffolding

- [2510-igpo] **3B 小模型 +15.3 vs 7B +6.8**（比值 2.3×）
- [2603-mr-search] **3B +19.3% rel vs 7B +9.2% rel**（比值 2.1×）
- **两个独立实验一致观察小模型获益显著大**——search-RL 场景下 "小模型 scaffolding 假说"成立。详见 [[Credit-Assignment-in-Agentic-RL]] Contradiction #8

### Baseline 传承

- [2505-autorefine] 是 [2603-mr-search] 和 [2604-ig-search] 的 baseline——**已成领域标准起点**
- [2510-igpo] 的 IG 思路被 [2604-ig-search] 继承并批判性改造

## Contradictions / Open Questions

### 1. IG 的两种设计：temporal-difference vs counterfactual

见 [[Credit-Assignment-in-Agentic-RL]] Contradiction #7。

- **[2510-igpo] turn-to-turn IG**：`P(a|context_t) - P(a|context_{t-1})`——混合所有贡献
- **[2604-ig-search] counterfactual IG**：`log P(a|real) - avg log P(a|random)`——只隔离检索

IG-Search 作者批评 IGPO "conflates reasoning, querying, retrieval"。但 IGPO 在 **无 search 场景**（多步推理 QA without retrieval）仍然适用，IG-Search 强依赖 counterfactual 所以必须有 search step。

**Open**: 二者叠加（turn-level 综合 + step-level 反事实）会不会更好？

### 2. 粒度选择：episode vs turn vs step

不同论文取不同粒度：

| 方法 | Reward 粒度 |
|---|---|
| AutoRefine | Episode-level dual reward（答案 + 二值检索覆盖）|
| IGPO | Turn-level IG |
| MR-Search | Turn-level RLOO |
| IG-Search | Step-level IG（per search step）+ per-token modulation (query only) |

**粒度越细越好吗？** 不一定。AutoRefine episode-level 在 Bamboogle（single-hop）赢过 IG-Search（0.641 vs 0.424）——**浅任务 detailed credit 反而 overkill**。

**Open**: 是否应按任务 depth 自适应选粒度？

### 3. Retrieval corpus 的时代局限

所有 4 篇都用 **Dec 2018 Wikipedia dump**：
- 无法覆盖时事 / 最新研究
- 测的是方法本身，不是真实应用

**Open**: Live search（Google / Bing API）下的 credit 信号分布是否不同？retrieved docs 质量更好 → IG 方差变小？还是引入新 noise（SEO spam）？

### 4. Reward hacking 的空间

- [2505-autorefine] `R_ret`（gold answer 在 refine 里出现）可能被 gaming——policy 学会硬塞 gold-like phrase（作者未讨论）
- [2604-ig-search] 除以 `|Q_t|` 部分缓解 query-length hacking，但**还有"反向 gaming"风险**：policy 可能学生成特别短但不精准的 query 骗高 IG ratio

**Open**: retrieval 场景的通用反 gaming 方法？

## 可深入的方向

1. **IGPO × IG-Search 双层 IG**（[[Credit-Assignment-in-Agentic-RL]] #8）：temporal-difference IG（综合贡献）+ counterfactual IG（纯检索）—— 二者正交
2. **Meta-episode × dense IG** [2603-mr-search × 2510-igpo/2604-ig-search]：跨 attempt reflection + 单 episode dense reward → 双轴 credit
3. **Refine × counterfactual IG** [2505-autorefine × 2604-ig-search]：在 refine 块后算 IG（真 refine vs 空 refine vs 随机 refine）——更精细衡量 refine 质量
4. **Small model × search-RL scaffolding**（IGPO 3B +15.3, MR-Search 3B +19.3%）：系统研究 1B/3B/7B/13B/30B 的 CA 技术收益曲线。**本领域最未开发**且**最有论文 potential** 的方向
5. **自适应粒度选择**：Episode (AutoRefine) vs Turn (IGPO/MR-Search) vs Step (IG-Search)——按任务 depth 切换粒度的自动机制
6. **非 Wikipedia corpus 泛化**：在 live search / code search / scientific paper search 上验证方法
7. **Reward hacking 防护**：search-RL 场景的通用反 gaming 技术

## 和本 wiki 其他方向的接口

- **→ Entropy-based 路线（[[Entropy-Guided-Exploration]]）**：目前 search-RL 没人用 entropy-guided branching（ARPO/AEPO/AT²PO），可能因为 search tool call 本身就是 entropy spike 点，显式 branching 策略未必受益——值得 ablation
- **→ Tree-based rollout**（TreeGRPO / AT²PO）：search 场景天然有分支（不同 query 走不同检索路径），但**搜索 RL 没人做显式 tree rollout**——是个空白
- **→ Graph-based**（SALT）：不同 rollout 可能撞上相似 retrieved context → SALT 的 DAG 合并在 search 场景值得试

## Related

- [[Credit-Assignment-in-Agentic-RL]]
- [[Turn-Level-Reward]]
- [[Entropy-Guided-Exploration]]
- [[Small-Model-Scaffolding]]（待建，已 ≥3 篇观察）
