# 架构：Plugin / Skill / CLAUDE.md 三者的分工

本项目同时用了 Claude Code 的三种定制机制。理解它们的分工，就能明白每个文件在做什么、为什么这样切。

## 概念对比

| 维度 | Plugin | Skill | CLAUDE.md |
|---|---|---|---|
| **单位** | 一个包（多文件） | 一个文件 / 目录 | 单个 markdown |
| **激活时机** | 显式 install + enable | 被调用时触发 | `cd` 进目录自动 |
| **Context 成本** | 触发前为 0 | 触发前为 0 | **常驻 session**（几百 token） |
| **作用域** | 全局（启用后处处生效） | 用户级或 plugin 内 | **目录级** |
| **分发方式** | marketplace（github/npm/本地） | 复制 或 plugin 带 | 进 git repo |
| **更新方式** | `/plugin update` | 手动替换 | `git pull` |

## 一句话记忆

- **Plugin** = 外挂工具箱（装了才有，类似 vim 插件）
- **Skill** = Claude 的技能树（按需唤醒，类似 VS Code language server）
- **CLAUDE.md** = 项目的员工手册（进办公室自动遵守，类似 linter config）

**关键差别**：Plugin 和 Skill 是 **opt-in**（触发才运行）；CLAUDE.md 是 **always-on**（进目录就读）。

## 本项目三者各司其职

| 角色 | 文件 | 职责 | 激活 |
|---|---|---|---|
| **哨兵** | [`CLAUDE.md`](../CLAUDE.md) | session 开场给 Claude 下 5 条红线 | 进目录自动 |
| **工具箱** | [`plugin/`](../plugin/) | skill 分发 + SessionStart hook（未 compile 提醒） | install + enable |
| **方法论**（plugin 内） | [`plugin/skills/paper-notes/SKILL.md`](../plugin/skills/paper-notes/SKILL.md) | 6 步工作流精确指令 + 11 条质量规则 | 用户打 `/paper-notes:*` |
| **专项技能**（用户级） | `~/.claude/skills/paper-reading/SKILL.md` | 通用"怎么读论文"方法论，plugin 复用 | 用户说"帮我读这篇" |
| **规则数据** | [`schema.md`](../schema.md) | 领域词汇（受控标签）+ 整合规则 | 每次 skill 调用先读 |

## 为什么不合并？

每层都有独特的**激活时机**：

- 没装 plugin？→ **CLAUDE.md 还在**，红线不丢
- 没触发 skill？→ **CLAUDE.md 还在**，工作方式还是对的
- 没在 repo 里（比如 Desktop 上闲聊）？→ **用户级 paper-reading skill 还在**，读论文依然靠谱

合并就失去了各自激活时机的灵活性——等于用锤子敲螺丝。

## 对想复用这套模式的人

按"保底→锦上添花"的优先级：

1. **最少**：保留 `CLAUDE.md`（进 git、零门槛，红线兜底）
2. **推荐**：`CLAUDE.md` + `plugin/`（双保险，最流畅日常体验）
3. **锦上添花**：再加用户级 `paper-reading` skill（跨项目可复用）

对应我们 repo：三者都在，你 fork 后一并继承。
