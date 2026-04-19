# GiGPO: Group-in-Group Policy Optimization

- **ID**: 2505-gigpo
- **Venue**: NeurIPS 2025
- **Link**: [arxiv](https://arxiv.org/pdf/2505.10978) · [code](https://github.com/langfengQ/verl-agent) (1.7k⭐) · [知乎](https://zhuanlan.zhihu.com/p/1908655294793364575)
- **Tags**: #credit-assignment #step-wise-reward #same-state-grouping #no-reward-model

## TL;DR

在 GRPO 基础上叠加 step-wise reward。核心 trick：**不同轨迹如果经过同一个环境状态 $\tilde{s}$，就把这些 (action, return) 对聚成一个 step-level group**——在同状态下看谁的 action 带来更高最终 reward。只用 outcome return 回传，无需 reward model。

💡 **一句话精华**：给 GRPO 外挂 step-level advantage——跨轨迹在相同状态下对比 (action, return) 聚类，从现有 rollout 零成本榨取更细粒度信号。

## Method

### 两层 advantage

1. **Trajectory-level**（照搬 GRPO）：整条轨迹一个 reward

2. **Step-level**（新增）：
   - 所有 trajectory 从同一初始状态出发，很可能在某些时刻撞上同一状态 $\tilde{s}$（同一网页、同一房间）
   - 收集所有经过 $\tilde{s}$ 的 (action, return) 对：

$$G^S(\tilde{s}) = \{(a_t^{(i)}, r_t^{(i)}) \mid s_t^{(i)} = \tilde{s}\}$$

   - 折扣累计 return：

$$R_t^{(i)} = \sum_{k=t}^{T} \gamma^{k-t} r_k^{(i)}$$

   - 在此 group 内做标准化，得到 step-level advantage

3. **最终 advantage** = 加权相加两个 A

### 稀疏奖励下的具体形式

- $r_t = 0$ 当 $t < T$
- $r_T = R$（最终 binary 0/1）
- 所以 $R_t = \gamma^{T-t} \cdot R$——step-level advantage 本质上是"离终点越近、最终结果越好的 step 得分越高"

### 🧬 Delta from GRPO

- **GRPO**：整条轨迹共享一个 reward，step-level 无信号
- **GiGPO**：**加一层** step-level advantage via 同状态聚类——目标函数不变、无 RM、无额外采样，只在 advantage 计算阶段多挖一个信号源

### 🧩 因果链

- **问题**：GRPO 的 trajectory-level 粒度太粗，好坏 action 在同一轨迹里被混淆
- **根因**：trajectory reward 对单个 action 的贡献度无法区分
- **解法**：在相同状态 $\tilde{s}$ 下收集不同轨迹的 (action, return) 对，构造 step-level group 做对比
- **效应**：ALFWorld / WebShop 超 GRPO；Search-QA 超 Search-R1（1.5B / 7B 都成立）

### ⚠️ What would break this

- **连续状态空间**（机器人控制）：状态无法 hash，同状态聚类失效
- **长轨迹下同状态概率低**：group 只有 1-2 样本 → std 失真 → advantage 噪声
- **状态等价性模糊**：同 HTML 但不同 viewport / scroll 位置算一个状态吗？论文未细说 (推测)

## Key Results

- 基座：Qwen2.5-1.5B / 3B / 7B-Instruct
- Benchmark：ALFWorld、WebShop、Search-QA（NQ + HotpotQA）
- 训练资源：1.5B → 2×H100；7B → 4-8×H100；150-200 iter
- **ALFWorld / WebShop > GRPO**；**Search-QA > Search-R1**

## Takeaway

1. **"同状态聚类"是便宜又有效的 trick**：不需要 RM、不需要额外采样，只用 state hash + 现有轨迹就能构造对照组
2. **前提依赖**：环境状态可识别（文字环境、网页、文件系统都行）。连续状态空间（机器人控制）难以直接应用
3. **与 tree rollout 的关系**：GiGPO 的 "同状态聚类" 是 **TreeGRPO 的隐式版本**——没有显式树结构，但也在复用前缀

### 🧠 理解核验

1. "同状态" 如何定义？字符串完全相同 vs embedding 相似，对 signal 质量各有什么代价？
2. 当某个 $\tilde{s}$ 的 group 只有 1 条样本时，step-level advantage 如何计算？会发生什么？
3. GiGPO 的 step-level 信号与 TreeGRPO 的 inter-tree advantage 本质是否一样？差别在哪？

## Open Questions

- 状态相等性（equality）的定义？字符串完全相同，还是 embedding 相似？
- 长轨迹下同状态可能罕见，group 不成立时如何处理？
- 折扣 γ 设置（论文未详细消融）

## Superseded by
- [2601-at2po] 显式树结构 + turn-level IS，更 principled

## Related Wiki
- [[Credit-Assignment-in-Agentic-RL]]
- [[Tree-Based-Rollout]]
