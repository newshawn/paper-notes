# Log

> Append-only 时间线。每次 ingest / compile / lint 追加一条。
> 格式：`## [YYYY-MM-DD] <action> | <target>`
> action ∈ {ingest, compile, lint, rename, refactor}

## [2026-05-11] refactor | reduce dev cockpit to artifact renderer

- **动机**：用户指出开发工作台仍然过复杂，真正需要的是一个 HTML+Markdown 渲染器，以及一份 markdown 规则来描述 plan artifact pipeline。
- **更新**：重写 `dev-cockpit.html` 生成为轻量 renderer：粘贴 / 预览 `plan-review.html` 和 `plan-review.md`，复制规则、复制 plan 生成指令、复制最终 Markdown 执行稿。
- **新增规则**：新增 `docs/plan-artifact-pipeline.md`，明确需求 prompt → 读取相关文件 → 生成 HTML+Markdown plan → 人类审阅 HTML → 同步修改 HTML/Markdown → Markdown 交给 agent 执行。
- **文档**：简化 `docs/dev-cockpit-workflow.md` 和 README，去掉任务入口、方案比较等复杂流程说明。
- **Wiki touched**: none (developer workflow UI/docs only)

## [2026-05-11] refactor | simplify dev cockpit export and context wording

- **动机**：用户指出导出执行稿区域冗余，并询问“仓库上下文”的实际作用和跨项目可复用性。
- **更新**：`dev-cockpit.html` 删除常驻长 prompt 预览，导出区只保留复制按钮和简短说明，避免与已审 markdown 重复。
- **命名**：将“交互原型”改为“可视化评审”，将“仓库上下文”相关文案收敛为“项目规则 / 项目上下文”。
- **文档**：更新 `docs/dev-cockpit-workflow.md`，说明项目规则上下文的用途，以及 pipeline 可以迁移到其他项目但规则源需要替换。
- **Wiki touched**: none (developer workflow UI/docs only)

## [2026-05-11] refactor | document plan artifact pipeline tutorial

- **动机**：用户希望有一份教程，说明 prompt → HTML+Markdown plan → 人类 review → LLM 执行的开发 pipeline。
- **更新**：扩写 `docs/dev-cockpit-workflow.md`，补充入口选择、完整 pipeline、合格 plan HTML 的组成、review 检查清单。
- **Demo**：用“优化当前 ingest 模块”作为最小示例，明确 HTML 需要展示现有 ingest 如何实现、优化模块如何设计，以及具体实现例子和验收方式。
- **入口**：更新 `README.md` 的 Human Review 区域，指向 dev-cockpit 教程。
- **Wiki touched**: none (developer workflow documentation only)

## [2026-05-11] refactor | add ingest optimization plan demo

- **动机**：用户希望看到一个最小化 plan demo：以“优化当前 ingest 模块”为例，HTML 应展示现有 ingest 如何实现、优化模块如何设计，并附带具体实现例子。
- **更新**：`dev-cockpit.html` 新增“载入 ingest 优化示例”按钮，一键填入需求、`plan-review.html` 和 `plan-review.md`。
- **Demo 内容**：包含当前 ingest 流程（输入 → 读规则 → 查重 → 写 Raw → 存 PDF → 记 log）、痛点、Preflight / Template Guard / Tag Guard / Review Report 优化模块、建议改动文件和验收方式。
- **文档**：更新 `docs/dev-cockpit-workflow.md` 说明内置 demo 的作用。
- **Wiki touched**: none (developer workflow only)

## [2026-05-11] refactor | turn dev cockpit into plan artifact review shell

- **动机**：用户指出上一版仍是“美丽的废物”：demo 只是 prompt 生成器自身的 demo，而不是具体 plan 的 demo；最终 pipeline 应是 prompt → 大模型生成 HTML+Markdown plan artifact → 人类 review HTML → 再交给 LLM 执行。
- **更新**：`dev-cockpit.html` 改为组织需求 / 代码库上下文，并生成 artifact 生成指令；大模型产出的 `plan-review.html` 和 `plan-review.md` 可粘贴回页面预览。
- **评审素材**：替换自我指涉 demo 为“当前代码库模块 / 需求模块 / 参考示例 / 评审重点”，用于提示大模型生成真正与本次需求相关的 plan demo。
- **导出**：新增“复制 artifact 生成指令”；执行 prompt 使用已审 markdown 和 HTML 预览内容。
- **Wiki touched**: none (developer workflow only)

## [2026-05-11] refactor | make dev cockpit generate review artifact

