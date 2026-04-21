# paper-notes (Claude Code plugin)

LLM Wiki for academic paper notes, following [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). Two-stage ingest/compile workflow, schema-driven, focused on **cross-paper synthesis** (not just flat note archive).

## Changelog

> **Convention**: every feature change → 一行在此登记。方便回溯 workflow 迭代。

### 0.1.3 — 2026-04-21
- **移除 4 个 slash commands** (`/paper-notes:{ingest,compile,query,lint}`)。实际使用中 ~95% 流量走聊天（自然语言 → skill），slash 带来的"100% 确定性触发"价值低于维持双入口的维护成本。Skill 继续通过 chat intent 触发（见下方 "Skill 子流程" 表）。
- `commands/` 目录整个删除；`hooks/wiki-status.sh` 的提示语从 "跑 /paper-notes:compile" 改为 "跟 Claude 说 compile"。

### 0.1.2 — 2026-04-18
- **Tag vocabulary lock**：schema.md 新增 `受控标签 (Approved Tags)` section，预定义 ~25 个 tag 按 7 类组织。Ingest 时 tag **必须**从中选；新 tag 需先登记到 schema.md 再使用。解决 `#entropy` / `#entropy-based` / `#entropy-guided` 混用导致 Wiki 分裂的问题。
- **Dedup check (ingest Step 0)**：ingest 第一步先 grep Raw/ 检查 arxiv id + 标题相似度，命中则提示 refresh / abort / show，避免重复 ingest 污染。

### 0.1.1 — 2026-04-18
- **Raw format**: 5-section + 5 个"理解型元素"（Delta / 因果链 / What-breaks / 一句话精华 / 理解核验）
- 去掉了早期考虑过的 8-section 版本（🔑 术语表 / 📚 文献推荐 / ⚙️ 复现难度）——经验证不如"理解型元素"有价值
- 明确 Step 3 的 11 条 quality rules

### 0.1.0 — 2026-04-18
- Initial release
- 4 slash commands: `ingest` / `compile` / `query` / `lint`
- SessionStart hook: uncompiled Raw 提醒
- Local marketplace install 模式（`extraKnownMarketplaces` + `directory` source）

---

## Roadmap（未来可加的优化）

> 用一段时间后回头看，觉得哪个痛点最明显就加哪个。**不要一次加太多**——避免过度工程。

### 🟡 用 1 个月会撞到（中优先级）

- **`#3` 研究方向漂移追踪**：`/paper-notes:schema-review` ——每月一次，基于最近 ingest 的 Takeaway 反推"你的关注点可能在变"，提示改 schema.md。防止笔记和实际兴趣脱节。

- **`#4` Wiki 目录层级化**：Wiki/ 概念页超过 20 个后平铺会混乱。分子目录 `Wiki/Methods/` / `Wiki/Concepts/` / `Wiki/Benchmarks/` / `Wiki/Problems/`。compile 时按概念类型归属。

- **`#5` `/paper-notes:weekly` 周报**：本周 ingest 论文 + Wiki 更新 + 新 Open Questions + 潜在 research gap。强制 retrospection。

- **`#6` Spaced repetition 复盘**：`/paper-notes:review [random]` 随机抽老 Raw，只显示 🧠 理解核验 的 3 问题。答不上标记"需重读"。active recall > passive reading。

- **`#11` Auto-commit after ingest/compile**：我自动 `git add && commit`（不 push，留你审阅）。省手动步骤。

### 🔵 用 3+ 月会撞到（低优先级，量大了才需要）

- **`#7` Incremental compile**：50+ Wiki 页时全量扫描 token 爆炸。只读命中新 Raw tags 的 Wiki 页。

- **`#8` 主动 reading queue**：基于 Open Questions / Superseded by / 提到但未 ingest 的论文，**主动建议下一篇读什么**。从被动 ingest 变主动研究雷达。

- **`#9` LaTeX Related Work 一键导出**：`/paper-notes:export-related-work "<concept>"` → 从 Wiki 概念页 + 引用 Raws 生成 LaTeX 初稿。**wiki 对写作的终极变现**。

