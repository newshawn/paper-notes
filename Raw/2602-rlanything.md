# RLAnything

- **ID**: 2602-rlanything
- **Link**: [arxiv](https://arxiv.org/pdf/2602.02488) · [code](https://github.com/Gen-Verse/Open-AgentRL) (369⭐)
- **Tags**: #credit-assignment #reward-model #self-adaptive-env #gui-agent #coding-agent

## TL;DR
用生成式 LLM 作 step-wise reward model，与 policy 联合优化 + 环境自适应调整。关键发现：**只用 step reward（不用 outcome reward）训练效果反而更好**——相当于一种无监督范式。

💡 **一句话精华**：LLM 作为生成式 step-wise RM 与 policy 联合优化——RM 从 outcome×step 一致性学习；震撼发现：只用 RM 的 step reward 反而超过用 outcome reward 训练。

## Method

### 1. Policy 的集成反馈训练
每步奖励 = outcome reward + λ × step reward 的均值：

$$R_{\tau_i} = O_\tau + \frac{\lambda}{m} \sum_{j=1}^{m} S_{\tau_i,j}$$

- $S_{\tau_i,j} \in \{-1, 1\}$：生成式 RM 对第 i 步打 m 次的打分
- −1 表示"没朝最终目标推进或出现逐步错误"

### 2. Reward Model 联合优化
RM 第 i 步的奖励信号：$R_{S\tau_i,j} = R_{\tau_i} \cdot S_{\tau_i,j}$

- R>0 且 S<0：RM 判断错了 → −1
- R<0 且 S<0：RM 预测正确（预警到最终结果差）→ +1
- 本质：衡量 RM 与最终结果的**一致性**

### 3. 环境自适应调整
准确率超阈值时，让专门的 task-adaptation LLM（Qwen3-4B）改任务难度。改之前用 RM 的"错误模式摘要"指导——知道错在哪才能有针对性调整。

### 不同场景的 RM 实现

- **GUI Agent**（Qwen3-VL-8B-Thinking）：给前序动作摘要 + 最近 2 张图 + 待评估动作，输出 ±1
- **LLM Agent / AlfWorld**（Qwen2.5-14B-Instruct）：给前序动作摘要 + 观察结果，输出 ±1
- **Coding LLM**：coding 是单轮，RM 角色变为**生成单元测试**。能让错误代码失败的 UT 得正奖励

### 🧬 Delta from 传统 PRM

- **传统 PRM**：需要独立训练 reward head + 大量人工标注 step-level 标签；RM 固定不动易漂移
- **RLAnything**：**生成式 LLM 作 RM**（Qwen3-VL / Qwen2.5-14B）输出 ±1 → 无需单独 reward head；**RM 与 policy 联合优化**（R×S 一致性信号）→ 不会漂移；coding 单轮场景把 RM 任务从"打分"换成"生成 UT"

### 🧩 因果链

- **问题**：Agentic RL 需要 step reward 但人工 PRM 标注昂贵且难规模化
- **根因**：外部 RM 训练维护难；固定 RM 与 policy 分布漂移后失效
- **解法**：LLM-as-generative-RM（直接输出 ±1）+ RM 通过 outcome×step 一致性奖励信号（$R_{\tau_i} \cdot S_{\tau_i,j}$）联合优化
- **效应**：OSWorld / AlfWorld / CodeContests 上，**只用 step reward 训练 > 加 outcome reward 训练**——证明 RM 足够好时 outcome 变冗余

### ⚠️ What would break this

- **±1 离散过于粗**：无法区分"稍错"和"严重错"；连续 [-1, 1] 可能更优但未尝试
- **RM ↔ policy 联合优化退化解**：互相适应到对方的 bias → 双方看起来都对但都偏，论文未讨论此风险
- **Open-ended 任务冷启动**：没有 outcome reward 时 RM 怎么初始化？论文依赖有 outcome 的场景作 bootstrap
- **RM 生成 UT 的覆盖性**：coding 场景下 UT 可能覆盖不全关键 corner case → policy 学到 overfit UT 的代码 (推测)

## Key Results

**Surprising finding**：只用 step-wise reward（红线），**超越** step-wise + outcome reward（蓝线）的组合。证明 RM 足够好时可完全抛弃外部 outcome reward，朝真正的"自演化 agent"迈进。

Benchmarks：OSWorld、AlfWorld、CodeContests，分 in-domain / out-of-domain。

## Takeaway

1. **生成式 RM 的潜力**：用 LLM 作为 step-wise judge 比训练独立 PRM 简单且通用
2. **RM 联合优化很关键**：固定 RM 会漂移，让 RM 从 outcome × step 的一致性中学习是 tractable 的
3. **coding 场景的 UT 思路很漂亮**：对没有中间步骤的任务，把"RM 生成 UT"作为等价替代——UT 的区分力 = RM 的区分力
4. **"自演化"方向**：环境自适应是突破 benchmark 饱和的关键

### 🧠 理解核验

1. RM 如何通过 $R_{\tau_i} \cdot S_{\tau_i,j}$ 一致性被训练？写出具体 case 分析（R>0/S<0 等四种情况）
2. 为什么只用 step reward（红线）会比 step+outcome（蓝线）更好？直觉 + 可能的理论解释
3. Coding 场景为什么 RM 角色要变成"生成 UT"而非"直接给代码打分"？RM-as-UT-generator 的区分力从哪里来？

## Open Questions

- 生成式 RM 的 ±1 离散输出是否过于粗粒度？连续分数会不会更好？
- RM 联合优化的收敛性？会不会 policy 和 RM 一起漂移到退化解？
- 在 open-ended 任务（无 outcome reward）时，RM 怎么冷启动？

## Related Wiki
- [Credit-Assignment-in-Agentic-RL](../Wiki/Credit-Assignment-in-Agentic-RL.md)
- [Generative-Reward-Model](../Wiki/Generative-Reward-Model.md)
- [Self-Evolving-Environment](../Wiki/Self-Evolving-Environment.md)
