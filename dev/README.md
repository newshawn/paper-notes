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
-> 人类审阅 HTML
-> 有问题就反馈，agent 同步修改 HTML 和 Markdown
-> HTML 通过后，把 Markdown 交给 agent 执行
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
4. 只审阅 HTML：它是否讲清当前项目模块、需求模块、数据流、具体例子、风险和验收方式。
5. 如果 HTML 有问题，把问题反馈给 agent，并要求同步修改 HTML 和 Markdown。
6. 反复迭代，直到 HTML 没问题。
7. 复制最终 Markdown 给 agent 执行。

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