- **动机**：用户指出当前 `dev-cockpit.html` 仍偏“表单拼 prompt”，最终目标应是“根据需求和上下文 prompt 生成一个 HTML artifact，先让人 review 需求实现是否合理，再交给 LLM 执行”。
- **更新**：新增“需求评审稿”区域，汇总需求 / 上下文、推荐方案、执行计划、review 检查、相关文件、相关 Raw/Wiki 和交给 LLM 前的执行指令。
- **导出**：新增“复制评审 HTML”，并将 markdown 计划升级为评审稿 markdown；prompt 内也嵌入评审稿内容。
- **安全**：前端 artifact 渲染对用户输入做 HTML 转义，避免把粘贴内容当作页面 HTML 执行。
- **Wiki touched**: none (developer workflow only)

## [2026-05-11] refactor | localize dev cockpit and make plan default

- **动机**：用户希望 `dev-cockpit.html` 的英文界面中文化，并进一步确认日常开发中 plan 最重要，担心页面仍偏冗余。
- **更新**：用户可见文案基本改为中文；默认 workflow 从“探索”改为“做计划”，默认方案为“稳健计划”。
- **流程判断**：最佳默认流程收敛为“选做计划 → 写一句需求 → 填关键词 → 看执行计划 / 风险 / demo → 复制 prompt”；探索、Demo、先理解作为辅助入口。
- **文档**：中文化 `docs/dev-cockpit-workflow.md`，更新 README 说明日常开发默认优先“做计划”。
- **Wiki touched**: none (developer workflow only)

## [2026-05-11] refactor | simplify dev cockpit into workflow chooser

- **动机**：用户反馈 `dev-cockpit.html` 第一版太复杂，希望更接近 html-effectiveness 的简洁 exploration 风格，并先选择“我要干什么”。
- **更新**：第一屏改为 4 个 workflow cards：Explore / Plan / Demo / Inspect；选择后再进入 Work Brief、方案比较、demo slots 和导出 prompt。
- **简化**：移除第一屏统计干扰，把 repo snapshot 下沉到 Work Brief 侧栏；隐藏 Mode 下拉，改由 workflow 自动设置。
- **文档**：更新 `README.md` 和 `docs/dev-cockpit-workflow.md` 的使用步骤。
- **Wiki touched**: none (developer workflow only)

## [2026-05-11] refactor | split review and dev cockpit html workflows

- **动机**：用户确认希望拆成两个 HTML：一个用于观看当前仓库 / Wiki 状态，另一个专门用于开发时和 LLM 协作 plan 与执行。
- **新增**：`scripts/build-dev-cockpit.mjs` 和生成物 `dev-cockpit.html`，提供需求输入、focus words、三种实现方案对比、implementation plan、demo slots、相关文件 / Raw / Wiki 匹配、导出 LLM prompt。
- **调整**：`review.html` 默认回到 Overview 观察层，并链接到 `dev-cockpit.html`；开发规划职责迁移到新页面。
- **文档**：新增 `docs/dev-cockpit-workflow.md`，更新 `README.md` 和 `docs/html-review-workflow.md` 说明两个 HTML 的分工。
- **Wiki touched**: none (developer workflow only)

## [2026-05-11] refactor | turn review.html into LLM interaction workspace

- **动机**：用户指出现有 HTML 更像仓库概览，而目标是“修改代码或提出新需求时，通过 HTML 与 LLM 交互，从而更稳地把握仓库状态和需求”。
- **更新**：`review.html` 默认入口改为 Workspace，支持任务类型选择、需求输入、focus words、上下文开关、相关 Wiki/Raw 自动匹配，以及可复制的 LLM handoff prompt。
- **生成器**：更新 `scripts/build-review.mjs`，保留 Overview / Wiki / Raw / Prompt 浏览能力，同时让 HTML 成为需求进入 LLM 前的交互层。
- **文档**：更新 `README.md` 和 `docs/html-review-workflow.md` 说明新的 LLM Interaction Loop。
- **Wiki touched**: none (HTML workflow only)

## [2026-05-11] refactor | document default auto commit and push

- **动机**：用户确认希望未来完成 repo 文件改动后自动提交并推送，减少手动收尾。
- **规则更新**：`AGENTS.md` 和 `CLAUDE.md` 的 Git 红线改为默认 `git add` → `git commit` → `git push`，除非用户明确要求暂不提交或暂不推送。
- **Wiki touched**: none (workflow preference only)

