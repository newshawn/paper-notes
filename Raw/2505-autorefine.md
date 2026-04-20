# AutoRefine: Search and Refine During Think

- **ID**: 2505-autorefine
- **Authors**: Yaorui Shi, Sihang Li, Chang Wu, Zhiyuan Liu, Junfeng Fang, Hengxing Cai, An Zhang, Xiang Wang
- **Venue / Year**: arxiv 2025-05 (v1 2025-05-16, v5 2025-09-19)
- **Link**: [arxiv](https://arxiv.org/abs/2505.11277) · [pdf](pdfs/2505-autorefine.pdf)
- **Tags**: #credit-assignment #no-reward-model #tool-use #multi-turn-agent

## TL;DR

1. **核心结论**：搜索流程加 explicit `<refine>` 块蒸馏相关信息 + dual reward（F1 + 二值检索覆盖）—— Qwen2.5-3B 7-benchmark 平均 **40.5%**（vs Search-R1-Base 31.2%, **+9.3 绝对**）；multi-hop 尤其强
2. **方法机制**：`<think> → <search> → <documents> → <refine> → <think>...` 循环；refine 从原始 >600 tokens docs 蒸馏到 **100-200 tokens 关键 facts**（4x 压缩）
3. **为什么有效**：现有 search-RL 要求 policy 一次性做 4 件事（plan + 读噪声 docs + reason + answer）——refine step 把"信息蒸馏"单列成显式 action，分摊负荷
4. 💡 **一句话精华**：在 search-RL 里加 `<refine>` 显式蒸馏步骤（4x 压缩文档）+ 复合 reward（答案对 > 0.1 if 检索含答案 > 0）—— multi-hop 最受益（+9.1~11.9 绝对）。

## Method

### 核心思路

现有 retrieval-augmented RL 的 policy 在一次 forward pass 同时做：
- plan query（think）
- 理解嘈杂 docs（read ≥600 tokens 原文）
- reason 合成
- 输出 answer

**AutoRefine 把"信息蒸馏"单独列为 refine step**：

```
<think> 规划下一次 search
<search> 发 query
<documents> top-3 docs (noisy, >600 tokens)
<refine> 提炼 100-200 tokens 关键 facts     ← 新增 step
<think> 继续规划 or 直接 answer
...
<answer> 终止
```

Actor LLM autonomously 决定循环次数（max 5 searches）。

### 关键设计：复合 reward

两个独立 reward 信号：
- **Answer reward** `R_ans` = F1(predicted, gold)
- **Retrieval reward** `R_ret` = 二值（gold answer 的组成是否全出现在 refine 块里？ 1 or 0）

**非线性组合**（关键设计）：

$$R_{\text{overall}} = \begin{cases} R_{\text{ans}}, & R_{\text{ans}} > 0 \\ 0.1, & R_{\text{ans}} = 0 \text{ 且 } R_{\text{ret}} > 0 \\ 0, & \text{其他} \end{cases}$$

**设计意图**：
- 答案对时完全由 F1 主导（不被 R_ret 干扰）
- 答案错但检索含相关信息 → 0.1 小奖励 **foster refinement 能力**
- 完全无关 → 0

**消融（Table 8）**：线性组合（`R_ans + R_ret`）显著更差 → **非线性"阶梯式"优于加权求和**。

### 🧬 Delta from Search-R1

- **Search-R1**：`<think> → <search> → <documents> → <answer>`——无显式蒸馏，policy 在隐式推理里过滤 noise
- **AutoRefine**：加 `<refine>` 显式 step + dual reward 强制训练 refine 质量
- **改动最小**：保留 GRPO 算法，只加 prompt template 新 block + reward 函数变化

### 流程示例

Q (Musique): "A 和 B 在 2020 年前都发生了什么共同的事？"

- `<think>` 需要分别查 A 和 B
- `<search>` "A 2020"
- `<documents>` 3 份文档 (800 tokens)
- **`<refine>` "A 在 2019 加入 Y 公司；A 在 2020 发布 Z" (150 tokens)**
- `<search>` "B 2020"
- `<documents>` 3 份文档
- **`<refine>` "B 在 2019 加入 Y 公司；B 在 2020 收购 W" (150 tokens)**
- `<think>` 共同点：2019 同加入 Y
- `<answer>` "2019 都加入 Y 公司"

**差异点**：Search-R1 要直接从 1600 tokens docs 推答案；AutoRefine 先蒸馏到 300 tokens，推理专注核心事实。**Working memory 压力大幅下降**。

### 🧩 因果链

- **问题**：retrieval-augmented RL 训练不稳、multi-hop 准确率低
- **根因**：policy 被迫同时做 4 件事（plan + 读 noisy docs + reason + answer）→ 认知负荷过高，尤其 multi-hop 需要跨 step 跟踪多个 facts
- **解法**：显式 `<refine>` step 分离"信息蒸馏" + dual reward 专门训 refine 质量
- **效应**：3B 上 7-benchmark +6.9 平均，multi-hop +8.3~11.9（绝对），Musique 6.6→15.7 (**+138% relative**)

### ⚠️ What would break this

- **EM/F1 可能 miss semantically correct 但措辞不同答案**（作者 Limitation 1）
- **Static Wikipedia dump 2018**（Limitation 2）：时事 / 前沿研究不覆盖
- **Refine 质量取决于 policy**（推测）：训练初期 policy 差时 refine 可能丢关键信息 → 负反馈循环风险
- **计算成本增加**（推测）：每个 search 多 100-200 tokens refine → rollout 变长 15-30%
- **Retrieval reward 的 gaming**（推测）：policy 可能学会把 gold-like phrase 塞进 refine（即使 docs 没说）骗 R_ret——论文没讨论这种 hacking

## Key Results

**训练配置**
- 基座：Qwen2.5-3B-Base, Qwen2.5-3B-Instruct
- 训练数据：NQ + HotpotQA 合训 (**169,615 examples**)
- 训练方法：GRPO-based + 复合 reward, 250 steps, batch 256, G=5, LR 1e-6, KL β=0.001
- 训练资源：**8×A100-80GB**, FSDP + BFloat16

**评测 Benchmark**（三问）
- **NQ / TriviaQA / PopQA**: single-hop
- **HotpotQA / 2Wiki / Musique / Bamboogle**: multi-hop
  - 任务来源：公开学术数据集
  - 执行环境：E5-base-v2 retriever, top-3 docs, Dec 2018 Wikipedia, max 5 searches
  - 评测方式：EM

**核心结果**（Qwen2.5-3B avg EM, 7 benchmarks）

| 方法 | 平均 |
|---|---|
| Search-R1-Base | 31.2 |
| **AutoRefine-Base** | **40.5** (+9.3 绝对) |

Multi-hop 特别强：
- **2Wiki**: 39.3 vs 27.4 (**+11.9**)
- **Musique**: 15.7 vs 6.6 (**+9.1**, +138% relative)
- NQ: 46.7 vs 42.1 (+4.6)

**消融**：
| Variant | Avg |
|---|---|
| AutoRefine-Base (full) | 40.5 |
| w/o Retrieval Reward | 37.6 (-2.9) |
| w/o Retrieval Reward + w/o Refinement | 31.2 (= Search-R1) |

**结论**：refine 和 dual reward **必须合一**——单独任一组件都效果差。两者有 synergy。

## Takeaway

### 对我研究的启示

结合本 wiki 的 Agentic RL Credit Assignment 方向：

1. **分离"信息蒸馏"作为显式 step** 是个可迁移 idea：agent tool-use 时任何"raw 输入复杂"场景都可以加 refine——code review → refine diff；GUI → refine screen text；tool output → refine relevant fields
2. **非线性 reward 组合 > 线性加权**：消融证明阶梯式（答案对为主 + 次要信号当 backup）优于加权和——**reward shaping 的一个实用 heuristic**
3. **Dual reward 模式**：主 reward 定义成功 + 辅助 reward 定义"工具使用质量"——credit assignment 的工程化实现，比 IG / PRM 等 dense reward 简单但有效
4. **Multi-hop 是 refine 最受益的场景**（+11.9）——治的是"噪声文档影响长链推理"这个病；暗示 **refine 机制的收益与推理深度成正比**
5. **与 IG-Search / MR-Search 的关系**：AutoRefine 是它们的 **baseline**——证明它的改动简单有效、已成领域标准起点。后继方法（IG-Search 等）在 AutoRefine 之上加更细的 credit assignment

### 🧠 理解核验

1. 非线性 `R_overall`（stairstep）和线性 `R_ans + R_ret` 的根本差别是什么？为什么阶梯式更好？（提示：关注 R_ans>0 时的信号清晰度）
2. Refine step 在训练稳定性上扮演什么角色？为什么 w/o refine 就崩到 baseline？
3. AutoRefine 的 retrieval reward（gold answer 出现在 refine 里）会被 policy gaming 吗？怎么防？

## Open Questions

- **EM/F1 低估 semantic correctness**（Limitation 1）→ LLM-as-Judge
- **Static corpus 时效性**（Limitation 2）→ live search
- **Refine 可能被 reward hacking**（我的推测）：policy 学会把 gold-like phrase 塞进 refine 骗 R_ret
- **Refine 的上限**：refine 质量如何自己度量？当前只有"含 gold answer"这种二值检查，粒度粗
- **Research opportunities**:
  - Refine × IG-Search counterfactual：在 refine 后算 IG（真 refine vs 空 refine），更精细
  - Refine step 自身的 credit assignment：哪些 refine 步骤重要？
  - 非 search 场景迁移：code agent 的 refine，GUI agent 的 refine

## Related Wiki
- [Credit-Assignment-in-Agentic-RL](../Wiki/Credit-Assignment-in-Agentic-RL.md)
- [Turn-Level-Reward](../Wiki/Turn-Level-Reward.md)
