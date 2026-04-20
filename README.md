# Paper Notes — LLM Wiki

基于 [Karpathy LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 的自维护论文知识库。主方向：**Agentic RL 中的 Credit Assignment**（详见 [schema.md](schema.md)）。

---

## 🎯 新手入门：这套方法是怎么工作的

### 先讲清楚我们在解决什么问题

你是研究生 / 算法工程师，每周读几篇 arxiv。典型痛点：

- 📖 **读完就忘**：看过的论文回头要用某个数字或方法细节，翻半小时找不到
- 🧩 **笔记是孤岛**：10 篇论文 = 10 个独立文档，谁和谁矛盾、谁是谁的改进，全靠大脑硬记
- 🤔 **不知道真懂没**：当时以为明白了，下次写论文 related work 还得重读
- 📈 **越积越乱**：笔记越多，搜索越低效，最后变成"只进不出"的垃圾桶

**LLM Wiki 的思路**（来自 Karpathy 2026 年 4 月的 gist）：
让 LLM 帮你维护一个**自整合的知识库**。每加一篇新论文，它自动去更新相关概念页、标出矛盾、补齐演进链。**相当于你雇了个全职科研助理在后台持续整理**——你只负责读和审阅。

### 整套流程图

```
    你在 arxiv 看到一篇论文
              │
              ▼
     📄 https://arxiv.org/abs/XXXX
              │
  你打命令：/paper-notes:ingest <url>
              │
              ▼
  ┌────────────────────────────────────────┐
  │ 【阶段 1】INGEST — 生成论文笔记          │
  │                                        │
  │ Claude 做这几件事：                     │
  │  1. 抓取论文全文（HTML / PDF）          │
  │  2. 按固定模板整理成结构化笔记：         │
  │     • TL;DR + 💡 一句话精华             │
  │     • Method + 🧬 Delta（vs 前作）      │
  │       + 🧩 因果链 + ⚠️ What-breaks      │
  │     • Key Results（含 benchmark 详解）  │
  │     • Takeaway + 🧠 理解核验 3 问        │
  │     • Open Questions                    │
  │  3. 保存到 Raw/<id>.md                  │
  │  4. PDF 也存一份到 Raw/pdfs/            │
  │  5. log.md 记录本次操作                 │
  │                                        │
  │ ⚠️ Wiki/ 不动——两阶段设计              │
  └────────────────────────────────────────┘
              │
              ▼
    📝 Raw/2604-xyz.md  （"原始笔记"层）
              │
       🧑 你审阅几分钟，小改
              │
              ▼
    你打命令：/paper-notes:compile
              │
              ▼
  ┌────────────────────────────────────────┐
  │ 【阶段 2】COMPILE — 整合进 Wiki         │
  │                                        │
  │ Claude 做这几件事：                     │
  │  1. 找出所有未 compile 的 Raw            │
  │  2. 看每篇涉及哪些概念（按标签）         │
  │  3. 对每个概念：                        │
  │     ✓ Wiki 已有这页 → 追加新 claim     │
  │        若和老 claim 矛盾 →              │
  │        写入 Contradictions（不覆盖）     │
  │     ✓ Wiki 没有且 ≥2 篇涉及 → 新建页   │
  │  4. 更新 index.md 目录                  │
  │  5. log.md 追加 compile 条目            │
  └────────────────────────────────────────┘
              │
              ▼
    📚 Wiki/*.md  （跨论文的"概念地图"）
              │
              ▼
  ┌────────────────────────────────────────┐
  │ Wiki 的 4 种用法（价值变现）            │
  │                                        │
  │ 🔍 查询：/paper-notes:query             │
  │    "entropy-based branching 有哪些方法" │
  │    → 读 Wiki 对应页，[paper-id] 可溯源  │
  │                                        │
  │ ✍️  写论文                              │
  │    Related Work 一段从 Wiki 概念页       │
  │    的 Key Claims 直接整理               │
  │                                        │
  │ 🔄 矛盾排查                             │
  │    Wiki 的 Contradictions section      │
  │    保留所有论文间冲突——                 │
  │    写 discussion 时这是金矿             │
  │                                        │
  │ 🧠 自测复盘                             │
  │    抽一篇老 Raw 的 🧠 理解核验 3 问     │
  │    答不上来 → 提醒你重读                 │
  └────────────────────────────────────────┘
```

### 为什么这样比普通笔记强？

| 普通笔记 | LLM Wiki |
|---|---|
| 每篇独立文件 → 关联全靠记忆 | 每加一篇自动更新所有相关概念页 |
| 只"记录"，没"整合" | Wiki/ 是跨论文的**当前最佳理解** |
| 矛盾靠脑补 / 写不出来就丢失 | Contradictions section 明确保留，不覆盖 |
| 时间越长越乱 | Schema + Tag vocabulary 约束防止退化 |
| 不确定自己是否真懂 | 🧠 理解核验的 3 问题强制自测 |
| 难分享 / 难版本管理 | GitHub 公开可见，git 可追溯 |

### 两个关键的设计决定

**1. 为什么要分两阶段（不是一键搞定）？**

很多人觉得"Claude 读完直接更新 Wiki 不就完了？" —— 这样有两个问题：
- **Wiki 是累积型数据**：错误一旦进去会**永久污染**之后的 claim 引用链
- **你需要审阅窗口**：Claude 的理解偶尔会偏，你扫一眼 Raw 就能发现

所以设计是：**ingest 只动 Raw → 你审阅 → 你说 compile → 才动 Wiki**。审阅权交给你。

**2. 为什么是"理解型元素"而不是"查阅型 section"？**

早期我们考虑过加 `🔑 术语表` / `📚 相关文献` / `⚙️ 复现难度`——**后来砍掉了**：
- 这些是**查阅**（reference lookup），不帮助理解
- 真正让你深入的是 5 个问题：
  - 💡 **一句话精华**：能把全文压到 140 字就说明真懂
  - 🧬 **Delta**：vs 最接近的前作到底改了哪行？
  - 🧩 **因果链**：问题 → 根因 → 解法 → 效应（拆到机制层）
  - ⚠️ **What-breaks**：什么情况下这方法会失效？
  - 🧠 **自测**：3 个问题，答不上就知道回哪段重读

前者让你"查到",后者让你"真懂"。尤其对 credit assignment 这种**小改动堆积**的领域（ARPO → AEPO → AT²PO → SALT），🧬 Delta 就是演进链的钥匙——不看 Delta 等于没看懂这篇。

### 一个具体例子

**Scenario**：今天你刷 arxiv 看到一篇叫 "XYZ" 的新论文，做 entropy-based branching 的改进。

**第一步**（30 秒操作）：
```
/paper-notes:ingest https://arxiv.org/abs/XXXX
```

**2-5 分钟后**，你拿到：
- `Raw/2604-xyz.md` — 结构化笔记
- 里面 🧬 **Delta from ARPO** 告诉你："XYZ 和 ARPO 唯一的差别是把固定 τ 阈值换成自适应"
- 里面 🧠 **理解核验** 给你 3 个问题供未来自测

**第二步**（2 分钟审阅）：
你扫一眼觉得分析准确，运行：
```
/paper-notes:compile
```

**1-2 分钟后**，Claude 完成：
- `Wiki/Entropy-Guided-Exploration.md` 新增 `[2604-xyz] 自适应 τ 解决 ARPO entropy collapse`
- `Wiki/Credit-Assignment-in-Agentic-RL.md` 的路线对比表加 XYZ 到 entropy 路线

**三个月后**，你要写一篇综述的 related work：
```
/paper-notes:query "entropy-based branching 的演进"
```

Claude 几秒内答：
> "这方向演进链：**ARPO** ([2507] 固定 τ) → **AEPO** ([2510] 加 branching penalty) → **XYZ** ([2604] 自适应 τ) → **AT²PO** ([2601] 三阶段 turn 对齐)..."

**你不用翻任何一篇论文**——Claude 在 ingest 时已经把这些演进关系分析过一遍存进 Wiki 了。

---

## 快速使用

**两种使用方式，底层共用同一套 SKILL.md，不是两套逻辑**。按场景挑：

| 场景 | 推荐方式 |
|---|---|
| 看到新论文随手 ingest | 💬 聊天 |
| 批量 10 篇一次性处理 | 🖥️ 终端 slash |
| 复杂需求（多篇对比 / follow-up 提问） | 💬 聊天 |
| 自动化集成（cron / hook / 脚本） | 🖥️ 终端 slash |
| 新人零学习 | 💬 聊天 |

二者可在**同一个 wiki 上混用**，互不冲突。

---

### 💬 方式 A：聊天（推荐日常使用）

把 arxiv 链接或 PDF 路径**直接发给 Claude**（桌面版 / 终端 / IDE 扩展任一 surface 都行），用自然语言描述意图：

```
"帮我 ingest 这篇：https://arxiv.org/abs/2510.XXXXX"
"读一下 https://arxiv.org/abs/XXXX，重点讲 entropy 部分"
"这篇 ingest 完后和 IGPO 对比下：https://arxiv.org/abs/XXXX"
"把 ~/Downloads/paper.pdf 归档进 wiki"
```

Claude 做什么：

1. 识别意图 → **调用 `paper-notes:ingest` skill**（等价于打 slash 命令，但从聊天触发）
2. 按 SKILL.md 严格流程：抓论文 / 下 PDF / 写 Raw / 更新 log
3. 完成后主动问：**"审阅 Raw 吗？满意就说 compile"**
4. 你说 compile → 自动触发 compile + auto push

**好处**：
- 零学习成本（不用记命令名）
- 支持**复杂多步请求**（"读 A 和 B，对比二者，重点看 entropy"）
- 对话式 follow-up（"刚那篇再展开讲讲 🧬 Delta"）
- 跨 surface 通用（Claude Code 任何客户端都行）
- 新同事 / 合作者秒上手

**适合**：日常 ingest、探索性提问、复杂多步需求、不熟悉 slash 命令的使用者。

---

### 🖥️ 方式 B：终端 slash 命令（推荐批量 / 稳态 / 自动化）

前提：已装 [`paper-notes` Claude Code plugin](../../.claude/plugins/paper-notes/plugin/README.md)。

```bash
cd ~/Documents/PaperNotes    # 必须在 wiki root（或子目录）里才能用

# —— 在 Claude Code 里依次使用 ——

/paper-notes:ingest https://arxiv.org/abs/2510.XXXXX
#   1. Walk up 找 wiki root → 读 schema.md / index.md / log.md tail
#   2. WebFetch arxiv 页面 → 抽取 title / authors / venue / abstract
#   3. WebFetch html 全文（fallback: PDF）
#   4. curl -sL 下载 PDF → Raw/pdfs/<paper-id>.pdf
#   5. 调用 paper-reading skill 方法论 → 按 5-section + 理解型元素生成笔记
#   6. 写 Raw/<YYMM-shortname>.md
#   7. log.md 顶部追加 "## [date] ingest | ..."
#   ⚠️ 不动 Wiki/——两阶段设计，留审阅窗口

/paper-notes:compile
#   1. 读 log.md → 找最新 compile 之后所有 ingest 条目
#   2. 报告即将整合的论文，请求你确认（>5 篇时）
#   3. Grep 每篇 Raw 的 #tags → 按概念分组
#   4. 对每个概念：
#      - 已存在 Wiki 页 → 追加 [paper-id] 到 Key Claims
#        · 若与既有结论冲突 → 写入 Contradictions（累积不覆盖）
#      - 不存在且 ≥2 篇 Raw 涉及 → 建新概念页（wiki-template.md）
#      - 只 1 篇涉及 → 暂不建，log 里标"候选概念"
#   5. 更新 index.md 的 coverage 标签 + last-updated
#   6. log.md 追加 compile 条目

/paper-notes:query "entropy 触发 branching 的方法有哪些"
#   1. 解析问题提取关键概念（entropy / branching）
#   2. Grep Wiki/ 优先（整合答案），Raw/ 其次（具体 claim）
#   3. Read 命中文件（限 5 Wiki + 5 Raw）
#   4. 合成结构化回答：
#      - 引领：整合性 claim（来自 Wiki）
#      - 支撑：[paper-id] 引用（可点击跳转）
#      - 矛盾：若 Wiki 有 Contradictions 则双方并列
#   5. 检索命中少时明确说"wiki 覆盖不足"

/paper-notes:lint
#   1. 扫 [[Concept]] 链接 → 指向不存在的 Wiki 页？（broken-refs）
#   2. 找 orphan Wiki（没有 Raw 引用它）
#   3. 找 stale Raw（ingested 但从未 compile 进 Wiki）
#   4. 找 stale Wiki（last-updated > 90 天）
#   5. Schema 违规（文件名、必填字段、coverage 标签）
#   6. Raw 缺对应 PDF（link 是 arxiv 但无 Raw/pdfs/<id>.pdf）
#   ⚠️ 只输出报告——不 auto-fix，由你决定
```

**好处**：
- **严格一致性**：Skill 按部就班，不偏
- **可脚本化**：shell for loop 批量 ingest 一堆链接
- **上下文懒加载**：Skill 命令触发时才加载，平时不占 context
- **可审计**：终端 history 可追溯所有命令
- **便于分享**：把命令序列发给同学他们照搬就行

**适合**：批量处理、自动化工作流、稳态重复操作。

---

### Plugin 未装？

**方式 A 完全不受影响**——直接在聊天里让 Claude 按 `schema.md` 规则工作即可。
**方式 B 要先装 plugin**（见 [plugin README](../../.claude/plugins/paper-notes/plugin/README.md)）。

### 建议的混合比例

- **80% 聊天**：日常随手扔链接（方式 A）
- **20% slash**：批量 / 自动化 / 严格场景（方式 B）

二者接口不同但**底层是同一个 SKILL.md**——生成的 Raw / Wiki 内容完全一致。

## Plugin 安装（方式 B 需要；方式 A 免装）

本 repo 既是 wiki 内容也是 plugin 发布源——`.claude-plugin/` + `plugin/` 目录是给 Claude Code 装 plugin 用的，对读 wiki 的人可以忽略。

### 快速安装（任何设备：Mac / Linux / Windows WSL）

```bash
# 1. Clone wiki（包含 plugin 源）
git clone https://github.com/newshawn/paper-notes ~/Documents/PaperNotes
cd ~/Documents/PaperNotes
```

然后在 Claude Code 里跑两条命令：

```
/plugin marketplace add newshawn/paper-notes
/plugin install paper-notes@paper-notes
```

重启 Claude Code，`/paper-notes:` 开头的 4 个命令就可用。

### 或者手改 `~/.claude/settings.json`

```json
"enabledPlugins": {
  "paper-notes@paper-notes": true
},
"extraKnownMarketplaces": {
  "paper-notes": {
    "source": {
      "source": "github",
      "repo": "newshawn/paper-notes",
      "sparsePaths": [".claude-plugin", "plugin"]
    }
  }
}
```

`sparsePaths` 让 Claude Code **只拉 plugin 相关目录**，不 clone 整个 wiki 内容（节省磁盘）。

### 验证

重启 Claude Code → `/plugin list` 应看到 `paper-notes v0.1.x`；`/paper-notes:` 开头能 autocomplete 到 4 个命令。

### 详细 plugin 文档

见 [`plugin/README.md`](plugin/README.md) —— 含 CHANGELOG、Roadmap、全流程 pipeline 图。

## 想用这套模式做自己的领域？（Fork & Customize）

本 repo 既是"我的 agentic RL 论文笔记"，**也是可复用的模板**。plugin 本身领域无关——只要替换 schema.md 里领域特有的两个 section，就能用到任何研究方向。

### 🔴 要替换 vs 🟢 照搬

[`schema.md`](schema.md) 的每个 section 都打了标签：

- **`[🔴 你的领域定制]`**：`研究方向` + `受控标签（Approved Tags）` —— 换成你的领域
- **`[🟢 通用 · 照搬]`**：目录结构 / 两阶段工作流 / Wiki 组织规则 / 整合规则 —— 不动

**只有两个 section 要改**，剩下都是跨领域通用的结构。

### 4 步 fork 流程

```bash
# 1. 在 GitHub 上 fork 本 repo 到你自己的账号，然后 clone
git clone https://github.com/<你的 GitHub 用户名>/paper-notes ~/Documents/MyPaperNotes
cd ~/Documents/MyPaperNotes

# 2. 清理示例内容（或保留作参考）
rm -rf Raw/*.md Raw/pdfs/*.pdf Wiki/*.md
echo "# Log" > log.md
echo "# Index" > index.md
# 或：git rm 后 commit 一次，历史里永远保留我的 Agentic RL 例子作参考

# 3. 用空模板重置 schema.md（推荐）
cp docs/schema-template.md schema.md
#    打开 schema.md 填你的领域信息（两个 [🔴] section）

# 4. 更新 settings.json 的 marketplace source
#    ~/.claude/settings.json 里把 newshawn/paper-notes 改成 <你的账号>/paper-notes
```

重启 Claude Code → 装上你自己 fork 的 plugin → 开始 ingest 你领域的论文。

### 适合哪些领域

理论上任何"读大量论文 + 需要跨论文综述"的场景：

- LLM Safety / Alignment
- Computer Vision / Multimodal
- 生物信息 / 基因编辑
- 认知科学 / 脑科学
- 密码学 / 系统安全
- 强化学习的其他子方向（RLHF、offline RL、world models...）

### 不适合

- 一次性看一两篇（用不上 Wiki 整合，直接 Obsidian 就行）
- 大量非学术内容（菜谱、读书笔记）——schema 约束会变累赘
- 不用 Claude Code 的场景（plugin 不生效；但 markdown wiki 结构本身仍有价值）

### 学习用途

如果你不打算用，只是想**理解这套方法**：

1. 读 [`README.md`](README.md) 的 [🎯 新手入门](#-新手入门这套方法是怎么工作的)（为什么这么设计）
2. 读 [`plugin/README.md`](plugin/README.md) 的 **Full pipeline ASCII 图**（整套链路可视化）
3. 读 [`schema.md`](schema.md) 看具体规则长什么样
4. 读 [`plugin/skills/paper-notes/SKILL.md`](plugin/skills/paper-notes/SKILL.md) 看 skill 的 6 步工作流

顺序：**宏观叙事 → 可视化 → 规则 → 执行**。

## 目录结构

```
Raw/                每篇论文的原始 takeaway（append-only，10 篇已有 + 新 ingest）
Raw/pdfs/           对应 PDF 原文
Wiki/               跨论文整合的概念页（AI 维护，会被改写）
attachments/        图片、图表
schema.md           知识库宪法：研究方向 + 组织规则
index.md            目录：所有 Wiki 概念页 + Raw 时间线
log.md              时间线：每次 ingest / compile / lint 的记录（append-only）
.claude-plugin/     Claude Code marketplace 元数据（装 plugin 时用）
plugin/             Plugin 源：commands / skills / hooks / scripts
README.md           本文件
```

## Raw 笔记格式

5-section + 5 个"理解型元素"（从 2026-04-18 起）：

| Section | 内部结构 |
|---|---|
| TL;DR | 3 bullets + 💡 一句话精华（140 字内） |
| Method | 核心思路 / 对比表 / 🧬 Delta from 前作 / 流程示例 / 🧩 因果链 / ⚠️ What-breaks |
| Key Results | 训练配置 / Benchmark 三问 / 核心结果 |
| Takeaway | 可操作启示 / 🧠 理解核验（3 问） |
| Open Questions | Limitation + 研究机会 |

**为什么这样设计**：credit assignment 论文多数是小改动堆积（ARPO → AEPO → AT²PO → SALT）。核心理解在于"vs 前作改了什么"（🧬 Delta）、"为什么有效到机制层"（🧩 因果链）、"什么场景会失效"（⚠️ What-breaks）。Section 数量和早期 10 篇保持一致，只是内部结构更利于理解。

早期 10 篇（2505 - 2602）的简版 5-section 格式兼容保留。

## Wiki 概念页格式

```
# <Concept>
[coverage: high|medium|low]
[last-updated: YYYY-MM-DD]

## Definition             一句话
## Key Claims             跨论文整合的主张，[paper-id] 溯源
## Contradictions         论文间冲突 & 未解问题（不覆盖，累积）
## Related               [[Concept-A]] 双链
```

Coverage 标签：high (≥3 篇) / medium (2 篇) / low (1 篇或新兴)。

## 两阶段工作流

1. **Ingest** — 吸入新论文 → 写 Raw + 下 PDF + log 记录。**Wiki 不动**
2. **Review** — 你审阅 Raw，小改
3. **Compile** — 手动触发整合 → Wiki 受影响概念页更新 + index.md 更新

设计意图：给你审阅窗口。Ingest 生成的内容不等于你真正采纳。

## 原则

- **Raw 只增不改**：论文的原始理解是历史记录
- **Wiki 是活的**：可以被新证据改写，但矛盾累积不覆盖
- **schema.md 是宪法**：所有整合决策以它为准
- **每次状态变更** 进 log.md
- **≥2 篇 Raw** 触及同一概念才建 Wiki 页（避免噪声）

## 当前状态

- ✅ 10 篇 Raw（2505-gigpo → 2602-rlanything）
- ✅ 3 个 Wiki 概念页：[Credit-Assignment-in-Agentic-RL](Wiki/Credit-Assignment-in-Agentic-RL.md) / [Entropy-Guided-Exploration](Wiki/Entropy-Guided-Exploration.md) / [Turn-Level-Reward](Wiki/Turn-Level-Reward.md)
- ⏳ Raw/pdfs/ 为空（早期 10 篇是从现成笔记转的，没下 PDF）
- ⏳ 部分候选 Wiki 概念待更多 Raw 涉及后建立（详见 [index.md](index.md)）
