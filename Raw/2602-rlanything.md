# RLAnything

- **ID**: 2602-rlanything
- **Link**: [arxiv](https://arxiv.org/pdf/2602.02488) · [code](https://github.com/Gen-Verse/Open-AgentRL) (369⭐)
- **Tags**: #credit-assignment #reward-model #self-adaptive-env #gui-agent #coding-agent

## TL;DR
用生成式 LLM 作 step-wise reward model，与 policy 联合优化 + 环境自适应调整。关键发现：**只用 step reward（不用 outcome reward）训练效果反而更好**——相当于一种无监督范式。

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

## Key Results

**Surprising finding**：只用 step-wise reward（红线），**超越** step-wise + outcome reward（蓝线）的组合。证明 RM 足够好时可完全抛弃外部 outcome reward，朝真正的"自演化 agent"迈进。

Benchmarks：OSWorld、AlfWorld、CodeContests，分 in-domain / out-of-domain。

## Takeaway

1. **生成式 RM 的潜力**：用 LLM 作为 step-wise judge 比训练独立 PRM 简单且通用
2. **RM 联合优化很关键**：固定 RM 会漂移，让 RM 从 outcome × step 的一致性中学习是 tractable 的
3. **coding 场景的 UT 思路很漂亮**：对没有中间步骤的任务，把"RM 生成 UT"作为等价替代——UT 的区分力 = RM 的区分力
4. **"自演化"方向**：环境自适应是突破 benchmark 饱和的关键

## Open Questions

- 生成式 RM 的 ±1 离散输出是否过于粗粒度？连续分数会不会更好？
- RM 联合优化的收敛性？会不会 policy 和 RM 一起漂移到退化解？
- 在 open-ended 任务（无 outcome reward）时，RM 怎么冷启动？

## Related Wiki
- [[Credit-Assignment-in-Agentic-RL]]
- [[Generative-Reward-Model]]
- [[Self-Evolving-Environment]]
