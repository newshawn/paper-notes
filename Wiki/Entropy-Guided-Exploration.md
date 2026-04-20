# Entropy-Guided Exploration

[coverage: high]
[last-updated: 2026-04-20]

## Definition

用 policy 的 token / step entropy 作为**信号**，决定何时探索（采样更多分支）、如何更新（梯度缩放）、以及哪些状态值得深入。核心假设：**高 entropy 位置 = 信息量大 / 结果对最终 reward 敏感 / 值得多采样对比**。

## 核心观察（跨论文共识）

- **[2507-arpo](../Raw/2507-arpo.md)** Tool call 返回后的前 10-50 个 token entropy 明显升高——这是天然的 branching trigger
- **[2509-empg](../Raw/2509-empg.md)** Softmax policy gradient 的 norm 与 entropy 单调耦合：$\mathbb{E}[\|\nabla \log \pi\|^2] = 1 - \exp(-H_2(\pi))$ → 高熵 token 梯度天然大，会被 clip 截断
- **[2510-aepo](../Raw/2510-aepo.md)** GRPO 的 clip 项使高熵 token 梯度为 0：高熵 → $\delta = \pi/\pi_{old}$ 偏大 → 超出 clip 区间 → 梯度消失
- **[2604-eapo](../Raw/2604-eapo.md)** Softmax gradient 的 $\nabla_{z_v} L \propto (1-\pi_{o_t})$ 让高熵 token 天然承载更多信号；Four Quadrant 实证 PHR (positive high-entropy) 是 reasoning improvement 主引擎，PLR 需 **5.5× 步数**达同 accuracy

## 用法 1：Entropy 作为 Branching Trigger

### [2507-arpo](../Raw/2507-arpo.md) 的做法
$$P_t = \alpha + \beta \cdot \Delta H_t$$
$P_t > \tau$ 时从当前节点 branch 出 Z 条新 partial trajectory。共享前缀 token 自动共享 advantage（因为 $\delta$ 在共享段相等，GRPO 自然让其 advantage 趋近均值）。

### [2601-at2po](../Raw/2601-at2po.md) 的改进
用 entropy **排名** 而非阈值：选 Top-K 高熵节点展开。更稳定，不用调 τ。

### [2510-aepo](../Raw/2510-aepo.md) 的修正
加 **branching penalty**：

$$P_t = (\alpha + \gamma \Delta H_t)(1 - \hat{P}(l))$$

$l$ 为此前连续高熵分支的数量，越长越罚——防止"过度分支"导致资源集中在单一链条。

## 用法 2：Entropy 作为 Sampling Budget 调节

### [2510-aepo](../Raw/2510-aepo.md) Entropy Pre-Monitoring

预生成 1 条轨迹，比较**问题初始熵 vs 工具调用平均熵**：

| 关系 | 含义 | 策略 |
|---|---|---|
| $H_{\text{root}} > H_{\text{tool}}^{\text{avg}}$ | 问题方向本身模糊 | 增加 $m$（全局采样）多探不同大方向 |
| $H_{\text{root}} < H_{\text{tool}}^{\text{avg}}$ | 工具反馈不确定更高 | 减小 $m$，把预算倾斜到分支采样局部深入 |

$m = k \cdot \sigma(\beta (H_{\text{root}} - H_{\text{tool}}^{\text{avg}}))$

## 用法 3：Entropy 作为梯度调节器

### [2509-empg](../Raw/2509-empg.md) Self-Calibrating Gradient Scaling

逆向思路——**降权**高熵 step：

$$g(H_t) = \frac{\exp(-k \cdot H_{\text{norm},t})}{\frac{1}{N}\sum \exp(-k \cdot H_{\text{norm}})}$$

- Confident step → $g > 1$（放大）
- Uncertain step → $g < 1$（衰减）
- 均值归一化保持总 signal 量不变

**为什么降权高熵？** 按 Proposition 1，高熵 token 梯度已经很大，再放大会不稳定；低熵 confident correct step 需要放大才学得快。

### [2510-aepo](../Raw/2510-aepo.md) 高熵梯度保留

对立思路——**保留**高熵梯度。改写 clip：

$$\frac{1 + \epsilon}{\text{sg}(\delta)} \cdot \delta \cdot \tilde{A}$$

用 stop-gradient 让梯度**不消失**，只限制更新幅度。

## 用法 4：Entropy 作为 Future Reward Shaping

### [2509-empg](../Raw/2509-empg.md) Future Clarity Bonus

