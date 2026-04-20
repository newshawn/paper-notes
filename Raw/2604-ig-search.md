# IG-Search: Step-Level Information Gain Rewards for Search-Augmented Reasoning

- **ID**: 2604-ig-search
- **Authors**: Zihan Liang, Yufei Ma, Ben Chen, Zhipeng Qian, Huangyu Dai, Lingtao Mao, Xuxin Zhang, Chenyi Lei, Wenwu Ou
- **Venue / Year**: arxiv 2026-04 (v1, submitted 2026-04-16)
- **Link**: [arxiv](https://arxiv.org/abs/2604.15148) · [pdf](pdfs/2604-ig-search.pdf)
- **Tags**: #credit-assignment #information-gain #step-wise-reward #tool-use #multi-turn-agent #no-reward-model

## TL;DR

1. **核心结论**：提出 **IG-Search**，用 **counterfactual random docs 构建 IG baseline** 作 step-level reward；Qwen2.5-3B 在 7 个 QA benchmark 上 avg EM **0.430**（vs MR-Search 0.414, +1.6），multi-hop 特别强（HotpotQA +1.7）
2. **方法机制**：每个 search step 的 reward = `log P(a*|real docs) - avg_j log P(a*|random docs_j)`；counterfactual 文档来自同一 batch 的其他题（保留长度 / 格式一致性，只剥离 topical relevance）
3. **为什么有效**：trajectory-level reward 分不清"好 query vs 冗余 query"；每 step 跟 counterfactual 比，**隔离纯粹的"检索贡献"**，不被 reasoning / query 长度混淆
4. 💡 **一句话精华**：每个 search step 的 reward = 真检索 vs 随机文档的 log-prob 差——counterfactual baseline 隔离"这次检索真的帮到答案了吗"，不被 query 长度或 reasoning 混淆。

## Method

### 核心思路

Trajectory-level search RL 下，5 次 search 的 reward 无法区分"第 2 次 query 极其精准 vs 第 4 次完全冗余"——credit 被摊平。当所有 rollout 失败时还会 **collapse 到 zero gradient**。

**IG-Search 做法**：
- 每 search step 做 **counterfactual 对比**：除了真实 retrieved docs，还用 N=3 份 random docs 计算"如果检索没帮助"的基线
- 两者 log-prob 差 = 这次检索带来的 information gain
- 把 IG 加到 **query tokens**（不是所有 tokens）的 advantage 上

### 关键设计

**IG 公式（Eq. 2）**：

$$IG_t = \log \pi_{\theta_{\text{old}}}(a^* \mid \mathcal{C}_t^{\text{real}}) - \frac{1}{N}\sum_{j=1}^{N} \log \pi_{\theta_{\text{old}}}(a^* \mid \mathcal{C}_t^{\text{rand},j})$$

- $a^*$ = gold answer
- $\mathcal{C}_t^{\text{real}}$ = 第 t step 含真实 retrieved docs 的上下文
- $\mathcal{C}_t^{\text{rand},j}$ = 替换成随机文档的 counterfactual
- $N = 3$（默认）
- log-prob 按 answer token 长度归一化（Eq. 3）

**Counterfactual 文档来源**：**同一 batch 的其他题的文档**——长度 / 格式 / 结构一致，**只剥离 topical relevance**，让 IG 只反映检索的信息贡献。

> Ablation（RQ3）: random-docs baseline EM **0.430** vs empty-context baseline **0.403**——empty-context 在 multi-hop 退化明显，"length mismatch introduces systematic bias"。

**per-token advantage 修正（Eq. 4）**：

$$\tilde{A}_{i,p} = \hat{A}_i + \alpha \cdot \frac{\tilde{IG}_t}{|\mathcal{Q}_t|} \quad \text{if } p \in \mathcal{Q}_t,\ \text{else } \hat{A}_i$$

- $\alpha = 0.3$
- $|\mathcal{Q}_t|$ = query token 数——**除以长度防 reward hacking（刷长 query 骗高 IG）**
- **只 modulate query tokens**，reasoning / answer tokens 保持原 advantage

### 🧬 Delta from IGPO / MR-Search / GiGPO

- **vs IGPO [2510-igpo](2510-igpo.md)**：
  - IGPO 是 **turn-level IG**：$\pi(a|context_t) - \pi(a|context_{t-1})$（连续 turn 的 prob 差）
  - IG-Search 是 **step-level IG with counterfactual**：每个 search step 跟"随机文档对照组"比
  - **作者批评 IGPO** "conflates reasoning, querying, and retrieval"——IGPO 混了三种贡献源；IG-Search 用 random docs **分离出检索贡献**
  - Appendix J 给出 cross-protocol 对比（Qwen2.5-3B-Instruct，F1）：**IG-Search 0.518 vs IGPO 0.489（+2.9）**——**且 IG-Search 用更弱的 retriever（E5 + Wikipedia 2018 dump vs IGPO 的 Google Search API）和更小 rollout budget（G=5/T=5 vs G=16/T=10）**
- **vs MR-Search（2025 最强 trajectory baseline）**：保留 trajectory reward，新增 step-level IG 信号
- **vs GiGPO [2505-gigpo](2505-gigpo.md)**：GiGPO 用 state recurrence 聚类，要求相同状态；IG-Search 不要求状态等价，**用文档 counterfactual 替代**——multi-hop 场景 IG-Search 赢 6/7（GiGPO 只在 Bamboogle single-hop 上胜 0.641 vs 0.424）

### 流程示例

Q："Finding Nemo 原型鱼（clownfish）在 2020 年前被 USGS 记录在哪里？"

**Step 1（search）**：query = `"Finding Nemo clownfish USGS"`
- 真实文档：USGS 数据库提到 Florida, Tarpon Springs
- 3 份随机文档（来自同 batch 其他无关题）：电影评论 / 别的鱼种 / 地理百科
- `log P("Tarpon Springs" | real) = -2.1`
- `avg log P("Tarpon Springs" | random) = -8.7`
- **IG_1 = -2.1 - (-8.7) = +6.6**（这次检索贡献大）

**Step 2（search）**：query = `"fish Florida list"`（更泛）
- 真实文档：覆盖很多鱼，Tarpon Springs 没突出
- **IG_2 ≈ +2.2**（贡献小得多）

**差异点**：Trajectory-RL 给两 query 同 reward；IG-Search 精确区分 Step 1 query >> Step 2 query。

### 🧩 因果链

- **问题**：Search-Augmented RL 下 trajectory reward 分不清"好 query vs 冗余 query"；全部 rollout 失败时梯度为 0
- **根因**：trajectory-level 给所有 search step 同 reward；失败群组相对化后梯度消失
- **解法**：每 step 跟 counterfactual random docs 比，算 log-prob 差 → always non-zero 的 step reward
- **效应**：3B avg EM +1.6 (0.430 vs 0.414)，multi-hop 尤其强（HotpotQA +1.7, 2Wiki +1.4, Musique +1.4）；7B +1.9

### ⚠️ What would break this

- **需要 gold answer**（作者 Limitation 1）：训练必须 supervised，self-play 场景不适用
- **超参 $\delta, \eta, \lambda, \alpha$ 任务间可能需重调**（Limitation 2）：NQ+HotpotQA 上调好的参数迁到不同答案结构（如 list-form answer）未必最优
- **Offline retriever 时效性**（Limitation 3）：只用 2018 Wikipedia dump，时事 / 最新研究无法覆盖
- **只 modulate query tokens**（推测）：如果推理本身是瓶颈（tough reasoning + 简单 search），reasoning tokens 不被调可能欠拟合
- **Counterfactual 的随机性**（推测）：N=3 够不够稳？不同随机种子的 IG 方差如何？论文未消融

## Key Results

**训练配置**
- 基座：Qwen2.5-3B（主要）+ Qwen2.5-7B（scaling 实验）
- 训练数据：NQ + HotpotQA 合训
- 训练方法：GRPO-based + IG modulation, α=0.3, group G=5, max 5 search/rollout, 200 steps, LR=1e-6
- 训练资源：Retriever E5-base-v2, top-3 docs；具体 GPU 未明说

**评测 Benchmark**（三问）

- **NQ / TriviaQA / PopQA**: single-hop factoid QA
  - 任务来源：Natural Questions / TriviaQA / PopQA（公开数据集）
  - 执行环境：Retriever + 多轮 search（max 5），offline Wikipedia dump
  - 评测方式：EM (Exact Match)
- **HotpotQA / 2Wiki / Musique / Bamboogle**: multi-hop QA（需多跳推理）

**核心结果**

Qwen2.5-3B (Table 1, 7-benchmark avg EM)：

| 方法 | avg EM |
|---|---|
| **IG-Search-Base** | **0.430** |
| MR-Search | 0.414 (+1.6) |
| GiGPO-Instruct | 0.421 (+0.9) |
| AutoRefine-Base | 0.405 (+2.5) |

Multi-hop 改进最显著：HotpotQA +1.7, 2Wiki +1.4, Musique +1.4

Qwen2.5-7B (Table 3)：IG-Search-Instruct **0.479** (+1.9 vs MR-Search 0.460)

**意外**：GiGPO 在 Bamboogle 上 0.641 vs IG-Search 0.424——**同状态聚类在浅 single-hop 上是更强的信号**（Bamboogle 题简单，5 个 rollout 大概率状态重合，GiGPO 优势尽显）

**Cross-Protocol 对比 IGPO（Appendix J, Table 8, Qwen2.5-3B-Instruct, F1）**：

作者承认 IGPO 和 IG-Search 训练/评测 setup 差异大（不同 retriever、不同 rollout budget、不同训练数据），不适合放主表；但 IGPO 报 word-level F1，作者算了 IG-Search 在同指标下的值跨协议比：

| 方法 | NQ | TriviaQA | PopQA | HotpotQA | 2Wiki | Musique | Bamboogle | Avg |
|---|---|---|---|---|---|---|---|---|
| IGPO (w/ F1+IG) | 0.419 | 0.692 | 0.490 | 0.478 | **0.514** | 0.248 | **0.584** | 0.489 |
| **IG-Search-Instruct** | **0.542** | 0.692 | **0.501** | **0.551** | 0.507 | **0.276** | 0.554 | **0.518** |

- **IG-Search +2.9 F1 平均**，且在 5/7 benchmark 上超 IGPO
- 关键点：**IG-Search 用弱 retriever（E5 + 2018 Wikipedia）+ 小 budget（G=5, T=5）打败了 IGPO（Google Search API + G=16, T=10）**——说明 counterfactual step reward 的信号质量比检索能力/采样规模更重要
- **IGPO 仍胜的两个**：2Wiki（+0.007）和 Bamboogle（+0.030）——Bamboogle 再次印证 "single-hop 浅题不利 step-level signal"（前面 GiGPO 也是在 Bamboogle 赢）

## Takeaway

### 对我研究的启示

结合本 wiki 的 Agentic RL Credit Assignment 方向：

1. **Counterfactual baseline 是 IG 的好思路**：对比 [2510-igpo](2510-igpo.md) 的 turn-level IG（连续 turn 的 prob 差）——**两种 IG 测的是不同的事**：
   - IGPO：新 context 带来多少"整体理解提升"（混了推理 + 检索）
   - IG-Search：检索本身贡献多少（纯粹信息增益）
   - **二者正交，可合并**——turn-level IG + step-level counterfactual IG 双层设计，**目前无人做**
2. **Per-token 选择性 modulation 是巧思**：只调 query tokens、不动 reasoning/answer tokens——降低 reward hacking 风险，值得迁移到其他场景
3. **反 reward hacking 的除长度**：`IG / |query tokens|` 防止"刷长 query 骗高 IG"——其他 step-reward 设计可以借鉴这个 idea
4. **GiGPO 在 single-hop 更强**提醒：方法适用性要按任务深度看，不是越精细越好

### 🧠 理解核验

1. Counterfactual random docs 为什么选 **同 batch 内其他题的文档**，而不是随机乱码或空 context？各自会引入什么 bias？
2. 为什么 per-token advantage 只 modulate query tokens，不动 reasoning 和 answer tokens？
3. IG-Search 的 IG 和 IGPO 的 IG 数学上都是 log-prob 差，但测量的"增益"本质不同——差别在哪？（答案涉及 context 里多了啥、对照谁）

## Open Questions

- **Gold answer 依赖**（作者 Limitation 1）：self-supervised 变体可能用 best-of-N consistency 代替
- **超参跨任务泛化**（Limitation 2）：不同答案结构（list / numeric / essay）需不需要各自一套？
- **Offline retriever 时效性**（Limitation 3）：时事 / 最新研究无法覆盖
- **Counterfactual 方差**（推测）：N=3 够稳吗？IG 对不同 random 种子的敏感性？
- **研究方向**：
  - **与 IGPO 的 turn-level IG 合并**（turn + step 双层 IG）—— **最有前景的开放方向**
  - Reasoning token 也 modulate（可能需要不同信号源）
  - 非 search 场景的 counterfactual baseline 设计（如 tool-use 一般场景：counterfactual tool outputs？）

## Related Wiki
- [Credit-Assignment-in-Agentic-RL](../Wiki/Credit-Assignment-in-Agentic-RL.md)
- [Turn-Level-Reward](../Wiki/Turn-Level-Reward.md)
