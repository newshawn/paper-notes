# 开发评审工作流

`dev/index.html` 现在只做一件事：渲染 `HTML + Markdown` plan artifact。

真正的流程规则写在 [`plan-artifact-pipeline.md`](plan-artifact-pipeline.md)，项目模块分布写在 [`project-map.md`](project-map.md)。页面只是一个轻量渲染器：

- 粘贴 `plan-review.html`，用 iframe 预览给人看。
- 粘贴 `plan-review.md`，渲染成可读 Markdown 给 agent 看。

## 最小 pipeline

```text
需求 prompt
-> agent 读取 pipeline 规则和项目地图
-> agent 根据项目地图定位相关文件
-> agent 生成 plan-review.html + plan-review.md
-> 运行 artifact lint 检查结构完整性
-> 人类审阅 HTML
-> 有问题就反馈，agent 同步修改 HTML 和 Markdown
-> HTML 通过后，把 Markdown 交给 agent 执行
-> 执行后回填实际改动、验证结果和是否需要更新项目地图
```

## 生成页面

```bash
node scripts/build-dev-renderer.mjs
```

生成器会写入 `dev/index.html`，并在根目录生成一个兼容旧链接的 `dev-cockpit.html` 跳转页。

## 使用方法

1. 打开 `dev/`。
2. 把 agent 生成的 `plan-review.html` 粘贴到 HTML 输入框。
3. 把 agent 生成的 `plan-review.md` 粘贴到 Markdown 输入框。
4. 可选但推荐：把两份内容保存成文件后运行 artifact lint。
5. 先审阅 HTML：它是否把“当前工作区状态”和“计划要做的改动”放在同一个画布里讲清楚。
6. 如果 HTML 有问题，把问题反馈给 agent，并要求同步修改 HTML 和 Markdown。
7. 反复迭代，直到 HTML 没问题，且 lint 没有必需项缺失。
8. 复制最终 Markdown 给 agent 执行。
9. 执行结束后，让 agent 回填实际改动、验证结果、计划偏离和项目地图是否需要更新。

如果你把 artifact 保存为 `plan-review.html` 和 `plan-review.md`，可以这样检查：

```bash
node scripts/check-plan-artifact.mjs plan-review.html plan-review.md
```

这个检查只说明“结构是否完整”，不说明“方案一定正确”。报错时先补齐缺失部分；warning 通常代表 HTML 还能更好 review，或者 Markdown 的执行交接不够稳。

## 术语小抄

这些词经常出现在 plan artifact 里，新手可以先按下面理解：

| 术语 | 意思 |
|---|---|
| `blocking` | 阻断项。必须先解决，否则不要执行代码。比如会误改 `Wiki/`、缺少关键文件证据、用户还没拍板。 |
| `warning` | 警告项。可以继续 review，但执行前最好确认或记录风险。比如旧文件格式不完整但不打算 retrofit。 |
| `info` | 提示项。帮助理解上下文，不影响是否执行。 |
| `verdict` | 评审结论。告诉你当前计划是“建议继续”“需要补证据”还是“不建议执行”。 |
| `approved` | 人类已经确认 HTML 计划合理，可以把同步 Markdown 交给 agent 执行。 |
| `handoff` | 交接。说明什么时候从“看 HTML 审计划”进入“按 Markdown 执行”。 |
| `Change Scope` | 改动范围。列清 will change / might change / must not change，防止误伤无关文件。 |
| `artifact lint` | 结构检查。它只检查 HTML/Markdown 有没有必要栏目，不代表方案一定正确。 |
| `Evidence-backed Claims` | 有证据支撑的判断。每个关键判断都要说明来自哪个文件；没有证据就标成推断或待确认。 |

审阅 HTML 时，优先看 10 件事：

- Review Verdict：顶部是否说明建议继续、需要补证据，还是不建议执行。
- 当前状态：是否只展示和这次任务相关的模块、文件、流程和约束。
- 证据来源：关键判断是否标明来自哪个文件，还是只是推断。
- 目标状态：是否讲清改完以后流程如何变化。
- Change Scope：是否明确 will change / might change / must not change，尤其是会涉及哪些代码或文件。
- 文件预览：每个 will change 文件是否说明“为什么会动”和“大概会怎么动”。
- 具体 demo：是否有输入、输出、错误 case 或 UI 状态，能帮助你判断 plan 好坏。
- Human Decisions：是否把需要你拍板的事项单独列出来，并给出推荐答案。
- Acceptance Checklist：是否能让你逐项确认“我理解并接受这个计划”。
- Execution Handoff：是否说明执行后要回填实际改动、验证结果和计划偏离。

