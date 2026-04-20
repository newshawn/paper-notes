# log.md 追加格式

## 总规则

- **Append at top** (newest first)，紧随 `# Log` 标题之后
- Action 类型：`ingest` | `compile` | `lint` | `rename` | `refactor`
- 日期使用 ISO 格式 `YYYY-MM-DD`
- 标题行固定格式：`## [YYYY-MM-DD] <action> | <target>`

## ingest 格式

```markdown
## [YYYY-MM-DD] ingest | <paper-id> <paper-title-short>

- **Raw**: Raw/<paper-id>.md
- **PDF**: Raw/pdfs/<paper-id>.pdf (或 "not downloaded" if failed)
- **Tags**: #tag1 #tag2 #tag3
- **Wiki touched**: none (two-stage pending compile)
```

## compile 格式

```markdown
## [YYYY-MM-DD] compile | N raws → M wiki pages

- **Raws compiled**: <paper-id-1>, <paper-id-2>, ...
- **Wiki updated**: <Concept-A>, <Concept-B>
- **Wiki created**: <Concept-C> (threshold ≥2 met)
- **Candidates awaiting more papers**: <Concept-D> (只出现在 1 篇 Raw)
- **Contradictions recorded**: brief list if any
- **Rationale**: <一两句话说明此次 compile 的重点>
```

## lint 格式

```markdown
## [YYYY-MM-DD] lint | <N errors, M warnings>

- **Errors**: broken-links=X, schema-violations=Y
- **Warnings**: stale-wiki=Z, missing-pdf=W
- **Candidates**: concept-threshold-met=K
- **Fixed this session**: list of auto-fixed items (if user approved)
```

## rename / refactor 格式

```markdown
## [YYYY-MM-DD] rename | <old> → <new>

- **Reason**: <为什么改>
- **Affected files**: Raw/<id>.md → Raw/<new-id>.md, Wiki pages updated: ...
- **Cross-refs updated**: count
```
