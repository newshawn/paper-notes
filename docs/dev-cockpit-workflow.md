# 开发工作台工作流

`dev-cockpit.html` 是本仓库的开发计划层。它借鉴 html-effectiveness 的思路：把选择任务、制定计划、比较方案、查看 demo 和导出 prompt 放进一个自包含页面，避免把所有东西堆成很长的 markdown。

## 真相源

- 源码、Markdown 文档、`Raw/`、`Wiki/`、`schema.md` 和 `log.md` 仍然是真相源。
- `dev-cockpit.html` 是生成物，只帮助规划开发，不应该手改。
- 生成器是 `scripts/build-dev-cockpit.mjs`。

## 生成

```bash
node scripts/build-dev-cockpit.mjs
```

生成器会扫描仓库文件、最近的 `log.md` 记录，以及轻量 Raw/Wiki 摘要，然后写入 `dev-cockpit.html`。

## 推荐流程

1. 打开 `dev-cockpit.html`。
2. 默认优先选“做计划”：日常开发最重要的是先得到清晰、可执行、可验证的 plan。
3. 如果需求还模糊，选“探索”；如果需要示例支撑，选“做 Demo”；如果只是想先看仓库，选“先理解”。
4. 写一句需求。
5. 填相关关键词，例如文件路径、模块、概念或 tag。
6. 看执行计划、风险、demo 草图和相关文件。
7. 复制生成的 LLM prompt 或 markdown 计划。
8. 让 LLM 在仓库里执行；如果修改了生成器或上下文，再重新生成 `dev-cockpit.html`。

## 维护规则

改工作台结构或交互时，编辑 `scripts/build-dev-cockpit.mjs` 并重新生成 `dev-cockpit.html`。Demo 保持小而直观；真正的生产行为应该留在源码里，而不是藏进生成 HTML。