## 不会写 prompt 怎么办

先不要写完整 prompt。新手只要填 3 行，任何项目都可以用：

```text
我想做的事：
我现在不确定的点：
我希望 HTML 帮我看清：
```

例如：

```text
我想做的事：优化 ingest 模块，让 Raw 生成前后更稳定。
我现在不确定的点：不知道应该在哪里加校验，也怕误改 Wiki 或旧 Raw。
我希望 HTML 帮我看清：当前 ingest 流程、要新增的模块、数据流、错误例子、验收方式。
```

然后把它包进这个固定模板发给 agent：

```text
请进入 plan 模式，不要直接改代码。

我会用 dev/ 渲染你生成的 plan artifact。请先读取：
- dev/plan-artifact-pipeline.md
- dev/project-map.md（如果没有，请先根据当前项目生成一份最小项目地图）
- 当前项目的 README / agent 规则 / package 或配置文件 / 最近变更记录

如果这些文件不存在，请不要卡住；请先说明缺失项，再根据目录结构和可读文件推断。

我的需求：
<把上面 3 行粘到这里>

如果我没有写清楚相关文件，请你根据 dev/project-map.md 自己定位，并在 plan-review.md 里列出你实际读取或建议读取的文件。

请输出两份同步内容：
1. plan-review.html：给人看的 HTML 评审稿。
2. plan-review.md：给 agent 执行的 Markdown 计划。

HTML 请优先讲清：
- Review Verdict：建议继续 / 需要补证据 / 不建议执行，可靠性高 / 中 / 低，以及 blocking risk 和 human decisions 数量。
- 当前工作区状态：只展示和这次任务相关的模块、文件、流程和约束。
- Evidence-backed Claims：关键判断来自哪些文件；不确定的内容标为“推断”或“待确认”，并说明如果判断错了会有什么影响。
- 当前流程和目标流程：改动前后数据流 / 控制流如何变化。
- Change Scope：明确 will change / might change / must not change，尤其说明会涉及哪些代码或文件，以及为什么。
- 改动前后对比：哪些行为保持不变，哪些会变化，哪些明确不做。
- 具体 demo：从一个真实或最自然的用户输入开始，展示它在当前流程和目标流程中的流动，并给出成功输出与失败 / 边界 case。
- Human Decisions：把需要我拍板的问题集中列出。
- Acceptance Checklist：让我可以逐项确认是否通过 review。
- Execution Handoff：说明只有 HTML verdict approved 且 blocking decisions resolved 后，Markdown 才能执行。
- Post-execution Handoff：说明执行后要回填实际改动文件、验证结果、计划偏离，以及是否需要更新 dev/project-map.md。

如果我没有给具体例子，请你根据项目类型自行选择最自然的例子，并在 HTML 里说明为什么选这个例子。

不要执行代码修改。等我 review HTML 通过后，再决定是否执行 Markdown 计划。
```

如果是自己的项目，先让 agent 生成 `dev/project-map.md`：

```text
请先为当前项目生成 dev/project-map.md，不要改业务代码。

请读取 README、agent 规则、配置文件、测试命令、主要源码目录和最近变更记录。
然后写一份项目地图，包含：
- 项目目标和技术栈。
- 顶层模块职责。
- 常见需求应该从哪些文件开始读。
- 关键数据流或控制流。
- 测试 / 构建 / lint 命令。
- 不能破坏的约束。

不要罗列所有文件，只写能帮助后续生成 plan-review.html 和 plan-review.md 的导航信息。
```

写需求时，只要尽量回答这 5 个问题即可：

- 想改什么：功能、流程、文档、UI、算法或数据结构。
- 为什么改：现在哪里不稳定、不好读、不好维护或容易出错。
- 怕什么：哪些目录不能碰、哪些行为不能破坏。
- 想看到什么例子：输入、输出、错误 case、UI 状态或测试故事。
- 怎么算通过：命令检查、人工 review、截图、样例输出或 lint。

如果这些也说不清，就直接写：