$$\zeta \cdot \exp(-k' \cdot H_{\text{norm}, t+1})$$

下一步 entropy 低 → 上一步获得 bonus。本质是 reward shaping：奖励"导向可预测状态"的 action。

### [2601-at2po](../Raw/2601-at2po.md) Value 聚合中的 entropy 加权

Tree credit assignment 时子节点 value 按 entropy 加权而非均值：

$$V_n = \sum_c w_c V_c, \quad w_c = \frac{H(c)}{\sum_{c'} H(c')}$$

## 用法 5：Entropy 作为 Token-Level Advantage 调制器

### [2604-eapo](../Raw/2604-eapo.md) EAPO: Four Quadrant Decomposition + 按 entropy re-weight

$$\hat{A}^{CA}_{i,t} = \hat{A}_{i,t} + \alpha \cdot \text{sign}(\hat{A}_{i,t}) \cdot \text{detach}(\hat{A}^H_{i,t})$$

**Four Quadrant**（polarity × entropy 2×2 分析框架）：
- **PHR** (Positive High-entropy)：**主引擎**——reinforce 不确定成功，能 generalize beyond rollouts
- **PLR** (Positive Low-entropy)：需 5.5× 步数达同 accuracy，diversity 低 12%
- **NHR** (Negative High-entropy)：1.5× 快收敛
- **NLR** (Negative Low-entropy)：早期帮助但快速 saturate

**核心直觉**：RLVR 均分 advantage 抹平了 softmax gradient 的天然偏好（`∇ ∝ (1-π)` 让高熵 token 承载更多信号）——EAPO 显式恢复。

**α=0.2, φ=2；detach() 避免 entropy 项回传梯度（防 reward hacking）**；sign() 保持与 reward polarity 同向。

## 核心矛盾：方向相反的做法

| 视角 | 高 entropy → ... |
|---|---|
| [2507-arpo](../Raw/2507-arpo.md) / [2510-aepo](../Raw/2510-aepo.md) 采样阶段 | **多采**（值得探索） |
| [2510-aepo](../Raw/2510-aepo.md) 梯度阶段 | **保留梯度**（别让它消失） |
| [2509-empg](../Raw/2509-empg.md) 梯度阶段 | **降权梯度**（别让它主导） |
| [2604-eapo](../Raw/2604-eapo.md) advantage 阶段 | **放大 \|Ã\|**（承载更多 reward 信号） |

**可能的调和**：
- "采样时" 和 "更新时" 的 entropy 含义不同
- 采样阶段：entropy 反映 "这个决策点对最终 reward 敏感" → 多采合理
- 更新阶段：entropy 反映 "policy 不确定" → 该不该大步更新取决于 advantage 信号是否可靠——如果信号可靠（dense reward），保留梯度；如果信号粗糙（sparse outcome），降权避免方向漂移

**开放问题**：有没有统一框架同时包含采样阶段放大 + 更新阶段调节？

## 潜在陷阱

- **Entropy 可能是噪声**：tool output 文本格式混乱 → entropy 高但不是 informative → 分支浪费
- **Entropy 阈值跨模型不通用**：7B 和 32B 的 entropy 分布尺度不同
- **连续高熵区域**：ARPO 容易过度分支 → AEPO 的 penalty 是必需修正
- **Entropy collapse**：RL 训练中 policy 越学越 confident → entropy 越来越低 → 后期触发 branching 的阈值自动失效
- **超参数组合爆炸**（来自 retrofit 审视）：[2510-aepo](../Raw/2510-aepo.md) 引入 α/β/γ/k/ε 五个，[2509-empg](../Raw/2509-empg.md) 的 k/k' 也难调——entropy-based 方法普遍需要任务专属调参，泛化成本高
- **"Turn" 粒度对非 QA 任务不清晰**：[2601-at2po](../Raw/2601-at2po.md) entropy-guided tree expansion 在 QA 有天然 turn 边界，但 GUI / embodied 任务的 turn 定义模糊，entropy 该在哪个粒度算？

## 可深入的方向

1. **Entropy 的分层拆解**：区分 "模型内部不确定" vs "环境反馈模糊"，可能需要两个独立信号
2. **Entropy 自适应阈值**：随训练进度动态调整 τ，避免 collapse
3. **组合 EMPG 降权 × AEPO 保留**：看起来矛盾，但可能在不同 advantage sign 下组合有意义
4. **Entropy 跨 turn 的依赖建模**：连续高熵的 penalty 还是 bonus？目前两派都有
5. **EMPG 降权 vs EAPO 放大：为何都对？**（新矛盾）——EMPG 对 step-level **梯度**降权高熵，EAPO 对 token-level **advantage** 放大高熵。可能解释：二者操作的是不同量（梯度 vs advantage），不冲突——但值得统一理论 framework
6. **Four Quadrant 分析法迁移** [2604-eapo](../Raw/2604-eapo.md)：polarity × entropy 2×2 能否扩展到 step / turn 粒度？识别不同贡献模式

## Related

- [Credit-Assignment-in-Agentic-RL](Credit-Assignment-in-Agentic-RL.md)
- [Tree-Based-Rollout](Tree-Based-Rollout.md)（待建）
- [Importance-Sampling-Granularity](Importance-Sampling-Granularity.md)（待建）
- [Advantage-Collapse](Advantage-Collapse.md)（待建）
