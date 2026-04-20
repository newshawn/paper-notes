# Schema

> 本文件定义 PaperNotes 知识库的覆盖范围、结构约定和维护规则。
> 所有 Wiki 整合决策以本文件为准。

> **📝 模板说明**
> 这是一份空 schema 模板，给想用 paper-notes 模式做自己领域的人使用。
> 用法：`cp docs/schema-template.md schema.md`，然后填写标了 `[🔴 你的领域定制]` 的 section。`[🟢 通用 · 照搬]` 的 section 建议保持原样。
> 填完后删除本说明段落。

## 研究方向 `[🔴 你的领域定制]`

### 主方向：<填你的领域，例如 "LLM Safety 中的 Jailbreak Defense" / "CV 中的 Video Generation 一致性" / "肠道菌群与免疫调节">

<用一段话说明：这个领域在解决什么问题？为什么重要？你个人关注的核心问题是什么？>

**核心信念**：<这个领域里你认为"应该"怎么做、或现状哪里不对？一句话立场。>

### 关注的子问题

1. **<子问题 1>**：<描述>
2. **<子问题 2>**：<描述>
3. **<子问题 3>**：<描述>

### 关键问题清单

- <开放问题 1>
- <开放问题 2>
- <开放问题 3>
- ...

<建议：写 3-8 个你会反复回到的具体问题。Ingest 论文时用这些问题过滤"这篇是否对我有用"。>

## 目录结构 `[🟢 通用 · 照搬]`

```
Raw/           原始论文 takeaway 笔记（append-only，永不修改）
Wiki/          AI 维护的概念页（会被新论文改写）
attachments/   图片、图表
index.md       wiki 目录（按类别组织的 catalog）
log.md         append-only 时间线（每次 ingest / compile 记录）
schema.md      本文件
README.md
```

## 两阶段 Ingest 工作流 `[🟢 通用 · 照搬]`

**Stage 1: Ingest（自动）**
- 用户给论文（arxiv / PDF / 用户笔记）
- Claude 生成 `Raw/<YYMM-shortname>.md`
- Claude 在 `log.md` append 一条 ingest 记录
- **Wiki 不立即更新**——给用户审阅 Raw 的窗口

**Stage 2: Compile（用户触发）**
- 用户说 "compile" 或 "更新 Wiki"
- Claude 读 `log.md` 找出 uncompiled Raw
- 扫描相关 Wiki 概念页，整合新论文
- 更新 `index.md` 和 `log.md`

设计意图：让你有机会在 Wiki 被改前先看 Raw、决定重点。

## Wiki 组织规则 `[🟢 通用 · 照搬]`

### 概念页粒度

- 一个"可讨论的学术概念"一页（命名示例：`Main-Concept.md`、`Sub-Mechanism.md`）
- 不要为单篇论文建概念页（论文笔记属于 Raw/）
- 页名用 Title-Case，空格用连字符

### 概念页结构

```markdown
# <Concept>

[coverage: high|medium|low]
[last-updated: YYYY-MM-DD]

## Definition
<一句话定义>

## Key Claims
- [<paper-id>] 主要主张
- [<paper-id>] 另一主张

## Contradictions / Open Questions
<论文间冲突和未解问题>

## Related
- [[Concept-A]]
- [[Concept-B]]
```

**Coverage 标签含义**：
- `high`：≥3 篇论文覆盖，主流方法明确，结论稳定
- `medium`：2 篇论文，有初步共识，存在分歧
- `low`：1 篇论文或尚在探索期，结论暂时性

### Raw 文件命名

`Raw/<YYMM-shortname>.md`
- YY: 论文年份后两位
- MM: 月份
- shortname: 方法名或短标题

示例：`Raw/2510-yourmethod.md`

### Raw 文件结构

5-section + 5 个"理解型元素"（设计意图：不是 section 多，而是 section 内部元素让读者能重建 mental model）：