```text
我只知道大概想优化 <模块名>，但不确定怎么拆需求。
请先根据 dev/project-map.md 生成一个提问清单，问我 3-5 个必须回答的问题；
等我回答后，再生成 plan-review.html 和 plan-review.md。
```

## 通用 demo：优化登录错误提示

这个 demo 可以放到大多数 Web / App 项目里试跑。它不要求真的执行代码，只要求 agent 先产出 HTML+Markdown plan artifact。

```text
请进入 plan 模式，不要直接改代码。

我会用 dev/ 渲染你生成的 plan artifact。请先读取：
- dev/plan-artifact-pipeline.md
- dev/project-map.md（如果没有，请先生成最小项目地图）
- README、项目配置文件、测试命令说明
- 和登录 / 认证 / 表单 / API 请求相关的文件

需求：
优化登录错误提示。现在用户登录失败时，不清楚是邮箱格式错误、密码错误、网络失败、账号不存在，还是后端返回了不可展示的错误。

目标：
- 先画清当前登录流程：表单输入 -> 前端校验 -> API 请求 -> 后端响应 -> UI 展示。
- 设计更稳定的错误分类和展示方式。
- 避免泄露敏感信息，例如不要明确告诉攻击者“这个邮箱已注册”。
- 不影响注册、找回密码和已有 session 逻辑。

请输出两份同步内容：
1. plan-review.html：给人看的 HTML 评审稿。
2. plan-review.md：给 agent 执行的 Markdown 计划。

HTML 必须包含：
- Review Verdict：是否建议执行、可靠性、blocking risk 和需要用户确认的事项。
- 当前登录相关模块和职责。
- 每个关键判断的证据来源；无法确认的地方标为推断。
- 当前登录流程和目标登录流程。
- Change Scope：预计涉及哪些前端、后端、API、测试或文档文件；哪些认证/session 文件不能乱动。
- 优化后的错误分类表。
- 改动前后对比。
- 端到端具体例子：用户输入邮箱和密码后，如何经过前端校验、API 请求、后端响应和 UI 展示。
- 至少 3 个失败 / 边界例子：邮箱格式错误、密码错误、网络失败。
- Human Decisions、风险边界、验收方式和执行前 checklist。
- Post-execution Handoff：执行后回填实际改动文件、验证结果、偏离计划的地方，以及是否需要更新项目地图。

不要执行代码修改。等我 review HTML 通过后，再决定是否执行 Markdown 计划。
```

## PaperNotes demo：优化 ingest 模块

这个 demo 的目标不是马上执行代码，而是先跑通“生成可审阅 plan artifact”的流程。

完整示例已经放在 `dev/examples/`：

