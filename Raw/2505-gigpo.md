# GiGPO: Group-in-Group Policy Optimization

- **ID**: 2505-gigpo
- **Venue**: NeurIPS 2025
- **Link**: [arxiv](https://arxiv.org/pdf/2505.10978) · [code](https://github.com/langfengQ/verl-agent) (1.7k⭐) · [知乎](https://zhuanlan.zhihu.com/p/1908655294793364575)
- **Tags**: #credit-assignment #step-wise-reward #same-state-grouping #no-reward-model

## TL;DR

在 GRPO 基础上叠加 step-wise reward。核心 trick：**不同轨迹如果经过同一个环境状态 $\tilde{s}$，就把这些 (action, return) 对聚成一个 step-level group**——在同状态下看谁的 action 带来更高最终 reward。只用 outcome return 回传，无需 reward model。

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

## Key Results

- 基座：Qwen2.5-1.5B / 3B / 7B-Instruct
- Benchmark：ALFWorld、WebShop、Search-QA（NQ + HotpotQA）
- 训练资源：1.5B → 2×H100；7B → 4-8×H100；150-200 iter
- **ALFWorld / WebShop > GRPO**；**Search-QA > Search-R1**

## Takeaway

1. **"同状态聚类"是便宜又有效的 trick**：不需要 RM、不需要额外采样，只用 state hash + 现有轨迹就能构造对照组
2. **前提依赖**：环境状态可识别（文字环境、网页、文件系统都行）。连续状态空间（机器人控制）难以直接应用
3. **与 tree rollout 的关系**：GiGPO 的 "同状态聚类" 是 **TreeGRPO 的隐式版本**——没有显式树结构，但也在复用前缀

## Open Questions

- 状态相等性（equality）的定义？字符串完全相同，还是 embedding 相似？
- 长轨迹下同状态可能罕见，group 不成立时如何处理？
- 折扣 γ 设置（论文未详细消融）

## Superseded by
- [2601-at2po] 显式树结构 + turn-level IS，更 principled

## Related Wiki
- [[Credit-Assignment-in-Agentic-RL]]
- [[Tree-Based-Rollout]]
