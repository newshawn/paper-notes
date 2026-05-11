# Plan Artifact Pipeline

这份规则用于指导 agent 在进入 plan 模式后，先生成可供人类审阅的 `HTML + Markdown` plan artifact，再进入代码执行。

## 核心目标

不要直接开始改代码。先把需求、当前项目事实、改动方案和具体例子组织成两份同步产物：

- `plan-review.html`：给人类看的可视化评审稿。
- `plan-review.md`：给 agent 执行的 markdown 计划。

HTML 负责降低阅读成本，Markdown 负责稳定执行。两者必须表达同一份 plan。

## 标准 pipeline

1. 用户进入 plan 模式，说明需求、背景、约束和希望优化的目标。
2. Agent 读取项目规则和相关文件。
   - 在 PaperNotes 中，先读 `AGENTS.md`、`schema.md`、`log.md` 顶部。
   - 再根据需求读取相关源码、文档、Raw、Wiki 或参考文件。
3. Agent 生成 plan artifact。
   - HTML 展示给人看。
   - Markdown 交给 agent 执行。
4. 人类审阅 HTML。
   - 如果 HTML 没讲清现有系统、目标方案、数据流、例子或风险，就提出问题。
   - Agent 根据反馈同步修改 HTML 和 Markdown。
5. 重复审阅和修改，直到人类认为 HTML 没问题。
6. 人类把最终 Markdown 交给 agent 执行。
7. Agent 按 Markdown 执行代码修改、验证、记录和提交。

## HTML 必须包含

`plan-review.html` 应该是一个小型设计评审页面，而不是普通 markdown 的换皮。

至少包含：

1. **当前项目模块**：当前相关模块、文件、流程或数据结构如何工作。
2. **需求对应模块**：这次需求会影响哪些模块，每个模块承担什么职责。
3. **数据流 / 控制流**：输入如何进入系统，经过哪些步骤，输出到哪里。
4. **具体例子**：给出最小输入、预期输出、错误例子、UI 状态或测试故事。
5. **改动计划**：按阶段说明要改哪些文件、怎么改、为什么这样改。
6. **风险和边界**：说明哪些事情不做，哪些约束不能破坏。
7. **验收方式**：说明如何判断 plan 和后续实现是正确的。

## Markdown 必须包含

`plan-review.md` 必须能直接交给 agent 执行。

至少包含：

1. 需求摘要。
2. 必读文件。
3. 相关文件和参考文件。
4. 执行步骤。
5. 需要保持的项目约束。
6. 验证命令或人工验收方式。
7. 完成后的记录 / 提交要求。

## 同步规则

HTML 和 Markdown 必须同步修改。

- 如果 HTML 中改变了模块设计，Markdown 的执行步骤也要更新。
- 如果 HTML 中新增风险，Markdown 也要加入注意事项或验证方式。
- 如果 Markdown 中改变了文件路径，HTML 的相关模块和数据流也要同步。

## 最小 demo：优化 ingest 模块

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
- 具体例子：缺 `Tags` 报错；出现 `#entropy-guided` 提示映射到 `#entropy`；缺 `What would break this` 给 warning。
- 验收方式：构造最小 Raw 样例跑 lint；确认历史 Raw 只报告兼容问题，不自动 retrofit；确认 ingest 仍只动 `Raw/` 和 `log.md`。

对应 Markdown 应包含：

- 先读 `AGENTS.md`、`schema.md`、`log.md` 顶部。
- 读取现有 Raw 样例，如 `Raw/2510-igpo.md` 或 `Raw/2601-at2po.md`。
- 设计并实现 ingest lint / review report 的最小闭环。
- 更新相关文档和 `log.md`。
- 运行生成和检查命令。
- 不修改 `Wiki/`。
