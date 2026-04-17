# Credit Assignment in Agentic RL

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

## 主要路线

### 1. 带 Reward Model

| 方法 | 信号来源 | 特点 |
|---|---|---|
| RLAnything [2602-rlanything] | 生成式 LLM 作 step-wise RM | RM 与 policy 联合优化；只用 step reward 甚至超越 outcome reward |

### 2. 无 Reward Model

#### 2a. 基于 Return 回传

| 方法 | 核心机制 |
|---|---|
| GiGPO [2505-gigpo] | 在相同状态 s 下收集不同 a 的最终 R，做 step-level advantage |
| TreeGRPO [2509-treegrpo] | 随机选节点展开，构建树状采样 |
| AT2PO [2601-at2po] | Entropy-guided 树扩展 + turn-wise value 递归回传 + turn-level IS+clip |

#### 2b. 基于 Entropy

| 方法 | 核心机制 |
|---|---|
| ARPO [2507-arpo] | Tool call 后 entropy 升高时触发 branching；共享前缀 token 共享 advantage |
| AEPO [2510-aepo] | Adaptive 采样预算（全局 vs 分支）+ branching penalty + 高熵梯度保留 |
| EMPG [2509-empg] | Step-level entropy 调节梯度幅度 + future clarity bonus |

#### 2c. 基于 Information Gain

| 方法 | 核心机制 |
|---|---|
| IGPO [2510-igpo] | Turn 结束后 policy 生成 GT 答案概率的增量作为 dense reward |

#### 2d. 基于 Bipartite Matching

| 方法 | 核心机制 |
|---|---|
| MatchTIR [2601-matchtir] | 预测 turn ↔ golden trace 二部图匹配；KM（硬）或 OT（软）派生 turn reward |

## Key Claims（跨论文）

- [2602-rlanything] 只用 step reward（不用 outcome）训练效果反而更好 → 有监督 RM 本身可能足以定义任务
- [2510-igpo] IG reward 永远非零，直接消除 GRPO 的 advantage collapse
- [2510-igpo] **3B 小模型从 dense reward 获益最大**（+15.3 vs 7B 的 +6.8），说明小模型更依赖 credit assignment
- [2507-arpo][2510-aepo] Tool call 后的前 10-50 个 token entropy 明显升高，是天然的 branching 触发点
- [2509-empg] Softmax policy gradient 的 gradient norm 与 entropy 单调耦合：confident step 学不够快、uncertain step 不稳定
- [2601-at2po] Token-level IS 方差大、sequence-level 粒度过粗 → **turn-level IS** 是正确的折中

## Contradictions / Open Questions

1. **Entropy 是好信号还是噪声？**
   - ARPO/AEPO：高 entropy = 值得探索的关键决策点
   - 反面可能：高 entropy 也可能是 policy 本身跑偏或 tool output 噪声大
   - 开放问题：如何区分 "informative uncertainty" vs "random noise"？

2. **自己评自己的合法性？**
   - IGPO 用 policy 自己算 P(a|context) 作 reward
   - 担忧：如果 policy 跑偏，IG 信号是否自欺欺人？
   - 反论：RLAnything 的 RM 与 policy 联合优化似乎工作得很好——也许"自监督闭环"比想象的稳定

3. **Γ 衰减策略**
   - IGPO 默认 γ=1；GiGPO 使用 γ<1
   - 长轨迹（AlfWorld 60 步）下 γ=1 是否让早期步骤信号被过度放大？
   - 未系统研究

4. **无 ground truth 怎么办？**
   - 当前方法多数依赖 answer 可验证（QA、coding pass-rate）
   - Open-ended 任务（creative writing、long-form reasoning）的 credit assignment 仍空白

## 可深入的方向

1. **IG + self-consistency**：无 GT 时用多次采样一致性作为 IG 代理
2. **非 QA 迁移**：coding 用 pass-rate 概率、tool-use 用"工具返回有效"概率
3. **Entropy + IG 组合**：entropy 做 branching trigger，IG 做 credit，二者正交
4. **小模型专属 credit assignment**：IGPO 的 +15.3 暗示小模型有独特需求

## Related

- [[Turn-Level-Reward]]
- [[Entropy-Guided-Exploration]]
- [[Advantage-Collapse]]
- [[Generative-Reward-Model]]
- [[Importance-Sampling-Granularity]]
