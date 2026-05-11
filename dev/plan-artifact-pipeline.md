# 计划产物 Pipeline

这份规则用于指导 agent 在进入 plan 模式后，先生成可供人类审阅的 `HTML + Markdown` plan artifact，再进入代码执行。

## 核心目标

不要直接开始改代码。先把需求、当前项目事实、改动方案和具体例子组织成两份同步产物：

- `plan-review.html`：给人类看的可视化评审稿。
- `plan-review.md`：给 agent 执行的 markdown 计划。

HTML 负责降低阅读成本，Markdown 负责稳定执行。两者必须表达同一份 plan。

关键原则：

- HTML 不是全仓库概览，只渲染和当前任务相关的工作区状态。
- HTML 的目标是帮助人判断“这个 plan 是否可靠、哪里还不确定、哪里还能优化”。
- Markdown 不重复 HTML 的展示逻辑，只保留 agent 可执行的步骤、约束和验收方式。
- 关键判断必须标出证据来源；没有证据时明确写“推断”或“待确认”。
- 面向新手时，HTML 必须解释关键术语，尤其是 blocking、warning、verdict、handoff、change scope、artifact lint 这类评审词。
- HTML 必须优先服务“人看懂再决定”，不能只输出工程标签、错误码或模块名；任何风险、失败路径和用户决策都要翻译成自然语言。

## 项目地图

在生成 plan artifact 前，agent 应先读取项目地图：

- 默认文件：`dev/project-map.md`
- 作用：说明每个模块在做什么、关键文件在哪里、常见改动入口是什么、哪些约束不能破坏。
- 用法：先用项目地图定位相关模块，再深入读取具体源码、文档、接口、测试、数据样例或领域资料。

如果项目还没有 `dev/project-map.md`，先生成一版最小项目地图：

1. 读项目 README、agent 规则、schema / config、最近 log。
2. 扫描顶层目录和关键源码目录。
3. 为每个模块写：职责、关键文件、常见改动入口、验证命令、约束。
4. 不要列出每个文件；只写能帮助 plan 和 review 的导航信息。
5. 生成后把它作为后续 plan 的必读文件。

维护规则：

- 新增 / 重命名顶层模块时，更新项目地图。
- 改变模块职责、边界、生成命令或验证命令时，更新项目地图。
- 每次明显改变开发工作流时，更新项目地图和本 pipeline。

## 标准 pipeline

1. 用户进入 plan 模式，说明需求、背景、约束和希望优化的目标。
2. Agent 读取项目规则和相关文件。
   - 通用项目：先读 `README`、agent 规则、配置文件、测试命令和最近变更记录。
   - 再读 `dev/project-map.md`；如果没有项目地图，先生成最小版本。
   - 最后根据需求读取相关源码、文档、接口、测试或参考文件。
   - PaperNotes 示例：先读 `AGENTS.md`、`schema.md`、`log.md` 顶部，再读 `dev/project-map.md`，最后按需求读取 `Raw/`、`Wiki/` 或 HTML review 相关文件。
3. Agent 生成 plan artifact。
   - HTML 展示给人看。
   - Markdown 交给 agent 执行。
4. 人类审阅 HTML。
   - 如果 HTML 没讲清现有系统、目标方案、数据流、例子或风险，就提出问题。
   - Agent 根据反馈同步修改 HTML 和 Markdown。
5. 运行 artifact lint，检查 HTML / Markdown 是否包含必要的 review 和执行结构。
6. 重复审阅和修改，直到人类认为 HTML 没问题，且 lint 没有必需项缺失。
7. 人类把最终 Markdown 交给 agent 执行。
8. Agent 按 Markdown 执行代码修改、验证、记录和提交。
9. Agent 执行后回填实际改动、偏离计划的地方、验证结果，以及是否需要更新 `dev/project-map.md`。

## HTML 标准结构

`plan-review.html` 应该是一个小型设计评审页面，而不是普通 markdown 的换皮。

推荐固定成 11 个区域：

1. **Review Verdict**：顶部给出建议结论、可靠性、blocking risk 数量、需要用户确认的事项数量。
2. **当前工作区状态**：只展示当前任务相关模块、关键文件、最近约束和现有入口。
3. **Evidence-backed Claims**：每个关键判断都写 claim、evidence、confidence、impact if wrong。
4. **当前流程 / 数据流**：展示改动前输入如何进入系统、经过哪些步骤、输出到哪里。
5. **目标流程 / 数据流**：展示改动后流程如何变化，以及新增模块的职责边界。
6. **Change Scope**：明确 will change / might change / must not change，尤其说明会涉及哪些代码或文件。
7. **改动前后对比**：用表格说明哪些行为保持不变、哪些会变化、哪些明确不做。
8. **End-to-End Demos**：从真实用户输入开始，展示 success / blocked / warning 三条路径。
9. **Human Decisions**：把需要用户拍板的事项单独列出，避免散在风险段落里。
10. **Acceptance Checklist**：用 checklist 帮用户确认是否理解当前流程、目标流程、改动范围、风险和验收方式。
11. **Execution Handoff**：说明 Markdown 只有在 verdict approved 且 blocking decisions resolved 后才能执行。

