# Dev Cockpit Workflow

`dev-cockpit.html` 现在只做一件事：渲染和同步审阅 `HTML + Markdown` plan artifact。

真正的流程规则写在 [`plan-artifact-pipeline.md`](plan-artifact-pipeline.md)。页面只是一个轻量工具：

- 粘贴 `plan-review.html`，用 iframe 预览给人看。
- 粘贴 `plan-review.md`，渲染成可读 Markdown 给 agent 看。
- 复制 pipeline 规则或 plan 生成指令。
- 人类确认 HTML 没问题后，复制最终 Markdown 给 agent 执行。

## 最小 pipeline

```text
需求 prompt
-> agent 读取规则和相关文件
-> agent 生成 plan-review.html + plan-review.md
-> 人类审阅 HTML
-> 有问题就反馈，agent 同步修改 HTML 和 Markdown
-> HTML 通过后，把 Markdown 交给 agent 执行
```

## 生成页面

```bash
node scripts/build-dev-cockpit.mjs
```

生成器会读取 [`plan-artifact-pipeline.md`](plan-artifact-pipeline.md)，然后写入 `dev-cockpit.html`。

## 使用方法

1. 打开 `dev-cockpit.html`。
2. 在“需求 Prompt”里写需求。
3. 点击“复制 plan 生成指令”，交给 agent。
4. agent 返回两个 code block：`plan-review.html` 和 `plan-review.md`。
5. 把 HTML 和 Markdown 粘贴回页面。
6. 只审阅 HTML：它是否讲清当前项目模块、需求模块、数据流、具体例子、风险和验收方式。
7. 如果 HTML 有问题，把问题反馈给 agent，并要求同步修改 HTML 和 Markdown。
8. 反复迭代，直到 HTML 没问题。
9. 复制最终 Markdown 给 agent 执行。

## 为什么需要 Markdown 规则

规则写在 Markdown 里，比写死在 HTML 里更容易维护，也更容易迁移到别的项目。

别的项目复用这个 pipeline 时，只需要替换规则里的项目约束：

- 前端项目：换成 `README.md`、`package.json`、`src/`、测试命令、设计系统规则。
- 算法项目：换成核心模块、数据格式、实验脚本、评测命令。
- PaperNotes：保留 `AGENTS.md`、`schema.md`、`log.md`、`Raw/`、`Wiki/` 的规则。

## 最小 demo

页面内置“载入 ingest demo”。这个 demo 展示：

- 当前 ingest 模块如何实现。
- 优化后的 ingest 模块如何设计。
- 数据如何从用户输入流到 Raw draft、lint、review report、log。
- 缺 `Tags`、越界 tag、缺 `What would break this` 时应该出现什么反馈。
- Markdown 如何变成可交给 agent 执行的计划。

## 维护规则

- 改页面结构：编辑 `scripts/build-dev-cockpit.mjs`，再运行 `node scripts/build-dev-cockpit.mjs`。
- 改 pipeline：编辑 `docs/plan-artifact-pipeline.md`，再重新生成页面。
- `dev-cockpit.html` 是生成物，不手改。
- 这个工作流不改变 Raw/Wiki 的两阶段规则；ingest 仍只动 `Raw/` 和 `log.md`，compile 才能更新 `Wiki/`。
