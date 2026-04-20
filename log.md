# Log

> Append-only 时间线。每次 ingest / compile / lint 追加一条。
> 格式：`## [YYYY-MM-DD] <action> | <target>`
> action ∈ {ingest, compile, lint, rename, refactor}

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
