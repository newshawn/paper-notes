# Log

> Append-only 时间线。每次 ingest / compile / lint 追加一条。
> 格式：`## [YYYY-MM-DD] <action> | <target>`
> action ∈ {ingest, compile, lint, rename, refactor}

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