- 在线预览：[Ingest Plan Review Example](https://newshawn.github.io/paper-notes/dev/examples/ingest-plan-review.html)
- [`examples/ingest-plan-review.html`](examples/ingest-plan-review.html)：粘到渲染器的 HTML 输入框。
- [`examples/ingest-plan-review.md`](examples/ingest-plan-review.md)：粘到渲染器的 Markdown 输入框。

它展示了一个合格 plan artifact 应该怎么把当前仓库状态、证据来源、目标流程、Change Scope、端到端 demo、Human Decisions、Acceptance Checklist 和执行交接放在同一个 review 页面里。

### 1. 打开渲染器

在线使用：

```text
https://newshawn.github.io/paper-notes/dev/
```

本地使用：

```bash
node scripts/build-dev-renderer.mjs
```

然后打开 `dev/index.html`。

### 2. 把这个 prompt 发给 agent

```text
请进入 plan 模式，不要直接改代码。

需求：
优化当前 ingest 模块：在生成 Raw 前后加入结构化校验和可审阅报告，
确保 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录都稳定；
保持 ingest 只动 Raw/ 和 log.md，不触碰 Wiki/。

请先读取：
- AGENTS.md
- schema.md
- log.md 顶部
- dev/plan-artifact-pipeline.md
- dev/project-map.md
- Raw/2510-igpo.md 或 Raw/2601-at2po.md 作为 Raw 样例

请输出两份内容：
1. plan-review.html：给人看的 HTML 评审稿。
2. plan-review.md：给 agent 执行的 Markdown 计划。

HTML 必须包含：
- Review Verdict：是否建议执行、可靠性、blocking risk 和需要用户确认的事项。
- 当前 ingest 流程如何工作。
- 这些判断分别来自 `AGENTS.md`、`schema.md`、`log.md`、Raw 样例还是推断。
- 这次优化会新增哪些模块，例如 Preflight、Template Guard、Tag Guard、Review Report。
- 用户输入到 Raw/log 写入之间的数据流。
- Change Scope：明确可能新增或修改哪些文件，例如 `scripts/ingest-review.mjs`、`docs/ingest-review.md`、`AGENTS.md`、`dev/project-map.md`、`log.md`；并明确不得修改 `Wiki/`、`index.md`、已有 Raw。
- 改动前后对比：保持不变、会变化、明确不做。
- 端到端具体例子：用户输入 `帮我 ingest 这篇论文：https://arxiv.org/abs/2510.14967` 后，如何查重、发现已有 `Raw/2510-igpo.md`、生成 duplicate report 并停止写入。
- 另给一个新论文链接样例，展示通过 preflight 后如何生成 Raw draft、跑 Template Guard / Tag Guard、生成 Review Report，再决定是否写入 Raw/log。
- 至少 3 个失败 / 边界例子：缺 Tags、tag 越界、缺理解型元素。
- Human Decisions：例如缺理解型元素算 warning 还是 blocking、是否新增脚本、Review Report 是否落盘。
- 风险边界、验收方式和执行前 checklist。
- Post-execution Handoff：执行后回填实际改动文件、验证结果、是否偏离 HTML plan，以及是否需要更新 `dev/project-map.md`。

Markdown 必须和 HTML 同步；只有 HTML verdict approved 且 blocking decisions resolved 后，Markdown 才能交给 agent 执行。
```

### 3. 粘贴并 review

把 agent 返回的 `plan-review.html` 粘到 HTML 输入框，把 `plan-review.md` 粘到 Markdown 输入框。

只看 HTML，重点检查：

- 顶部 Review Verdict 是否建议继续，还是需要补证据 / 先解决 blocking decision。
- 是否讲清楚现有 ingest 怎么做。
- 是否讲清楚优化后的模块边界。
- Change Scope 是否说明会涉及哪些代码 / 文档文件，以及哪些目录绝对不能碰。
- 数据流是否能解释“为什么这样改更稳定”。
- 例子是否具体到可以判断 plan 好坏。
- Human Decisions 是否集中列出，而不是散在正文里。
- Markdown 是否能在 HTML 通过后交给 agent 执行。
- 执行后回填是否要求 agent 说明实际改动、验证结果和计划偏离。

如果不满意，就直接反馈：

```text
这个 HTML 还没有讲清楚 Tag Guard 如何根据 schema.md 的受控标签判断越界。
请补一个具体例子，并同步更新 plan-review.md。
```

确认 HTML 合理后，再决定是否把 Markdown 交给 agent 执行。

## 为什么需要 Markdown 规则和项目地图

规则写在 Markdown 里，比写死在 HTML 里更容易维护，也更容易迁移到别的项目。项目地图把“这个项目有哪些模块、每个模块做什么、该去哪里读详细代码”单独抽出来，能帮助 agent 组织 prompt，也能让生成的 HTML 更贴近真实代码结构。

别的项目复用这个 pipeline 时，只需要替换规则和项目地图：

- 前端项目：换成 `README.md`、`package.json`、`src/`、测试命令、设计系统规则。
- 算法项目：换成核心模块、数据格式、实验脚本、评测命令。
- PaperNotes：保留 `AGENTS.md`、`schema.md`、`log.md`、`Raw/`、`Wiki/` 的规则。

生成项目地图的建议：

1. 让 agent 读取 README、agent 规则、schema / config、最近 log。
2. 扫描顶层目录和关键源码目录。
3. 为每个模块写职责、关键文件、常见改动入口、验证命令和约束。
4. 新增 / 重命名模块、改变工作流边界或新增生成脚本时，实时更新项目地图。

## 维护规则

- 改页面结构：编辑 `scripts/build-dev-renderer.mjs`，再运行 `node scripts/build-dev-renderer.mjs`。
- 改 pipeline：编辑 `dev/plan-artifact-pipeline.md`。
- 改项目分布：编辑 `dev/project-map.md`。
- `dev/index.html` 和根目录 `dev-cockpit.html` 是生成物，不手改。
- 这个工作流不改变 Raw/Wiki 的两阶段规则；ingest 仍只动 `Raw/` 和 `log.md`，compile 才能更新 `Wiki/`。