如果页面里出现英文评审词，应在开头或 Review Verdict 附近加一个简短“术语小抄”：

| 术语 | 给新手的解释 |
|---|---|
| blocking | 必须先解决，否则不能执行。 |
| warning | 可以继续 review，但执行前最好确认或记录风险。 |
| info | 只是提示信息，不影响执行。 |
| verdict | 这份计划当前是否建议继续的总体判断。 |
| approved | 人类已经确认 HTML 合理，可以进入执行阶段。 |
| handoff | 从“评审用 HTML”交接到“执行用 Markdown”的边界和条件。 |
| Change Scope | 这次会改、可能会改、绝对不能改的文件范围。 |
| artifact lint | 检查 HTML/Markdown 是否包含必要结构；它不判断方案是否正确。 |

## HTML 可读性约束

所有面向人类 review 的 HTML 都必须遵守这些约束：

- **先说人话，再给术语**：可以保留 `blocking`、`warning`、`duplicate` 这类标签，但必须先用自然语言解释。
- **失败 / 边界 case 三件套**：每个失败或边界例子都要写清：
  - 发生了什么：用户输入触发了哪个事实或冲突。
  - 为什么重要：如果继续执行，会带来什么坏结果。
  - 下一步怎么做：用户应该确认、补充、停止，还是改走另一个路径。
- **风险不是口号**：不能只写“风险：误改文件”，要说明误改哪个文件、为什么会坏、如何避免。
- **Human Decisions 必须可拍板**：每个问题都要有推荐答案、备选答案、默认行为和不拍板时的后果。
- **Change Scope 必须可检查**：每个 will change 文件都要说明“为什么动”和“大概怎么动”；每个 must not change 都要说明“为什么不能动”。
- **不要只放机器输出**：错误码、CLI 输出和 report 摘要可以出现，但旁边必须有给人的解释。

Review Verdict 推荐格式：

| 字段 | 值 |
|---|---|
| Recommendation | proceed after decisions / needs evidence / do not execute |
| Confidence | high / medium / low |
| Blocking risks | 数量 + 一句话摘要 |
| Human decisions | 数量 + 一句话摘要 |
| Execution state | not ready / ready after approval / approved |

Change Scope 必须列清楚：

- **Will change**：预计需要修改或新增的代码 / 文档 / 配置文件。
- **Might change**：取决于用户决策或实现细节的文件。
- **Must not change**：明确禁止修改的目录或文件。
- **Why**：每个 will change 文件都要说明为什么会涉及。
- **Diff preview**：用一两句话说明每个文件预计会出现哪类变化，例如新增校验函数、补测试、更新文档、只追加 log。

当前工作区状态必须是 task-scoped：

- 应该展示：相关文件、相关模块、相关数据流、相关测试、相关约束。
- 不应该展示：和任务无关的全仓库目录、无关模块介绍、装饰性统计。
- 如果任务影响范围不清楚，HTML 应把“不确定影响范围”作为风险列出。

具体 demo 必须端到端：

- 从用户实际会输入的东西开始，例如论文链接、表单输入、API 请求、配置片段、数据样例或命令。
- 展示这个输入在当前系统中会怎样流动。
- 展示优化后会多经过哪些检查、模块或状态。
- 展示至少一个成功输出和两个失败 / 边界例子。
- 失败 / 边界例子不能只写错误码；必须用人话说明“发生了什么、为什么不能继续、用户下一步该怎么做”。
- 如果项目类型不明确，agent 应根据项目地图自行选择最自然的例子，并把选择理由写进 HTML。

Evidence-backed Claims 推荐格式：

| Claim | Evidence | Confidence | Impact if wrong |
|---|---|---|---|
| ingest 只动 Raw/ 和 log.md | `AGENTS.md` | high | 可能误改 Wiki |
| Raw 需要 5-section | `schema.md` | high | Raw 结构不稳定 |
| 当前没有脚本化 ingest lint | repo scan | medium | 可能重复造工具 |

End-to-End Demos 推荐固定三条：

- **Success path**：合法输入如何通过当前流程和目标流程，最终输出什么。
- **Blocked path**：重复、越界、非法输入如何被阻止；同时说明继续执行会造成什么坏结果，以及推荐用户做什么。
- **Warning path**：不确定或可修复问题如何交给用户判断；同时说明它为什么不是立刻阻断。
- 三条路径的标题格式应保持一致，例如 `Success path：...`、`Blocked path：...`、`Warning path：...`；具体解释放在冒号后或正文里，不要其中一条突然换成完全不同的命名方式。

Human Decisions 必须集中、可拍板：

