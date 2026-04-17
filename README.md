# Paper Notes — LLM Wiki

基于 Karpathy LLM Wiki 模式的自维护论文知识库。

## 结构

```
Raw/           每篇论文的原始 takeaway 笔记（我生成，append-only）
Wiki/          跨论文整合的概念页（AI 维护，会被改写）
attachments/   图片、图表
schema.md      知识库覆盖范围 + 组织规则（必读）
```

## 工作流

1. **摄入**：提供 arxiv 链接或 PDF
2. **Raw 笔记**：Claude 生成结构化 takeaway 到 `Raw/<paper-id>.md`
3. **Wiki 整合**（每周 / 每几篇攒一次）：Claude 读 `schema.md` + 新增 Raw，更新受影响的 Wiki 概念页，标记矛盾，按需新建概念
4. **审阅 & push**：你本地编辑器微调 → Claude 自动 commit & push

## 原则

- **Raw 只增不改**：论文的原始理解是历史记录
- **Wiki 是活的**：可以被新证据改写、可以标记矛盾
- **schema.md 是宪法**：定义领域边界和组织方式，所有整合决策以它为准
