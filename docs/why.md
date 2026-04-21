# 为什么这样设计

> 从 [README.md](../README.md) 搬过来的叙事内容——讲动机、原则、和一个端到端的例子。如果你只想上手用，看 README 就够了；这里解释"为什么值得这样折腾"。

## 在解决什么问题

你是研究生 / 算法工程师，每周读几篇 arxiv。典型痛点：

- 📖 **读完就忘**：看过的论文回头要用某个数字或方法细节，翻半小时找不到
- 🧩 **笔记是孤岛**：10 篇论文 = 10 个独立文档，谁和谁矛盾、谁是谁的改进，全靠大脑硬记
- 🤔 **不知道真懂没**：当时以为明白了，下次写论文 related work 还得重读
- 📈 **越积越乱**：笔记越多，搜索越低效，最后变成"只进不出"的垃圾桶

**LLM Wiki 的思路**（来自 [Karpathy 2026 年 4 月的 gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)）：
让 LLM 帮你维护一个**自整合的知识库**。每加一篇新论文，它自动去更新相关概念页、标出矛盾、补齐演进链。**相当于你雇了个全职科研助理在后台持续整理**——你只负责读和审阅。

## 为什么比普通笔记强

| 普通笔记 | LLM Wiki |
|---|---|
| 每篇独立文件 → 关联全靠记忆 | 每加一篇自动更新所有相关概念页 |
| 只"记录"，没"整合" | Wiki/ 是跨论文的**当前最佳理解** |
| 矛盾靠脑补 / 写不出来就丢失 | Contradictions section 明确保留，不覆盖 |
| 时间越长越乱 | Schema + Tag vocabulary 约束防止退化 |
| 不确定自己是否真懂 | 🧠 理解核验的 3 问题强制自测 |
| 难分享 / 难版本管理 | GitHub 公开可见，git 可追溯 |

## 为什么分两阶段（ingest / compile）

很多人觉得"Claude 读完直接更新 Wiki 不就完了？"——这样有两个问题：

- **Wiki 是累积型数据**：错误一旦进去会**永久污染**之后的 claim 引用链
- **你需要审阅窗口**：Claude 的理解偶尔会偏，你扫一眼 Raw 就能发现

所以设计是：**ingest 只动 Raw → 你审阅 → 你说 compile → 才动 Wiki**。审阅权交给你。

## 为什么是"理解型元素"而不是"查阅型 section"

早期考虑过加 `🔑 术语表` / `📚 相关文献` / `⚙️ 复现难度`——**后来砍掉了**：
- 这些是**查阅**（reference lookup），不帮助理解
- 真正让你深入的是 5 个问题：
  - 💡 **一句话精华**：能把全文压到 140 字就说明真懂
  - 🧬 **Delta**：vs 最接近的前作到底改了哪行？
  - 🧩 **因果链**：问题 → 根因 → 解法 → 效应（拆到机制层）
  - ⚠️ **What-breaks**：什么情况下这方法会失效？
  - 🧠 **自测**：3 个问题，答不上就知道回哪段重读

前者让你"查到"，后者让你"真懂"。尤其对 credit assignment 这种**小改动堆积**的领域（ARPO → AEPO → AT²PO → SALT），🧬 Delta 就是演进链的钥匙——不看 Delta 等于没看懂这篇。

## 一个端到端的例子

**Scenario**：今天你刷 arxiv 看到一篇叫 "XYZ" 的新论文，做 entropy-based branching 的改进。

**第一步**（30 秒操作）：
```
/paper-notes:ingest https://arxiv.org/abs/XXXX
```

2-5 分钟后，你拿到：
- `Raw/2604-xyz.md` — 结构化笔记
- 🧬 **Delta from ARPO** 告诉你："XYZ 和 ARPO 唯一的差别是把固定 τ 阈值换成自适应"
- 🧠 **理解核验** 给你 3 个问题供未来自测

**第二步**（2 分钟审阅）：扫一眼觉得分析准确，运行：
```
/paper-notes:compile
```

1-2 分钟后，Claude 完成：
- `Wiki/Entropy-Guided-Exploration.md` 新增 `[2604-xyz] 自适应 τ 解决 ARPO entropy collapse`
- `Wiki/Credit-Assignment-in-Agentic-RL.md` 的路线对比表加 XYZ 到 entropy 路线

**三个月后**，你要写一篇综述的 related work：
```
/paper-notes:query "entropy-based branching 的演进"
```

Claude 几秒内答：
> "这方向演进链：**ARPO** ([2507] 固定 τ) → **AEPO** ([2510] 加 branching penalty) → **XYZ** ([2604] 自适应 τ) → **AT²PO** ([2601] 三阶段 turn 对齐)..."

**你不用翻任何一篇论文**——Claude 在 ingest 时已经把这些演进关系分析过一遍存进 Wiki 了。
