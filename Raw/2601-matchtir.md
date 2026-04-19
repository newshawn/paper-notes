# MatchTIR: Fine-Grained Supervision for Tool-Integrated Reasoning via Bipartite Matching

- **ID**: 2601-matchtir
- **Link**: [arxiv](https://arxiv.org/pdf/2601.10712) · [code](https://github.com/quchangle1/MatchTIR)
- **Tags**: #credit-assignment #bipartite-matching #tool-integrated-reasoning #ground-truth-trace

## TL;DR

把 multi-turn TIR 的 credit assignment 显式建模为**二部图最优匹配**：预测 turn ↔ golden trace step。用 **KM 算法（硬匹配）** 或 **Optimal Transport（软匹配）** 派生 dense turn-level reward，再与 trajectory-level 信号做双层 advantage。依赖 ground-truth trace，在 FTRL / BFCL / ToolHop 上全面优于 trajectory-level baseline。

💡 **一句话精华**：predicted turn ↔ golden trace 二部图最优匹配（KM 硬 / OT 软）派生 dense turn reward + dual-level advantage——强制 1-1 对应防止 policy 用相似工具 gaming 相似度分数。

## Method

### 构建 similarity matrix $S$

$S_{i,j}$ = predicted tool call $p_i$ 与 golden $g_j$ 的综合相似度，三维度加权：
- **Tool Name**：函数名匹配
- **Param Name**：参数名集合 overlap
- **Param Content**：参数值内容相似度

### 两种分配策略

**Hard (KM，Kuhn-Munkres 匈牙利算法)**：
每个预测 turn 唯一映射到最佳 golden step。0/1 或连续匹配分作为 turn reward。

**Soft (OT，Sinkhorn)**：
允许一个 predicted turn 部分对应多个 golden step。步骤：

1. 成本矩阵 $C_{ij} = -S_{ij}$
2. 求最优传输计划：

$$\min_Z \sum_{i,j} Z_{ij} C_{ij}, \quad Z\mathbf{1}_n = a,\ Z^T \mathbf{1}_m = b$$

3. 预测 $p_i$ 的奖励：

$$r_{p_i} = \sum_j Z_{ij} \cdot S_{ij}$$

### Dual-level Advantage

$$A = \alpha \cdot A_{\text{turn}} + (1-\alpha) \cdot A_{\text{trajectory}}$$

平衡局部 step 精度和全局任务成功，防止 step reward 过度优化导致整体失败。

### 为什么需要 KM/OT 而不是直接用 $S$？

直接用相似度分数会被**滥用**——policy 反复调用相似工具来累积高分。匹配策略强制"一个 golden tool call 只能对应一个 predicted"，防止这种 gaming。

### 🧬 Delta from GRPO

- **GRPO**：trajectory-level advantage，好坏 tool-call 不分
- **MatchTIR**：**turn-level via bipartite matching**——三维相似度（name / param / content）+ KM 或 OT 分配（强制 1-1 或软 1-多）+ dual-level advantage（turn + trajectory 加权）

### 🧩 因果链

- **问题**：trajectory-level RL 不分好坏 tool-call；但直接用相似度会被 gaming
- **根因**：(1) 共享 advantage 无法定位到 step；(2) 无约束的 reward 鼓励 policy 调相似工具累积
- **解法**：构建 $S_{i,j}$ 三维相似度矩阵 → KM/OT 强制对齐约束（每个 golden step 只能对应一个 predicted）→ turn reward；加 dual-level 加权平衡局部 / 全局
- **效应**：FTRL / BFCL / ToolHop 全面超 trajectory baseline；Qwen3-4B 在长程 multi-turn 打败多数 8B 级别竞争者

### ⚠️ What would break this

- **强依赖 golden trace**：开放场景（WebArena、GAIA）无结构化标答 → 直接无法用
- **早期 policy 差时 OT 计划误导**：训练初期 predicted 轨迹都很差，OT 优化出的匹配可能把 credit 分错
- **三维相似度权重需调**：name / param / content 各占多少，论文未系统消融

## Key Results

- Benchmark：FTRL（in-domain）、BFCL、ToolHop（out-of-domain）
- Qwen3-4B 版本在长程 multi-turn 任务上击败多数 8B 量级竞争者

## Takeaway

1. **二部图匹配是干净的 credit 分配工具**——解决"哪个 predicted turn 对应哪个 golden step"这个根本模糊性
2. **OT 比 KM 更平滑**：软匹配的训练信号更稳定
3. **多维度相似度拆解（name / param / content）** 值得借鉴——单一 embedding 相似度容易被钻空子

### 🧠 理解核验

1. 为什么直接用 $S_{i,j}$ 作 reward 会被 gaming？gaming 的具体形式是什么？
2. KM（硬匹配）和 OT（软匹配）在训练稳定性和最终性能上的权衡点在哪？
3. 无 golden trace 场景（如 WebArena）怎么改造出自监督变体？best-of-N 作匹配目标的具体算法是什么？

## Open Questions

1. **依赖 golden trace**：开放场景（WebArena / GAIA）无结构化标准答案时难用
2. **可深入方向**：无 GT trace 时的自监督变体——**用 best-of-N rollout 的最优 trajectory 作为匹配目标**，实现 self-play credit assignment
3. OT 的传输计划 $Z$ 在训练早期（policy 差）是否会误导？
4. 三个维度的加权如何调？

## Related Wiki
- [[Credit-Assignment-in-Agentic-RL]]
- [[Turn-Level-Reward]]