```markdown
# <Paper Title>

- **ID**: <YYMM-shortname>
- **Authors**:
- **Venue / Year**:
- **Link**: arxiv / code
- **Tags**: #tag1 #tag2 #tag3

## TL;DR
三条 bullet（结论 / 方法 / 为什么有效）+ 💡 一句话精华（140 字内）

## Method
核心思路 + 关键设计 + 对比表 +
🧬 Delta from [前作]（核心改动一两句话）+
流程示例（必须举例）+
🧩 因果链（问题 → 根因 → 解法 → 效应）+
⚠️ What would break this

## Key Results
训练配置 + Benchmark 详解（三问：任务来源 / 执行环境 / 分数计算）+ 核心结果（含意外发现）

## Takeaway
对我研究的启示（可操作）+
🧠 理解核验（3 个自检问题）

## Open Questions
Limitation + 值得深入的方向

## Superseded by
如有后续论文改进本工作 [<new-paper-id>]

## Related Wiki
- [[Concept-A]]
```

**5 个理解型元素的设计意图**：
- 🧬 **Delta from 前作**：很多领域都是小改动堆积，看清"vs 前作改了什么"才抓到演进链
- 🧩 **因果链**：把"为什么有效"拆到机制层，不泛泛而谈
- ⚠️ **What-breaks**：边界条件，防止误用
- 💡 **一句话精华**：能压缩就说明真懂
- 🧠 **理解核验**：未来自测理解深度的锚点

## 受控标签（Approved Tags） `[🔴 你的领域定制]`

> **核心约束**：Raw 笔记的 `Tags:` 字段 **只能**使用下列词汇。遇到论文引入的新概念，需先在本 section 登记新 tag（含一行定义），再写入 Raw。
>
> **目的**：防止 tag 漂移（`#entropy` / `#entropy-based` / `#entropy-guided` 三选一混用 → compile 时分裂成三个 Wiki 概念 → 知识库退化）。

<按你的领域按类别组织 tag。每个 tag 一行短定义。建议 20-40 个，分 5-8 类。以下是**模板示例**，请替换。>

### 研究方向
- `#<tag-1>` — <简短定义>
- `#<tag-2>` — <简短定义>

### <分类 2：例如 "方法流派" / "信号机制" / ...>
- `#<tag>` — ...
- `#<tag>` — ...

### <分类 3>
- `#<tag>` — ...

### <分类 4>
- `#<tag>` — ...

### <分类 5>
- `#<tag>` — ...

### 新增 tag 的流程

1. Ingest 时 Claude 发现现有 tags 覆盖不了论文核心概念
2. Claude 提示："建议新增 `#<name>` — 含义：<一行定义>。确认？(yes/no)"
3. 用户 yes → Claude 编辑本 section 添加一行（含定义），**再**写入 Raw 的 Tags 字段
4. 用户 no → 复用最接近的现有 tag

**原则**：宁可复用近义 tag，不要随手新增。每个新 tag 都是对词汇表的承诺。

## 整合规则 `[🟢 通用 · 照搬]`

1. 新 Raw 默认**不**自动更新 Wiki（遵循两阶段规则）
2. `compile` 时，grep 所有标签概念，更新相关 Wiki 页
3. 当新论文与既有 Wiki 结论冲突，**不直接覆盖**——在 `## Contradictions / Open Questions` 里追加，引用两篇 Raw
4. 新概念首次出现 ≥2 次（在不同 Raw 里）才建 Wiki 页，避免噪声
5. Wiki 页引用 Raw 时用 `[<paper-id>]` 格式，方便溯源
6. 相同方法的改进论文，在前作 Raw 笔记末尾 append `## Superseded by: [<new-paper-id>]`
7. 每次 compile 后更新 `index.md` 的 coverage 标签和 last-updated
8. 每次 ingest / compile 在 `log.md` 追加一行，格式见 log.md 头部说明