## [2026-05-11] refactor | remove plugin layer and simplify workflow docs

- **动机**：实际使用场景主要是自然语言投喂论文 / 笔记、显式 compile、按需查询 Wiki；Claude Code plugin、slash commands、marketplace 安装说明对个人研究库维护成本偏高。
- **删除**：移除 `.claude-plugin/` 和 `plugin/` 下的 plugin manifest、commands、hooks、scripts、skill 模板与 plugin README。
- **保留**：`Raw/`、`Wiki/`、`schema.md`、`index.md`、`log.md` 的 LLM Wiki 主体结构不变。
- **文档更新**：重写 `README.md`、`AGENTS.md`、`CLAUDE.md`，改为自然语言工作流：ingest → review → compile → query。
- **Wiki touched**: none (refactor only)

## [2026-04-20] refactor | 2604-ig-search Raw 补 Appendix J 数据

- **动机**：先前 ingest 时 arxiv HTML fetch 被截断，Raw 里 Delta 段写的是"Appendix J 承诺 cross-protocol 对比（未在提供内容中显示）"，留了信息空洞
- **操作**：Read PDF 第 20-25 页直接抓 Appendix J 原文 + Table 8
- **补充内容**：
  - Delta from IGPO 段补上 Appendix J 结论："IG-Search 0.518 vs IGPO 0.489 (+2.9 F1)，且 IG-Search 用更弱的 retriever（E5 + 2018 Wiki dump vs IGPO 的 Google Search API）和更小 rollout budget（G=5/T=5 vs G=16/T=10）"
  - Key Results 新增 "Cross-Protocol 对比 IGPO" 子段，含完整 Table 8（7 个 benchmark 的 F1 并列对比）+ 3 条解读（IG-Search 5/7 胜 / 弱 retriever + 小 budget 仍赢 / Bamboogle 仍印证"single-hop 浅题不利 step-level signal"）
- **不改 Wiki**：红线 #1，仅 Raw 补数据不算 compile。下次 compile 时可让 Search-Augmented-RL.md 引用这个具体数字
- **关联 Contradictions**：Appendix J 两个反例（2Wiki / Bamboogle IGPO 胜）进一步佐证 Credit-Assignment Contradiction #1（粒度选择按任务深度看）

## [2026-04-20] compile | 2 raws → 2 wiki pages updated + 1 new wiki page created

- **Raws compiled**: 2603-mr-search, 2505-autorefine
- **Wiki updated**:
  - `Credit-Assignment-in-Agentic-RL.md`:
    - Key Claims +5 条（turn-level RLOO + γ ablation / meta-episode 正交性 / stairstep reward / refine synergy / **小模型 scaffolding 假说 跨 3 篇印证**）
    - 新增 Contradiction #8 "小模型从 CA scaffolding 获益更大"（3 篇论文数字证据 + 3 个可能解释 + 开放研究方向）
    - 可深入方向 +3 条（#10 小模型 × CA 专项研究 / #11 meta-episode × dense IG / #12 refine × counterfactual IG）
    - Related 新增 `[[Search-Augmented-RL]]` 和 `[[Small-Model-Scaffolding]]`（待建）
  - `Turn-Level-Reward.md`:
    - Key Claims +2 条（RLOO + 小模型 scaffolding 引用）
    - 可深入方向 +1 条（meta-episode × turn-level 双轴）
    - Related 新增 `[[Search-Augmented-RL]]`
- **Wiki created**: `Search-Augmented-RL.md`（coverage high，4 篇覆盖：AutoRefine / IGPO / MR-Search / IG-Search）——演进脉络、Key Claims、4 个 Contradictions、7 个可深入方向、和其他方向的接口讨论
- **Wiki candidates（仍待更多论文）**:
  - `Small-Model-Scaffolding` —— 已 ≥3 篇独立观察（IGPO + MR-Search + EAPO），理论上可建，但观察散在各 Raw 里、暂先汇总到 Credit-Assignment Contradiction #8
  - `Token-Level-Credit`（EAPO，仍 1 篇）
  - `Counterfactual-Baseline`（IG-Search，仍 1 篇）
  - `Meta-RL-for-Agents`（MR-Search，仍 1 篇）
- **Contradictions recorded**:
  - 粒度选择（episode/turn/step）—— AutoRefine 浅任务反而优于 IG-Search 细粒度
  - Reward hacking 风险（R_ret gaming / short-query gaming）
