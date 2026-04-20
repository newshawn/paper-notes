# MR-Search: Meta-Reinforcement Learning with Self-Reflection for Agentic Search

- **ID**: 2603-mr-search
- **Authors**: Teng Xiao, Yige Yuan, Hamish Ivison, Huaisheng Zhu, Faeze Brahman, Nathan Lambert, Pradeep Dasigi, Noah A. Smith, Hannaneh Hajishirzi
- **Venue / Year**: arxiv 2026-03 (v1 2026-03-11, v2 2026-03-18) · Allen AI
- **Link**: [arxiv](https://arxiv.org/abs/2603.11327) · [pdf](pdfs/2603-mr-search.pdf)
- **Tags**: #credit-assignment #no-reward-model #turn-level-reward #multi-turn-agent #tool-use

## TL;DR

1. **核心结论**：提出 **MR-Search**——in-context meta-RL 训练 search agent，通过 self-reflection 跨 episode 积累。Qwen2.5-7B 8-benchmark 平均 +9.2% relative（42.1 → 46.0），**3B +19.3%**（34.7 → 41.4）
2. **方法机制**：每个 episode 结束后生成 explicit reflection 作为 prefix context，下个 episode 条件依赖所有前序轨迹 + reflections；turn-level **RLOO advantage**（leave-one-out）做 critic-free credit
3. **为什么有效**：标准 RL 每个 episode 独立，无跨 attempt 记忆；MR-Search 把"跨 attempts exploration"学到 meta-policy 里，test-time 自动 refine
4. 💡 **一句话精华**：在独立 episode RL 外套一层 **meta-episode**（N=3 次 attempt 串联，reflection 做桥梁），用 turn-level RLOO advantage 做 credit——把"探索策略"本身作为 meta-policy 学习对象。

## Method

### 核心思路

**Meta-episode = N=3 个 sequential episodes**，每个 episode 是完整的 `<think><search><doc>...<answer>` 流程。episode 之间由 reflection prompt 连接：

```
Episode 1: search → docs → answer A1
↓ Reflection prompt: "Reflect on your current answer and provide another by searching additional information"
Episode 2: 条件 on (E1, R1) → search → docs → answer A2
↓ Reflection 2
Episode 3: 条件 on (E1, R1, E2, R2) → search → answer A3
```

Policy 学习 `π(a_n | a_0, r_0, a_1, r_1, ...)` —— 一个**条件于 history 的 meta-policy**。

### 关键设计：Turn-level RLOO Advantage

**Leave-One-Out (RLOO) at turn level**（critic-free）：

$$\tilde{r}_{i,n} = r(s_{i,n}, a_{i,n}) - \frac{1}{G-1} \sum_{j \neq i} r(s_{j,n}, a_{j,n})$$

**Discounted cumulative**：

$$A_{i,n} = \sum_{n'=n}^{N} \gamma^{n'-n} \tilde{r}_{i,n'}$$

- G=5 group size
- γ=1 默认（关掉 γ=0 性能大降）
- 无 critic → 省计算 + 稳定

### 🧬 Delta from Search-R1 / StepResearch / PPRM / MT-GRPO

- **vs Search-R1**：单 episode 独立；MR-Search 跨 N=3 episodes 训一个 meta-policy，**reflection 作为桥梁**
- **vs StepResearch / PPRM**（process reward 基线）：MR-Search **不用外部 reward model**，turn-level RLOO 直接从 outcome 推 advantage
- **vs MT-GRPO**：类似 multi-turn GRPO，但 MR-Search 的 RLOO 收敛更好（46.0 vs 44.3 on Qwen2.5-7B）
- **最核心**：把 "reflection loop" 显式写进训练目标——**不只是推理技巧，而是 RL 目标函数的一部分**

### 流程示例

Q (Musique): "X 公司 CEO 的母校和 Y 公司 CEO 的母校在同一个州吗？"

- **Episode 1** → `<think>` 先查 X CEO → `<search>` "X CEO" → docs → answer "Unknown"
- **Reflection 1**: "I need to identify X CEO's name first, then their alma mater"
- **Episode 2**（条件于 E1 + R1）→ search "X CEO name" → find "John Doe" → search "John Doe education" → "Stanford" → answer "Stanford, need to check Y"
- **Reflection 2**: "A2 incomplete, need Y CEO education"
- **Episode 3**（条件于 E1+R1+E2+R2）→ targeted search → "Y CEO Jane Smith Stanford" → answer "Yes, both Stanford (California)"

**差异点**：Search-R1 会训 1 个 policy 对单 episode 最优；MR-Search 训一个 **条件于 episode-history 的 meta-policy**——学"看到失败后如何 reflect"，这种"跨 attempt 自我校正"能力只有 meta-episode 训练才能获得。

### 🧩 因果链

- **问题**：Search-R1 类单 episode 训练不学"跨 attempt 自我校正"
- **根因**：episode 间独立，policy 没机会学"看到失败怎么改 query"
- **解法**：meta-episode 序列化（N=3）+ 显式 reflection prompt + turn-level RLOO advantage 跨 episodes 传递 credit
- **效应**：8 benchmarks Qwen2.5-7B 平均 +9.2% rel；3B +19.3% rel；γ=0 → 46.0 掉到 43.8（discount 的必要性）

### ⚠️ What would break this

- **仅测 Wikipedia tool**（Limitation）：多工具环境未验证
- **长 form generation 未评**（Limitation）：reward 定义依赖短 EM 答案
- **Context 随 N 线性增长**（作者承认；短 context variant 可用但简单）
- **依赖 reflection prompt 设计**（推测）：reflection 质量差时可能干扰 meta-episode
- **3B 提升 (+19.3) 远大于 7B (+9.2)**——小模型更依赖显式 scaffolding；大模型可能内化类似能力，meta-RL 的收益递减

## Key Results

**训练配置**
- 基座：Qwen2.5-3B-Base, Qwen2.5-7B-Base
- 训练数据：NQ + HotpotQA 合训；另加 ASearcher（90/10 split）
- 训练方法：RLOO-based meta-RL，γ=1，G=5
- 训练资源：300 steps, max tool calls 3-5, context 8K/16K；具体 GPU 未明说

**评测 Benchmark**（三问）
- **NQ / TriviaQA / PopQA**：single-hop factoid QA
- **HotpotQA / 2Wiki / Musique / Bamboogle**：multi-hop
- **ASearcher**：complex search
  - 任务来源：ASearcher benchmark
  - 执行环境：Wikipedia tool, max 5 searches
  - 评测方式：EM

**核心结果**（Qwen2.5-7B avg EM）

| 方法 | 平均 |
|---|---|
| Search-R1 | 42.1 |
| **MR-Search** | **46.0** (+9.2% rel) |

- Qwen2.5-3B: 34.7 → 41.4 (**+19.3% rel**)
- ASearcher 7B: 36.9 → 41.3 (+10.2% rel)

**消融（Table 2）**：
| Variant | Avg |
|---|---|
| Search-R1 baseline | 43.5 |
| γ=0 (no discount) | 43.8 |
| PPO 替代 RLOO | 42.0 |
| MT-GRPO 替代 | 44.3 |
| **MR-Search (full)** | **46.0** |

**意外发现**：
- γ=0 vs γ=1: **-2.2 points** —— turn-level credit assignment 的必要性实证
- 小模型获益 > 大模型（+19.3 vs +9.2）——与 [2510-igpo] 的 3B +15.3 观察一致：小模型更依赖显式 scaffolding
- step-level variant 48.6（比默认 46.0 还高）——细粒度可能更优

## Takeaway

### 对我研究的启示

结合本 wiki 的 Agentic RL Credit Assignment 方向：

1. **Meta-RL 是 credit assignment 之外的另一维度**：跨 episode 的 self-correction 与 turn-level credit **正交**——MR-Search 本身就在叠加（meta-episode + turn-level RLOO）
2. **Reflection 作为 context bridge 可迁移**：agentic tool-use 任意多 attempts 场景都能套——不只 search
3. **RLOO 作 critic-free advantage**：工程实用，比 MC 估值省算力；G-1 归一化降方差
4. **小模型 scaffolding 假说**：IGPO +15.3, MR-Search +19.3——**小模型从显式 credit assignment 获益显著大于大模型**。潜在方向：专门研究"小模型专属 credit assignment 技术栈"
5. **研究机会**：meta-episode reflection × IG-Search 的 counterfactual IG → 双轴 credit（跨 attempt × 跨 retrieval）

### 🧠 理解核验

1. Meta-episode 结构如何让 policy 学到 "reflection-based search strategy"，而不是 overfit 某几种 query 模板？
2. Turn-level RLOO advantage 的 `(G-1)` 归一化防止什么？为什么比 PPO 更好？
3. γ=1 vs γ=0 的 2.2 点差距说明什么——credit 如何在 episodes 之间传递？

## Open Questions

- **多工具环境**（Limitation）：meta-RL 在异构工具组合下是否还稳？
- **长 form 生成**（Limitation）：reflection 对长答案的定义 + reward 设计？
- **Context scaling**：N=3 固定；N 增大到 5/10 是否还能稳？
- **Reflection prompt 敏感性**（推测）：不同 prompt 模板影响？
- **Research opportunity**：
  - Meta-episode × IGPO/IG-Search 的 dense IG → 双轴 credit
  - 小模型专属 CA 技术栈系统研究（结合 IGPO/MR-Search/EAPO）

## Related Wiki
- [[Credit-Assignment-in-Agentic-RL]]
- [[Turn-Level-Reward]]
