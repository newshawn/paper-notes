# 想用这套模式做自己的领域？（Fork & Customize）

本 repo 既是"我的 agentic RL 论文笔记"，**也是可复用的模板**。plugin 本身领域无关——只要替换 schema.md 里领域特有的两个 section，就能用到任何研究方向。

## 🔴 要替换 vs 🟢 照搬

[`schema.md`](../schema.md) 的每个 section 都打了标签：

- **`[🔴 你的领域定制]`**：`研究方向` + `受控标签（Approved Tags）` —— 换成你的领域
- **`[🟢 通用 · 照搬]`**：目录结构 / 两阶段工作流 / Wiki 组织规则 / 整合规则 —— 不动

**只有两个 section 要改**，剩下都是跨领域通用的结构。

## 4 步 fork 流程

```bash
# 1. 在 GitHub 上 fork 本 repo 到你自己的账号，然后 clone
git clone https://github.com/<你的 GitHub 用户名>/paper-notes ~/Documents/MyPaperNotes
cd ~/Documents/MyPaperNotes

# 2. 清理示例内容（或保留作参考）
rm -rf Raw/*.md Raw/pdfs/*.pdf Wiki/*.md
echo "# Log" > log.md
echo "# Index" > index.md
# 或：git rm 后 commit 一次，历史里永远保留我的 Agentic RL 例子作参考

# 3. 用空模板重置 schema.md（推荐）
cp docs/schema-template.md schema.md
#    打开 schema.md 填你的领域信息（两个 [🔴] section）

# 4. 更新 settings.json 的 marketplace source
#    ~/.claude/settings.json 里把 newshawn/paper-notes 改成 <你的账号>/paper-notes
```

重启 Claude Code → 装上你自己 fork 的 plugin → 开始 ingest 你领域的论文。

## 适合哪些领域

理论上任何"读大量论文 + 需要跨论文综述"的场景：

- LLM Safety / Alignment
- Computer Vision / Multimodal
- 生物信息 / 基因编辑
- 认知科学 / 脑科学
- 密码学 / 系统安全
- 强化学习的其他子方向（RLHF、offline RL、world models...）

## 不适合

- 一次性看一两篇（用不上 Wiki 整合，直接 Obsidian 就行）
- 大量非学术内容（菜谱、读书笔记）——schema 约束会变累赘
- 不用 Claude Code 的场景（plugin 不生效；但 markdown wiki 结构本身仍有价值）

## 学习用途

如果你不打算用，只是想**理解这套方法**：

1. 读 [`README.md`](../README.md) 的 [🎯 新手入门](../README.md#-新手入门这套方法是怎么工作的)（为什么这么设计）
2. 读 [`plugin/README.md`](../plugin/README.md) 的 **Full pipeline ASCII 图**（整套链路可视化）
3. 读 [`schema.md`](../schema.md) 看具体规则长什么样
4. 读 [`plugin/skills/paper-notes/SKILL.md`](../plugin/skills/paper-notes/SKILL.md) 看 skill 的 6 步工作流

顺序：**宏观叙事 → 可视化 → 规则 → 执行**。
