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
5. 重复审阅和修改，直到人类认为 HTML 没问题。
6. 人类把最终 Markdown 交给 agent 执行。
7. Agent 按 Markdown 执行代码修改、验证、记录和提交。

## HTML 标准结构

`plan-review.html` 应该是一个小型设计评审页面，而不是普通 markdown 的换皮。

推荐固定成 9 个区域：

1. **任务一句话**：用一句话说明这次要解决什么问题。
2. **当前工作区状态**：只展示当前任务相关模块、关键文件、最近约束和现有入口。
3. **证据来源**：列出每个关键事实来自哪个文件；无法确认的内容标为推断。
4. **当前流程 / 数据流**：展示改动前输入如何进入系统、经过哪些步骤、输出到哪里。
5. **目标流程 / 数据流**：展示改动后流程如何变化，以及新增模块的职责边界。
6. **改动前后对比**：用表格说明哪些行为保持不变、哪些会变化、哪些明确不做。
7. **具体 demo**：从一个真实或高度贴近真实的用户输入开始，串起当前流程、目标流程、预期输出和错误例子。
8. **可靠性评估**：说明这个 plan 为什么安全、哪里还有不确定点、需要人类确认什么。
9. **验收方式**：说明如何判断 plan 和后续实现是正确的。

当前工作区状态必须是 task-scoped：

- 应该展示：相关文件、相关模块、相关数据流、相关测试、相关约束。
- 不应该展示：和任务无关的全仓库目录、无关模块介绍、装饰性统计。
- 如果任务影响范围不清楚，HTML 应把“不确定影响范围”作为风险列出。

具体 demo 必须端到端：

- 从用户实际会输入的东西开始，例如论文链接、表单输入、API 请求、配置片段、数据样例或命令。
- 展示这个输入在当前系统中会怎样流动。
- 展示优化后会多经过哪些检查、模块或状态。
- 展示至少一个成功输出和两个失败 / 边界例子。
- 如果项目类型不明确，agent 应根据项目地图自行选择最自然的例子，并把选择理由写进 HTML。

证据来源建议格式：

| 判断 | 来源 | 状态 |
|---|---|---|
| ingest 只动 Raw/ 和 log.md | `AGENTS.md` | confirmed |
| Raw 需要 5-section | `schema.md` | confirmed |
| 当前没有脚本化 ingest lint | repo scan | inferred |

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

Markdown 应尽量短而准：

- 用文件路径和命令，不写长篇解释。
- 清楚列出“要改的文件”和“不能碰的文件”。
- 把 HTML 中的人类评审结论转成执行步骤。
- 如果 HTML 里有待确认项，Markdown 中必须保留 blocking condition。

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