- **`#10` BibTeX 自动同步**：ingest 时自动 append 到 `papers.bib`，写 paper 直接 `\cite{2510-igpo}`。

### 🟣 生态 / 体验向（需要了再加）

- **`#12` Wiki 静态可视化**：概念页链接 → HTML 图谱 → GitHub Pages 部署。mdbook / quartz，配置 20 分钟。

- **`#13` 研究组共享模式**：fork / PR 工作流，多人 contributor。README 加一节 "Collaboration workflow"。Wiki 的 `## Contradictions` section 天然适合记录多人观点分歧。

### ❌ 不做（看似诱人但 ROI 低）

- 自动爬 arxiv RSS → 容易变 feed 焦虑
- AI 自动 compile 不经人工 review → 幻觉慢性污染 Wiki
- 多 wiki 跨引用 → 一个人用不需要
- L1/L2 cache / 8 namespace → 通用知识库设计，对单一研究方向过度工程

---

## Full pipeline（整套链路）

```
┌─────────────────────────────────────────────────────────────┐
│  用户（聊天）："帮我 ingest https://arxiv.org/abs/XXXX"      │
└─────────────────────────────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Claude 识别意图 → 调用 skill │
        │ skills/paper-notes/SKILL.md  │  fat skill
        │ 6 Steps (Setup + Ingest x 6) │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 1: Setup               │
        │  - walk-up 找 wiki root      │
        │  - Read schema.md            │
        │  - Read index.md + log.md tail │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 2: fetch paper         │
        │  WebFetch abs → metadata     │
        │  WebFetch html → full text   │
        │  curl -sL → PDF              │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 3: generate Raw note   │
        │  load raw-template.md        │
        │  fill 5 sections with        │
        │  understanding-focused       │
        │  elements (Delta, 因果链,     │
        │  what-breaks, 一句话, 自检)    │
        │  invoke paper-reading skill  │
        │  apply 11 quality rules      │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 4: Write Raw/<id>.md   │
        │  Write Raw/pdfs/<id>.pdf     │
        │  Edit log.md (ingest entry)  │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 5: report to user      │
        │  → "审阅 Raw，满意就说 compile"│
        │  ⚠️ Wiki/ 未触碰              │
        └──────────────────────────────┘

     ⏸️ 用户审阅 Raw，决定是否 compile ⏸️

┌─────────────────────────────────────────────────────────────┐
│  用户（聊天）："compile"                                     │
└─────────────────────────────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 1: find uncompiled     │
        │  Read log.md → 最新 compile  │
        │  以上所有 ingest = 待整合     │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 2: group by tag        │
        │  Grep Raw tags → concept map │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 3: integrate           │
        │  For each concept:           │
        │  - 已存在 Wiki → append claim│
        │    或 Contradictions (冲突)   │
        │  - 不存在 → 达 ≥2 篇阈值才建  │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Step 4: update index.md     │
        │  Edit log.md (compile entry) │
        └──────────────────────────────┘
```

---

## Install (local dev)

Plugin 已通过 `~/.claude/settings.json` 的 `extraKnownMarketplaces` + `directory` source 注册。结构：

```
~/.claude/plugins/paper-notes/
├── .claude-plugin/marketplace.json       ← 本地 marketplace
└── plugin/                               ← plugin root
    ├── .claude-plugin/plugin.json
    ├── skills/paper-notes/
    │   ├── SKILL.md                      主逻辑（chat 触发）
    │   └── references/
    │       ├── raw-template.md            Raw 文件模板
    │       ├── wiki-template.md           Wiki 概念页模板
    │       └── log-format.md              log.md 追加格式
    ├── hooks/hooks.json                  SessionStart hook
    └── scripts/wiki-status.sh            hook 脚本（检测未 compile Raw）
```

settings.json 关键段：

```json
"enabledPlugins": {
  "paper-notes@paper-notes-local": true
},
"extraKnownMarketplaces": {
  "paper-notes-local": {
    "source": {
      "source": "directory",
      "path": "/Users/xuexiang/.claude/plugins/paper-notes"
    }
  }
}
```

