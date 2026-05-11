# 开发工作台工作流

`dev-cockpit.html` 是本仓库的 plan artifact review shell。它不负责自己“想出”最终计划，而是帮助你把需求和代码库上下文整理成一段 artifact 生成指令，让大模型生成 `plan-review.html` 和 `plan-review.md`。你再把 HTML / markdown 粘贴回页面审阅，确认合理后交给执行模型。

## 真相源

- 源码、Markdown 文档、`Raw/`、`Wiki/`、`schema.md` 和 `log.md` 仍然是真相源。
- `dev-cockpit.html` 是生成物，只帮助组织输入、预览大模型生成的 plan artifact，不应该手改。
- 生成器是 `scripts/build-dev-cockpit.mjs`。

## 生成

```bash
node scripts/build-dev-cockpit.mjs
```

生成器会扫描仓库文件、最近的 `log.md` 记录，以及轻量 Raw/Wiki 摘要，然后写入 `dev-cockpit.html`。

## 推荐流程

1. 打开 `dev-cockpit.html`。
2. 默认优先选“做计划”：日常开发最重要的是先得到清晰、可执行、可验证的 plan。
3. 写需求和上下文，填相关关键词。
4. 点击“复制 artifact 生成指令”，把它交给大模型。
5. 要求大模型返回两个 code block：`plan-review.html` 和 `plan-review.md`。
6. 把 HTML 和 markdown 粘贴回 `dev-cockpit.html` 预览。
7. 如果 HTML 里的代码库模块、需求模块、参考示例、plan demo、执行步骤不合理，就继续让大模型改 HTML+MD。
8. review 通过后，复制已审 markdown 或执行 prompt 给 LLM 执行。

## 维护规则

改工作台结构或交互时，编辑 `scripts/build-dev-cockpit.mjs` 并重新生成 `dev-cockpit.html`。真正的 plan demo 应该由大模型根据当前需求和代码库上下文生成；本页面只提供输入组织、预览和导出执行包。