- **Rationale**: MR-Search + AutoRefine 填上了"搜索 RL 生态图"——加上 IGPO/IG-Search 形成完整 4 篇演进。最大 insight 是**小模型 scaffolding 假说**跨 3 篇独立印证，潜在论文方向级别。新建 `Search-Augmented-RL` wiki 作为这个子领域的专门汇总。

## [2026-04-20] ingest | 2505-autorefine AutoRefine: Search and Refine During Think

- **Raw**: Raw/2505-autorefine.md
- **PDF**: Raw/pdfs/2505-autorefine.pdf (1.0 MB)
- **Tags**: #credit-assignment #no-reward-model #tool-use #multi-turn-agent
- **Wiki touched**: none (two-stage — compile pending)
- **Notable**: MR-Search / IG-Search 都 cite 它作 baseline；"refine-during-think" 成领域标准起点。复合 reward 的非线性组合（stairstep vs linear）是可迁移的工程 insight

## [2026-04-20] ingest | 2603-mr-search Meta-RL with Self-Reflection for Agentic Search

- **Raw**: Raw/2603-mr-search.md
- **PDF**: Raw/pdfs/2603-mr-search.pdf (1.1 MB)
- **Tags**: #credit-assignment #no-reward-model #turn-level-reward #multi-turn-agent #tool-use
- **Wiki touched**: none (two-stage — compile pending)
- **Notable**: Allen AI（Nathan Lambert, Noah Smith）；引入 meta-RL + self-reflection 维度——跨 episode 自我校正与 turn-level credit 正交；3B +19.3% rel（vs 7B +9.2%）再次印证小模型从 scaffolding 获益更大的假说

## [2026-04-20] compile | 2 raws → 3 wiki pages updated

- **Raws compiled**: 2604-eapo, 2604-ig-search
- **Wiki updated**:
  - `Credit-Assignment-in-Agentic-RL.md`:
    - 新增 Route 5 "Token-Level Credit"（EAPO）
    - Route 4 Dense Reward 加 IG-Search 行
    - Key Claims +4 条（token 非均分 / accuracy+diversity / counterfactual critique IGPO / per-token reward hacking 防护）
    - Contradiction #4 重构：区分 IS 粒度 vs Advantage 粒度
    - 新增 Contradiction #7 "IG 的两种设计：时间差 vs 反事实"
    - 可深入方向 +3 条（#7 token×turn / #8 IGPO×IG-Search / #9 Four Quadrant 通用化）
  - `Turn-Level-Reward.md`:
    - 主流设计 #1 重构为 "两种变种" (1a turn-to-turn + 1b counterfactual)
    - Key Claims +2 条
    - 新增 Contradiction #6 "Temporal-difference IG vs Counterfactual IG"
    - 可深入方向 +2 条（IGPO×IG-Search 双层 / counterfactual 推广到非检索）
  - `Entropy-Guided-Exploration.md`:
    - 核心观察 + EAPO 关于 softmax gradient 的观察
    - 新增 用法 5 "Entropy 作为 Token-Level Advantage 调制器"
    - 核心矛盾表 +EAPO 行（advantage 阶段放大）
    - 可深入方向 +2 条（EMPG 降权 vs EAPO 放大的调和 / Four Quadrant 迁移）
- **Wiki created**: 无（Token-Level-Credit 和 Counterfactual-Baseline 只有 1 篇涉及，未达 ≥2 阈值，已登记到 index.md 候选）
- **Candidates awaiting more papers**:
  - `Token-Level-Credit`（EAPO 目前仅 1 篇）
  - `Counterfactual-Baseline`（IG-Search 目前仅 1 篇）
- **Contradictions recorded**: IGPO vs IG-Search (conflation vs isolation of retrieval contribution) → 形成 Credit-Assignment Wiki #7 和 Turn-Level-Reward Wiki #6 的双重记载
- **Rationale**: 2 篇都引入新维度——EAPO 把 credit assignment 下探到 token 粒度 + Four Quadrant 分析法；IG-Search 用 counterfactual baseline 对 IGPO 的 turn-IG 构成理论挑战。Wiki 主要新增是"IG 两种设计对立"这个 meta 观察（单看任一篇都看不出来）。

## [2026-04-20] ingest | 2604-ig-search IG-Search: Step-Level IG for Search-Augmented Reasoning

- **Raw**: Raw/2604-ig-search.md
- **PDF**: Raw/pdfs/2604-ig-search.pdf (5.1 MB)
- **Tags**: #credit-assignment #information-gain #step-wise-reward #tool-use #multi-turn-agent #no-reward-model
- **Wiki touched**: none (two-stage — compile pending)
- **Notable**: 明确批评 IGPO "conflates reasoning/querying/retrieval"——与 2510-igpo 形成直接对立/互补关系，compile 时值得专门处理