重启 Claude Code 后 skill 自动装载，SessionStart hook 也会生效。

---

## Skill 子流程（聊天触发）

自 0.1.3 起不用 slash 命令，直接在聊天里说意图即可。

### `ingest` — 吸入新论文

抓取论文 → 生成 Raw 笔记 → 下载 PDF → 追加 log。**不动 Wiki**（两阶段）。

```
"帮我 ingest https://arxiv.org/abs/2510.20022"
"读一下 ~/Downloads/paper.pdf 归档进 wiki"
```

### `compile` — 整合进 Wiki

整合未 compile 的 Raw → 更新 Wiki 概念页 → 更新 `index.md`。

```
"compile"
"把 Raw 整合到 Wiki"
"compile since 2026-04-01"
```

### `query` — 跨论文检索

Wiki 全文检索 + 合成回答，带 `[paper-id]` 引用。

```
"entropy 作为 branching trigger 有哪些方法？"
"turn-level reward 这个概念的演进是什么"
```

### `lint` — 健康检查

broken cross-refs / orphan Wiki / stale pages / schema 违规。**只报告，不 auto-fix**。

```
"检查一下 wiki 健康"
"lint 一下"
```

---

## Raw 笔记格式（5-section + 理解型元素）

```
## TL;DR              三条 bullet + 💡 一句话精华
## Method
  - 核心思路 / 关键设计 / 对比表
  - 🧬 Delta from [前作]       ← 本领域最关键
  - 流程示例（必须举例）
  - 🧩 因果链（问题→根因→解法→效应）
  - ⚠️ What would break this
## Key Results
  - 训练配置
  - Benchmark 详解（三问）
  - 核心结果（含意外发现）
## Takeaway
  - 对我研究的启示（可操作）
  - 🧠 理解核验（3 个自检问题）
## Open Questions
## Superseded by
## Related Wiki
```

**5 个"理解型元素"的设计意图**：
- 🧬 **Delta**：credit assignment 论文全是小改动堆积，看清"vs 前作改了什么"才抓到演进链
- 🧩 **因果链**：把"为什么有效"拆到机制层，不泛泛而谈
- ⚠️ **What-breaks**：边界条件，防止误用
- 💡 **一句话精华**：能压缩就说明真懂
- 🧠 **理解核验**：未来自测理解深度的锚点

详见 [`skills/paper-notes/references/raw-template.md`](skills/paper-notes/references/raw-template.md)。

---

## Conventions

- **Paper-id**: `<YYMM>-<shortname>` (e.g., `2510-igpo`, `2601-at2po`)
- **Raw 只增不改**：论文的原始理解是历史记录。后续论文带来新视角，放 Wiki/
- **Wiki 是活的**：可改写，但 `## Contradictions` section 累积不覆盖
- **New Wiki 概念页** 需 ≥2 Raw 涉及（阈值在 schema.md 里）
- **每次状态变更** 都 append log.md（ingest / compile / lint / rename）

---

## Companion skill: paper-reading

若 `~/.claude/skills/paper-reading/SKILL.md` 存在，`ingest` 子流程会 **调用其方法论**——抓取优先级（HTML > abs > PDF）、关键提取焦点（训练配置 / benchmark 三问 / Limitation 段）。

不依赖它——缺失时 SKILL.md 的 quality rules 已够用。

---

## Hooks

**SessionStart hook** (`hooks/hooks.json` + `scripts/wiki-status.sh`)：
- Walk up 找 wiki root
- 若 `log.md` 的最新 `compile` 之后还有 `ingest`，在 session context 注入提示
- 脚本 `set +e && exit 0`，永不阻塞 session

---

## Known limitations

- 不会 auto-commit（用户控制 git）
- PDF OCR 未实现（arxiv PDF 通常有 text 层）
- `/init` 从零建 wiki 的 bootstrap 命令未实现（当前只支持已有 wiki）
- 不支持批量 ingest（fetch-bookmarks / X 等）