- 每个问题都写清为什么需要人决定。
- 每个问题都给一个推荐答案和至少一个备选答案。
- 如果推荐答案被接受，说明 Markdown 会如何执行。
- 如果用户不拍板，Markdown 必须把它保留为 blocking condition。

Artifact lint：

- 生成或修改 `plan-review.html` / `plan-review.md` 后，推荐运行：

```bash
node scripts/check-plan-artifact.mjs plan-review.html plan-review.md
```

- lint 只检查结构完整性，不代表方案一定正确。
- lint 报错表示缺少必要 review / 执行结构，应先补齐再让人 review。
- lint warning 表示可读性或执行交接可能不够好，需要 agent 判断是否补强。
- 通过 lint 后仍必须由人审阅 HTML；lint 不能代替人的判断。

## Markdown 必须包含

`plan-review.md` 必须能直接交给 agent 执行。

至少包含：

1. 需求摘要。
2. 必读文件。
3. 相关文件和参考文件，包括项目地图中指向的模块文档。
4. 执行步骤。
5. 需要保持的项目约束。
6. 验证命令或人工验收方式。
7. 完成后的记录 / 提交要求。
8. Execution gate：只有 HTML verdict approved 且 blocking decisions resolved 后才能执行。
9. Post-execution handoff：执行后必须回填实际改动、验证结果、计划偏离和项目地图维护判断。

Markdown 应尽量短而准：

- 用文件路径和命令，不写长篇解释。
- 清楚列出“要改的文件”和“不能碰的文件”。
- 把 HTML 中的人类评审结论转成执行步骤。
- 如果 HTML 里有待确认项，Markdown 中必须保留 blocking condition。
- Markdown 顶部必须引用 HTML verdict；如果 verdict 不是 approved，不得进入代码修改。

执行后回填必须包含：

- 实际修改 / 新增的文件。
- 和 HTML plan 一致的地方。
- 偏离 HTML / Markdown 的地方，以及为什么偏离。
- 实际运行的验证命令和结果。
- 是否需要更新 `dev/project-map.md`、README、agent 规则或其他 workflow 文档。
- 如果有未完成项，标成 follow-up，不要混在“已完成”里。

## 同步规则

HTML 和 Markdown 必须同步修改。

- 如果 HTML 中改变了模块设计，Markdown 的执行步骤也要更新。
- 如果 HTML 中新增风险，Markdown 也要加入注意事项或验证方式。
- 如果 Markdown 中改变了文件路径，HTML 的相关模块和数据流也要同步。

## PaperNotes demo：优化 ingest 模块

示例需求：

```text
优化当前 ingest 模块：在生成 Raw 前后加入结构化校验和可审阅报告，
确保 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录都稳定；
保持 ingest 只动 Raw/ 和 log.md，不触碰 Wiki/。
```

对应 HTML 应展示：

- 当前 ingest 如何实现：输入论文或笔记，读取 `schema.md` / `log.md` / existing Raw，查重，写 `Raw/<id>.md`，必要时保存 PDF，追加 `log.md`，不修改 `Wiki/`。
- 当前问题：规则靠 agent 记忆，tag 越界、ID 重复、section 缺失、Related Wiki 缺失、log 格式错误都可能晚发现。
- 优化模块：`Preflight`、`Template Guard`、`Tag Guard`、`Review Report`。
- 数据流：用户输入 -> preflight -> Raw draft -> template/tag lint -> review report -> 写 Raw/log。
- Change Scope：可能新增 `scripts/ingest-review.mjs` 或 `docs/ingest-review.md`；可能更新 `AGENTS.md`、`dev/project-map.md` 和 `log.md`；必须不改 `Wiki/`、`index.md` 和已有 Raw。
- 端到端例子：用户输入 `帮我 ingest 这篇论文：https://arxiv.org/abs/2510.14967` -> preflight 发现 `Raw/2510-igpo.md` 已存在 -> report 标为 duplicate blocking；另给一个新论文链接样例展示通过查重后如何生成 Raw draft。
- 错误例子：缺 `Tags` 报错；出现 `#entropy-guided` 提示映射到 `#entropy`；缺 `What would break this` 给 warning。
- 验收方式：构造最小 Raw 样例跑 lint；确认历史 Raw 只报告兼容问题，不自动 retrofit；确认 ingest 仍只动 `Raw/` 和 `log.md`。

对应 Markdown 应包含：

- 先读 `AGENTS.md`、`schema.md`、`log.md` 顶部。
- 再读 `dev/project-map.md`，定位 Raw / Wiki / HTML review layer / workflow docs 的职责。
- 读取现有 Raw 样例，如 `Raw/2510-igpo.md` 或 `Raw/2601-at2po.md`。
- 设计并实现 ingest lint / review report 的最小闭环。
- 更新相关文档和 `log.md`。
- 运行生成和检查命令。
- 不修改 `Wiki/`。