## [2026-04-20] ingest | 2604-eapo Rethinking Token-Level Credit Assignment in RLVR

- **Raw**: Raw/2604-eapo.md
- **PDF**: Raw/pdfs/2604-eapo.pdf (2.5 MB)
- **Tags**: #credit-assignment #entropy #gradient-modulation #token-level-reward #no-reward-model
- **Wiki touched**: none (two-stage — compile pending)
- **Schema 更新**: 新增 tag `#token-level-reward`（登记到 schema.md 的 Advantage 粒度 section）
- **Notable**: 引入新粒度维度（token-level），与现有 turn-level / step-wise 并列；Four Quadrant 分析法通用，compile 时应进 Wiki

## [2026-04-18] compile | post-retrofit refresh (10 raws → 3 wiki pages)

- **Trigger**: retrofit 给 10 篇 Raw 加了 5 个理解型元素后的增量 compile
- **Raws scanned**: 全部 10 篇（2505-gigpo, 2507-arpo, 2509-empg, 2509-treegrpo, 2510-aepo, 2510-igpo, 2510-salt, 2601-at2po, 2601-matchtir, 2602-rlanything）
- **Wiki updated**:
  - `Credit-Assignment-in-Agentic-RL.md` → 新增 Contradictions #6 "状态等价性 & 超参数泛化"（跨方法共性陷阱，来自 retrofit 的 What-breaks 观察整合）
  - `Entropy-Guided-Exploration.md` → 潜在陷阱新增 2 条："超参数组合爆炸" + "Turn 粒度对非 QA 任务不清晰"
  - `Turn-Level-Reward.md` → 扩充 #2 "Turn 粒度是否永远合理"，新增 #5 "IG 在长答案下的数值稳定性"
- **Wiki created**: 无（没达到新概念的 ≥2 Raw 阈值触发）
- **Candidates awaiting more papers**: 无新候选
- **Contradictions recorded**: 主要是跨方法的 meta-level 矛盾（超参数、状态等价性）
- **Rationale**: retrofit 的 5 元素本身是重构而非新 claim；compile 的边际价值是把 ⚠️ What-breaks 里提炼的共性陷阱汇总到 Wiki 的 Contradictions/Open Questions，形成跨论文的"问题地图"

## [2026-04-18] refactor | retrofit 10 legacy Raws with understanding-focused elements

- **Reason**: 统一 Raw 格式——为早期 10 篇 5-section 简版补齐 5 个理解型元素（💡 一句话精华 / 🧬 Delta from 前作 / 🧩 因果链 / ⚠️ What would break this / 🧠 理解核验）
- **Affected files**: 2505-gigpo, 2507-arpo, 2509-empg, 2509-treegrpo, 2510-aepo, 2510-igpo, 2510-salt, 2601-at2po, 2601-matchtir, 2602-rlanything
- **Approach**: Augment only — 不删不改原有内容，只在对应 section 后插入新元素
- **Cross-refs updated**: 无（本次不涉及改 Wiki 或 cross-link）
- **SALT note**: 仅基于 abstract，5 个元素含"(推测)"标注和 "待补" 状态

## [2026-04-18] compile | full batch (10 papers)

- **Raw added**: 2505-gigpo, 2507-arpo, 2509-treegrpo, 2509-empg, 2510-aepo, 2510-salt, 2601-at2po, 2601-matchtir
- **Raw existed**: 2602-rlanything, 2510-igpo
- **Wiki touched**:
  - Updated: Credit-Assignment-in-Agentic-RL (full cross-paper integration)
  - Created: Entropy-Guided-Exploration, Turn-Level-Reward
- **New infrastructure**: index.md, log.md, coverage tags in schema
- **Rationale**: user wanted full batch ingest of the 8 pending papers; used this as the first real compile to verify LLM Wiki workflow scales

## [2026-04-17] ingest | 2510-igpo + 2602-rlanything (demo seed)

- Created first Raw notes as demo of Karpathy LLM Wiki pattern
- Created first Wiki page: Credit-Assignment-in-Agentic-RL
- Purpose: validate format before committing to full batch

## [2026-04-17] init | PaperNotes repo

- Folder structure: Raw/, Wiki/, attachments/
- schema.md scaffold
- Pushed to https://github.com/newshawn/paper-notes
