import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const wikiDir = path.join(root, "Wiki");
const rawDir = path.join(root, "Raw");
const outputPath = path.join(root, "review.html");

const SECTION_RE = /^##\s+(.+)$/gm;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripMarkdown(value = "") {
  return value
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\$\$/g, "")
    .trim();
}

function getTitle(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;
}

function getSection(markdown, name) {
  const sections = [...markdown.matchAll(SECTION_RE)];
  const match = sections.find((item) => item[1].trim() === name);
  if (!match) return "";

  const start = match.index + match[0].length;
  const next = sections.find((item) => item.index > match.index);
  const end = next ? next.index : markdown.length;
  return markdown.slice(start, end).trim();
}

function firstParagraph(markdown) {
  const block = markdown
    .split(/\n\s*\n/)
    .map((item) => stripMarkdown(item.replace(/\n/g, " ")))
    .find(Boolean);
  return block ?? "";
}

function countBullets(markdown) {
  return markdown.split("\n").filter((line) => /^\s*[-*]\s+/.test(line)).length;
}

function extractLinks(markdown) {
  return [...markdown.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((item) => ({
    label: item[1],
    href: item[2],
  }));
}

function extractTags(markdown) {
  const tagsLine = markdown.match(/^\s*-\s+\*\*Tags\*\*:\s+(.+)$/m)?.[1] ?? "";
  return [...tagsLine.matchAll(/#[\w-]+/g)].map((item) => item[0]);
}

function normalizeLocalHref(href) {
  if (/^https?:\/\//.test(href)) return href;
  return href.replace("../", "");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\\\|/g, "|")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const normalized = normalizeLocalHref(href);
      return `<a href="${escapeHtml(normalized)}">${escapeHtml(label)}</a>`;
    });
}

function splitMarkdownTableRow(row) {
  const cells = [];
  let current = "";
  let escaped = false;
  let inCode = false;

  for (const char of row.trim()) {
    if (escaped) {
      current += `\\${char}`;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "`") {
      inCode = !inCode;
      current += char;
      continue;
    }

    if (char === "|" && !inCode) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.slice(1, -1);
}

function renderMarkdown(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let inList = false;
  let inTable = false;
  let tableRows = [];
  let inCode = false;
  let codeLines = [];
  let codeLang = "";

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const closeTable = () => {
    if (!inTable) return;
    const [header, , ...rows] = tableRows;
    const cells = splitMarkdownTableRow;

    html.push("<table>");
    html.push(`<thead><tr>${cells(header).map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>`);
    html.push("<tbody>");
    rows.forEach((row) => {
      html.push(`<tr>${cells(row).map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`);
    });
    html.push("</tbody></table>");
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLines = [];
        codeLang = "";
      } else {
        closeList();
        closeTable();
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (/^\|.+\|$/.test(line)) {
      closeList();
      inTable = true;
      tableRows.push(line);
      return;
    }

    closeTable();

    if (!line.trim()) {
      closeList();
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 5);
      const text = heading[2].trim();
      html.push(`<h${level} id="${slugify(text)}">${inlineMarkdown(text)}</h${level}>`);
      return;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      return;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      closeList();
      html.push(`<p class="ordered-line">${inlineMarkdown(ordered[1])}</p>`);
      return;
    }

    html.push(`<p>${inlineMarkdown(line)}</p>`);
  });

  closeList();
  closeTable();
  return html.join("\n");
}

async function readMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    files.map(async (file) => {
      const absolute = path.join(dir, file);
      const markdown = await fs.readFile(absolute, "utf8");
      return { file, absolute, markdown };
    }),
  );
}

function parseWikiPage({ file, markdown }) {
  const title = getTitle(markdown, file.replace(/\.md$/, ""));
  const definition = getSection(markdown, "Definition");
  const keyClaims = getSection(markdown, "Key Claims") || getSection(markdown, "Key Claims（跨论文整合）");
  const openQuestions = getSection(markdown, "Contradictions / Open Questions");
  const related = getSection(markdown, "Related");
  return {
    file,
    title,
    coverage: markdown.match(/\[coverage:\s*([^\]]+)\]/)?.[1] ?? "unknown",
    updated: markdown.match(/\[last-updated:\s*([^\]]+)\]/)?.[1] ?? "unknown",
    definition: firstParagraph(definition),
    claimCount: countBullets(keyClaims),
    questionCount: Math.max(countBullets(openQuestions), [...openQuestions.matchAll(/^###\s+/gm)].length),
    related: extractLinks(related).map((link) => link.label),
    html: renderMarkdown(markdown),
    markdown,
  };
}

function parseRawNote({ file, markdown }) {
  const title = getTitle(markdown, file.replace(/\.md$/, ""));
  const tldr = getSection(markdown, "TL;DR");
  return {
    file,
    id: markdown.match(/^\s*-\s+\*\*ID\*\*:\s+(.+)$/m)?.[1]?.trim() ?? file.replace(/\.md$/, ""),
    title,
    venue: markdown.match(/^\s*-\s+\*\*Venue(?: \/ Year)?\*\*:\s+(.+)$/m)?.[1]?.trim() ?? "",
    tags: extractTags(markdown),
    tldr: firstParagraph(tldr),
    relatedWiki: extractLinks(getSection(markdown, "Related Wiki")).map((link) => link.label),
  };
}

function collectPendingConcepts(indexMarkdown) {
  const candidateSection = getSection(indexMarkdown, "Wiki 概念页");
  return [...candidateSection.matchAll(/-\s+`([^`]+)`（([^）]+)）/g)].map((item) => ({
    concept: item[1],
    note: item[2],
  }));
}

function topTags(rawNotes) {
  const counts = new Map();
  rawNotes.forEach((note) => {
    note.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14)
    .map(([tag, count]) => ({ tag, count }));
}

function makeAgentBrief({ wikiPages, rawNotes, pendingConcepts }) {
  return [
    "你正在维护 PaperNotes LLM Research Wiki。",
    "",
    "请先读 AGENTS.md、schema.md、index.md、log.md 顶部，再根据任务读取相关 Wiki/Raw。",
    "",
    "当前人类 review 入口：review.html。",
    `Wiki 概念页：${wikiPages.length} 个。Raw 论文笔记：${rawNotes.length} 篇。`,
    `待建概念候选：${pendingConcepts.map((item) => item.concept).join(", ") || "无"}`,
    "",
    "如果任务是改 LLM wiki 的风格或功能：",
    "1. 保持 Markdown/Raw/Wiki 作为 source of truth。",
    "2. 修改 scripts/build-review.mjs 或 review.html 的生成模板。",
    "3. 重新生成 review.html，并说明哪些人类 review 流程被改善。",
    "4. 不要在未收到 compile 指令时修改 Wiki 内容。",
  ].join("\n");
}

function makeRepositorySnapshot({ wikiPages, rawNotes, pendingConcepts, topTags }) {
  const highCoverage = wikiPages.filter((page) => page.coverage === "high").length;
  const claimCount = wikiPages.reduce((sum, page) => sum + page.claimCount, 0);
  const questionCount = wikiPages.reduce((sum, page) => sum + page.questionCount, 0);
  return [
    `Raw notes: ${rawNotes.length}`,
    `Wiki pages: ${wikiPages.length} (${highCoverage} high coverage)`,
    `Claims / open questions: ${claimCount} / ${questionCount}`,
    `Pending concepts: ${pendingConcepts.map((item) => item.concept).join(", ") || "none"}`,
    `Top tags: ${topTags.map((item) => `${item.tag}(${item.count})`).join(", ") || "none"}`,
  ].join("\n");
}

function buildHtml(data) {
  const payload = JSON.stringify(data).replaceAll("</script", "<\\/script");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PaperNotes Review Cockpit</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f5f0;
      --panel: #fffdf7;
      --panel-strong: #ffffff;
      --ink: #202124;
      --muted: #626761;
      --line: #dedbd0;
      --teal: #0f766e;
      --blue: #2563eb;
      --amber: #b45309;
      --rose: #be123c;
      --green: #15803d;
      --violet: #7c3aed;
      --shadow: 0 18px 45px rgba(32, 33, 36, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    a { color: var(--blue); text-decoration-thickness: 1px; text-underline-offset: 3px; }

    .app {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100vh;
    }

    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      border-right: 1px solid var(--line);
      background: #efeee7;
      padding: 24px 18px;
    }

    main {
      min-width: 0;
      padding: 28px;
    }

    .brand {
      display: grid;
      gap: 8px;
      margin-bottom: 22px;
    }

    .brand h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .brand p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }

    .nav-group {
      display: grid;
      gap: 8px;
      margin: 18px 0 24px;
    }

    .nav-group h2 {
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .nav-button, button {
      appearance: none;
      border: 1px solid transparent;
      background: transparent;
      color: var(--ink);
      cursor: pointer;
      font: inherit;
    }

    .nav-button {
      display: grid;
      gap: 2px;
      width: 100%;
      padding: 9px 10px;
      text-align: left;
      border-radius: 8px;
    }

    .nav-button:hover, .nav-button.active {
      background: var(--panel);
      border-color: var(--line);
    }

    .nav-button small {
      color: var(--muted);
      font-size: 12px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
      gap: 18px;
      align-items: stretch;
      margin-bottom: 20px;
    }

    .hero-copy, .brief-panel, .toolbar, .content-panel, .stat, .raw-row, .wiki-card, .tag-pill, .prompt-box, .field, .mode-card, .context-card {
      border: 1px solid var(--line);
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .hero-copy {
      padding: 26px;
      border-radius: 12px;
    }

    .hero-copy h2 {
      margin: 0 0 10px;
      max-width: 820px;
      font-size: 32px;
      line-height: 1.14;
      letter-spacing: 0;
    }

    .hero-copy p {
      max-width: 840px;
      margin: 0;
      color: var(--muted);
      font-size: 16px;
    }

    .brief-panel {
      display: grid;
      gap: 14px;
      align-content: start;
      padding: 18px;
      border-radius: 12px;
    }

    .brief-panel h3, .content-panel h3 {
      margin: 0;
      font-size: 16px;
    }

    .brief-panel ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
    }

    .brief-panel code {
      padding: 1px 4px;
      border-radius: 5px;
      background: #e8e3d6;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 18px;
      padding: 12px;
      border-radius: 12px;
      box-shadow: 0 10px 28px rgba(32, 33, 36, 0.06);
    }

    .tabs {
      display: inline-flex;
      gap: 4px;
      padding: 3px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f3f0e7;
    }

    .tab-button, .copy-button {
      min-height: 34px;
      padding: 7px 11px;
      border-radius: 6px;
      color: var(--muted);
    }

    .tab-button.active {
      background: var(--panel-strong);
      color: var(--ink);
      border-color: var(--line);
      box-shadow: 0 4px 10px rgba(32, 33, 36, 0.07);
    }

    .copy-button {
      margin-left: auto;
      background: var(--ink);
      color: white;
    }

    .search {
      min-width: 230px;
      flex: 1 1 260px;
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 10px;
      background: white;
      color: var(--ink);
      font: inherit;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .workspace-grid {
      display: grid;
      grid-template-columns: minmax(300px, 0.88fr) minmax(0, 1.12fr);
      gap: 14px;
      align-items: start;
    }

    .control-stack, .context-stack {
      display: grid;
      gap: 12px;
    }

    .field, .context-card {
      display: grid;
      gap: 9px;
      padding: 14px;
      border-radius: 10px;
      box-shadow: none;
    }

    .field label, .context-card h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 800;
      color: var(--ink);
    }

    .field small {
      color: var(--muted);
    }

    .input, .textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: white;
      color: var(--ink);
      font: inherit;
    }

    .input {
      min-height: 38px;
      padding: 8px 10px;
    }

    .textarea {
      min-height: 210px;
      resize: vertical;
      padding: 10px 11px;
    }

    .mode-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .mode-card {
      min-height: 66px;
      padding: 10px;
      border-radius: 8px;
      text-align: left;
      box-shadow: none;
    }

    .mode-card strong {
      display: block;
      font-size: 14px;
    }

    .mode-card small {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      line-height: 1.35;
    }

    .mode-card.active {
      border-color: rgba(37, 99, 235, 0.42);
      background: rgba(37, 99, 235, 0.08);
    }

    .option-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .check-pill {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      min-height: 30px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f9f7ef;
      color: var(--muted);
      font-size: 13px;
    }

    .check-pill input {
      margin: 0;
    }

    .context-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .context-list li {
      display: grid;
      gap: 3px;
      padding: 9px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fffefa;
    }

    .context-list b {
      font-size: 13px;
    }

    .context-list span {
      color: var(--muted);
      font-size: 13px;
    }

    .prompt-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .secondary-button {
      min-height: 34px;
      padding: 7px 11px;
      border-radius: 6px;
      border-color: var(--line);
      background: var(--panel-strong);
      color: var(--ink);
    }

    .prompt-output {
      max-height: 520px;
      overflow: auto;
      border-radius: 10px;
    }

    .stat {
      min-height: 104px;
      padding: 16px;
      border-radius: 10px;
    }

    .stat b {
      display: block;
      font-size: 28px;
      line-height: 1;
    }

    .stat span {
      display: block;
      margin-top: 8px;
      color: var(--muted);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .wiki-card, .content-panel, .raw-row, .prompt-box {
      border-radius: 10px;
      padding: 16px;
    }

    .wiki-card {
      display: grid;
      gap: 12px;
      align-content: start;
      cursor: pointer;
    }

    .wiki-card:hover {
      border-color: #b9b4a6;
      background: #fffefa;
    }

    .wiki-card h3 {
      margin: 0;
      font-size: 18px;
    }

    .wiki-card p, .raw-row p {
      margin: 0;
      color: var(--muted);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .badge, .tag {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 3px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f9f7ef;
      color: var(--muted);
      font-size: 12px;
    }

    .badge.high { color: var(--green); border-color: rgba(21, 128, 61, 0.28); background: rgba(21, 128, 61, 0.08); }
    .badge.medium { color: var(--amber); border-color: rgba(180, 83, 9, 0.28); background: rgba(180, 83, 9, 0.08); }
    .badge.low, .badge.unknown { color: var(--rose); border-color: rgba(190, 18, 60, 0.22); background: rgba(190, 18, 60, 0.06); }

    .raw-list {
      display: grid;
      gap: 10px;
    }

    .raw-row {
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 12px;
      box-shadow: none;
    }

    .raw-id {
      font-weight: 800;
      color: var(--teal);
    }

    .tag-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag-pill {
      padding: 8px 10px;
      border-radius: 999px;
      box-shadow: none;
      color: var(--muted);
    }

    .markdown-view {
      max-width: 980px;
    }

    .markdown-view h2 {
      margin-top: 0;
      font-size: 26px;
    }

    .markdown-view h3 {
      margin-top: 26px;
      font-size: 20px;
    }

    .markdown-view h4 {
      margin-top: 20px;
      font-size: 17px;
    }

    .markdown-view p, .markdown-view li {
      color: #343631;
    }

    .markdown-view table {
      width: 100%;
      margin: 14px 0;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .markdown-view th, .markdown-view td {
      border-bottom: 1px solid var(--line);
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }

    .markdown-view th {
      background: #f0eee5;
    }

    .markdown-view code {
      padding: 2px 5px;
      border-radius: 5px;
      background: #eee9dc;
    }

    .markdown-view pre {
      overflow: auto;
      padding: 14px;
      border-radius: 8px;
      background: #1f2933;
      color: white;
    }

    .prompt-box {
      display: grid;
      gap: 12px;
      white-space: pre-wrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.55;
    }

    .hidden { display: none !important; }

    @media (max-width: 980px) {
      .app { grid-template-columns: 1fr; }
      aside { position: relative; height: auto; }
      .hero { grid-template-columns: 1fr; }
      .workspace-grid { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 620px) {
      main { padding: 16px; }
      .hero-copy h2 { font-size: 25px; }
      .stats { grid-template-columns: 1fr; }
      .mode-grid { grid-template-columns: 1fr; }
      .raw-row { grid-template-columns: 1fr; }
      .copy-button { width: 100%; margin-left: 0; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside>
      <div class="brand">
        <h1>PaperNotes Review Cockpit</h1>
        <p>Markdown 是知识库真相源；HTML 是人类审阅层。</p>
      </div>
      <div class="nav-group">
        <h2>Concepts</h2>
        <div id="conceptNav"></div>
      </div>
      <div class="nav-group">
        <h2>Pending</h2>
        <div id="pendingNav"></div>
      </div>
    </aside>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <h2>把新需求先变成一段稳定的 LLM 工作上下文。</h2>
          <p>这个页面不只展示 PaperNotes 的现状，也把“我要改什么”组织成可执行 prompt：仓库状态、相关 Raw/Wiki、工作红线和检查项会一起带给 LLM。</p>
        </div>
        <div class="brief-panel">
          <h3>Working Contract</h3>
          <ul>
            <li>Source of truth: <code>Raw/</code>, <code>Wiki/</code>, <code>schema.md</code></li>
            <li>Interaction layer: <code>review.html</code></li>
            <li>Generator: <code>scripts/build-review.mjs</code></li>
            <li>LLM handoff: Workspace prompt</li>
          </ul>
        </div>
      </section>

      <div class="toolbar">
        <div class="tabs" aria-label="Views">
          <button class="tab-button active" data-tab="workspace">Workspace</button>
          <button class="tab-button" data-tab="overview">Overview</button>
          <button class="tab-button" data-tab="wiki">Wiki</button>
          <button class="tab-button" data-tab="raw">Raw</button>
          <button class="tab-button" data-tab="prompt">Prompt</button>
        </div>
        <input class="search" id="search" type="search" placeholder="Filter concepts, papers, tags">
        <button class="copy-button" id="copyBrief">Copy Current Prompt</button>
      </div>

      <section id="workspaceView">
        <div class="workspace-grid">
          <div class="control-stack">
            <div class="field">
              <label>Task type</label>
              <div class="mode-grid" id="modeGrid"></div>
            </div>

            <div class="field">
              <label for="requirementInput">Requirement</label>
              <textarea class="textarea" id="requirementInput" placeholder="写下你希望 LLM 处理的新需求、代码修改目标、研究问题或 HTML 交互改动。"></textarea>
            </div>

            <div class="field">
              <label for="scopeInput">Focus words</label>
              <input class="input" id="scopeInput" type="search" placeholder="例如 entropy / compile / review.html / Small-Model-Scaffolding">
              <small>留空时会从 requirement 和顶部 filter 里推断相关 Raw/Wiki。</small>
            </div>

            <div class="field">
              <label>Prompt context</label>
              <div class="option-row" id="contextOptions">
                <label class="check-pill"><input type="checkbox" value="rules" checked>Rules</label>
                <label class="check-pill"><input type="checkbox" value="state" checked>Repo state</label>
                <label class="check-pill"><input type="checkbox" value="wiki" checked>Wiki hits</label>
                <label class="check-pill"><input type="checkbox" value="raw" checked>Raw hits</label>
                <label class="check-pill"><input type="checkbox" value="checks" checked>Checks</label>
              </div>
            </div>
          </div>

          <div class="context-stack">
            <div class="context-card">
              <h3>Repository Snapshot</h3>
              <div class="prompt-box" id="snapshotBox"></div>
            </div>

            <div class="context-card">
              <h3>Matched Wiki</h3>
              <ul class="context-list" id="matchedWiki"></ul>
            </div>

            <div class="context-card">
              <h3>Matched Raw</h3>
              <ul class="context-list" id="matchedRaw"></ul>
            </div>

            <div class="context-card">
              <div class="prompt-actions">
                <h3 style="margin-right: auto;">LLM Prompt</h3>
                <button class="secondary-button" id="copyWorkspace">Copy Workspace Prompt</button>
                <button class="secondary-button" id="resetWorkspace">Reset</button>
              </div>
              <div class="prompt-box prompt-output" id="workspacePrompt"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="overviewView" class="hidden">
        <div class="stats" id="stats"></div>
        <div class="grid">
          <div class="content-panel">
            <h3>Top Tags</h3>
            <div class="tag-cloud" id="tagCloud"></div>
          </div>
          <div class="content-panel">
            <h3>Interaction Checklist</h3>
            <ul>
              <li>新需求是否先转成 LLM 可执行上下文？</li>
              <li>是否能从需求词定位相关 Wiki / Raw 证据？</li>
              <li>是否明确 ingest、compile、query、refactor 的边界？</li>
              <li>HTML 是否只做交互层，不抢 Markdown 的真相源位置？</li>
            </ul>
          </div>
        </div>
        <div class="grid" id="wikiCards" style="margin-top: 14px;"></div>
      </section>

      <section id="wikiView" class="hidden">
        <article class="content-panel markdown-view" id="wikiDetail"></article>
      </section>

      <section id="rawView" class="hidden">
        <div class="raw-list" id="rawList"></div>
      </section>

      <section id="promptView" class="hidden">
        <div class="prompt-box" id="promptBox"></div>
      </section>
    </main>
  </div>

  <script id="paper-data" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("paper-data").textContent);
    const taskModes = [
      { id: "refactor", label: "Code / HTML", hint: "改生成器、页面或文档", rule: "修改代码或文档时，优先改 scripts/build-review.mjs，再重新生成 review.html；不要把生成物当作唯一真相源。" },
      { id: "query", label: "Research Query", hint: "查 Wiki、比较方法、找方向", rule: "优先读 Wiki，再按引用回 Raw 查证具体论文和数字；覆盖不足时明确说明缺口。" },
      { id: "ingest", label: "Ingest", hint: "加入新论文 Raw", rule: "只动 Raw/ 和 log.md；使用 schema.md 受控 tags；不要修改 Wiki/。" },
      { id: "compile", label: "Compile", hint: "整合 Raw 到 Wiki", rule: "只有用户明确要求 compile 时才更新 Wiki；冲突进入 Contradictions / Open Questions，不覆盖旧 claim。" },
      { id: "lint", label: "Lint", hint: "健康检查与结构审阅", rule: "默认只报告问题；除非用户明确要求修复，先不要自动改文件。" },
      { id: "write", label: "Writing", hint: "写 related work / 草稿", rule: "回答或写作必须保留可追溯引用，优先链接 Wiki，再回 Raw 核数字。" },
    ];
    const repositorySnapshot = ${JSON.stringify(makeRepositorySnapshot(data)).replaceAll("</script", "<\\/script")};
    let activeTab = "workspace";
    let activeWiki = data.wikiPages[0]?.file;
    let activeMode = "refactor";

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];

    function textMatch(value, query) {
      return String(value || "").toLowerCase().includes(query.toLowerCase());
    }

    function showTab(tab) {
      activeTab = tab;
      $$(".tab-button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
      ["workspace", "overview", "wiki", "raw", "prompt"].forEach((name) => {
        $("#" + name + "View").classList.toggle("hidden", name !== tab);
      });
      render();
    }

    function selectWiki(file) {
      activeWiki = file;
      showTab("wiki");
    }

    function renderStats() {
      const highCoverage = data.wikiPages.filter((page) => page.coverage === "high").length;
      const claimCount = data.wikiPages.reduce((sum, page) => sum + page.claimCount, 0);
      const questionCount = data.wikiPages.reduce((sum, page) => sum + page.questionCount, 0);
      $("#stats").innerHTML = [
        ["Wiki Pages", data.wikiPages.length],
        ["Raw Notes", data.rawNotes.length],
        ["High Coverage", highCoverage],
        ["Claims / Questions", claimCount + " / " + questionCount],
      ].map(([label, value]) => '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>').join("");
    }

    function getWorkspaceNeedle() {
      return [
        $("#scopeInput")?.value,
        $("#requirementInput")?.value,
        $("#search")?.value,
      ].filter(Boolean).join(" ").trim();
    }

    function scoreText(text, needle) {
      if (!needle) return 0;
      const terms = needle.toLowerCase().split(/\\s+/).filter((item) => item.length > 1);
      const haystack = String(text || "").toLowerCase();
      return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
    }

    function getMatchedWiki() {
      const needle = getWorkspaceNeedle();
      const pages = data.wikiPages.map((page) => ({
        page,
        score: scoreText([page.title, page.definition, page.related.join(" "), page.markdown].join(" "), needle),
      }));
      const ranked = pages.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.page);
      return (ranked.length ? ranked : data.wikiPages).slice(0, 5);
    }

    function getMatchedRaw() {
      const needle = getWorkspaceNeedle();
      const notes = data.rawNotes.map((note) => ({
        note,
        score: scoreText([note.id, note.title, note.tldr, note.tags.join(" "), note.relatedWiki.join(" ")].join(" "), needle),
      }));
      const ranked = notes.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.note);
      return (ranked.length ? ranked : data.rawNotes).slice(0, 8);
    }

    function selectedContext() {
      return $$('input[type="checkbox"][value]').filter((input) => input.checked).map((input) => input.value);
    }

    function renderModeGrid() {
      $("#modeGrid").innerHTML = taskModes.map((mode) => (
        '<button class="mode-card' + (mode.id === activeMode ? " active" : "") + '" data-mode="' + mode.id + '">' +
          '<strong>' + mode.label + '</strong><small>' + mode.hint + '</small>' +
        '</button>'
      )).join("");
      $$("[data-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          activeMode = button.dataset.mode;
          render();
        });
      });
    }

    function renderContextList(selector, items, type) {
      const empty = '<li><b>No direct match</b><span>Use broader focus words or rely on repository snapshot.</span></li>';
      $(selector).innerHTML = items.map((item) => {
        if (type === "wiki") {
          return '<li><b>' + item.title + '</b><span>' + item.coverage + ' · ' + item.updated + ' · ' + item.claimCount + ' claims · ' + item.questionCount + ' questions</span></li>';
        }
        return '<li><b>' + item.id + ' · ' + item.title + '</b><span>' + item.tags.join(" ") + '</span></li>';
      }).join("") || empty;
    }

    function buildWorkspacePrompt() {
      const mode = taskModes.find((item) => item.id === activeMode) || taskModes[0];
      const requirement = $("#requirementInput").value.trim() || "[在这里写清楚你希望 LLM 处理的需求]";
      const focus = getWorkspaceNeedle() || "[未指定，先从仓库结构和任务描述判断]";
      const context = selectedContext();
      const wikiHits = getMatchedWiki();
      const rawHits = getMatchedRaw();
      const lines = [
        "你正在 /Users/xuexiang/Documents/PaperNotes 仓库中工作。",
        "",
        "用户需求：",
        requirement,
        "",
        "任务类型：",
        mode.label + " — " + mode.rule,
        "",
        "关注词 / 可能相关范围：",
        focus,
      ];

      if (context.includes("rules")) {
        lines.push(
          "",
          "必须先读：",
          "- AGENTS.md",
          "- schema.md",
          "- log.md 顶部",
          "",
          "关键红线：",
          "- ingest 只动 Raw/ 和 log.md；compile 只在用户明确要求时动 Wiki/。",
          "- Raw 只增不改；Tags 只能使用 schema.md 受控词汇。",
          "- Wiki 新旧 claim 冲突时追加到 Contradictions / Open Questions，不覆盖旧 claim。",
          "- 修改 HTML 功能时优先编辑 scripts/build-review.mjs，然后重新生成 review.html。",
        );
      }

      if (context.includes("state")) {
        lines.push("", "当前仓库快照：", repositorySnapshot);
      }

      if (context.includes("wiki")) {
        lines.push(
          "",
          "可能相关 Wiki：",
          ...wikiHits.map((page) => "- " + page.title + " (" + page.file + ") · " + page.coverage + ", " + page.claimCount + " claims, " + page.questionCount + " questions"),
        );
      }

      if (context.includes("raw")) {
        lines.push(
          "",
          "可能相关 Raw：",
          ...rawHits.map((note) => "- " + note.id + " (" + note.file + ") · " + note.title + " · " + note.tags.join(" ")),
        );
      }

      if (context.includes("checks")) {
        lines.push(
          "",
          "完成前请检查：",
          "- 是否遵守 schema.md 和两阶段 ingest/compile 边界。",
          "- 是否保留可点击 markdown 链接和可追溯引用。",
          "- 如果改了 HTML/生成器，是否重新运行 node scripts/build-review.mjs。",
          "- 是否说明验证过的命令，以及任何未能验证的风险。",
        );
      }

      lines.push("", "请先判断需要读取哪些文件，然后直接执行。");
      return lines.join("\\n");
    }

    function renderWorkspace() {
      renderModeGrid();
      const wikiHits = getMatchedWiki();
      const rawHits = getMatchedRaw();
      $("#snapshotBox").textContent = repositorySnapshot;
      renderContextList("#matchedWiki", wikiHits, "wiki");
      renderContextList("#matchedRaw", rawHits, "raw");
      $("#workspacePrompt").textContent = buildWorkspacePrompt();
    }

    function renderNav() {
      $("#conceptNav").innerHTML = data.wikiPages.map((page) => {
        const active = page.file === activeWiki ? " active" : "";
        return '<button class="nav-button' + active + '" data-wiki="' + page.file + '">' +
          '<strong>' + page.title + '</strong><small>' + page.coverage + ' · ' + page.updated + '</small></button>';
      }).join("");

      $("#pendingNav").innerHTML = data.pendingConcepts.map((item) => (
        '<button class="nav-button" data-search="' + item.concept + '">' +
        '<strong>' + item.concept + '</strong><small>' + item.note + '</small></button>'
      )).join("") || '<p style="color: var(--muted); margin: 0;">No pending concepts</p>';

      $$("[data-wiki]").forEach((button) => button.addEventListener("click", () => selectWiki(button.dataset.wiki)));
      $$("[data-search]").forEach((button) => {
        button.addEventListener("click", () => {
          $("#search").value = button.dataset.search;
          showTab("raw");
        });
      });
    }

    function renderTagCloud(query) {
      $("#tagCloud").innerHTML = data.topTags
        .filter((item) => !query || textMatch(item.tag, query))
        .map((item) => '<span class="tag-pill">' + item.tag + ' · ' + item.count + '</span>')
        .join("");
    }

    function renderWikiCards(query) {
      const cards = data.wikiPages.filter((page) => {
        return !query || [page.title, page.definition, page.related.join(" ")].some((value) => textMatch(value, query));
      });
      $("#wikiCards").innerHTML = cards.map((page) => (
        '<article class="wiki-card" data-card="' + page.file + '">' +
          '<div class="meta"><span class="badge ' + page.coverage + '">' + page.coverage + '</span><span class="badge">' + page.updated + '</span></div>' +
          '<h3>' + page.title + '</h3>' +
          '<p>' + page.definition + '</p>' +
          '<div class="meta"><span class="tag">' + page.claimCount + ' claims</span><span class="tag">' + page.questionCount + ' questions</span></div>' +
        '</article>'
      )).join("");
      $$("[data-card]").forEach((card) => card.addEventListener("click", () => selectWiki(card.dataset.card)));
    }

    function renderWikiDetail() {
      const page = data.wikiPages.find((item) => item.file === activeWiki) || data.wikiPages[0];
      if (!page) return;
      $("#wikiDetail").innerHTML = page.html;
    }

    function renderRawList(query) {
      const rows = data.rawNotes.filter((note) => {
        return !query || [note.id, note.title, note.tldr, note.tags.join(" ")].some((value) => textMatch(value, query));
      });
      $("#rawList").innerHTML = rows.map((note) => (
        '<article class="raw-row">' +
          '<div><div class="raw-id">' + note.id + '</div><div class="meta"><span class="badge">' + (note.venue || "paper") + '</span></div></div>' +
          '<div><h3 style="margin: 0 0 6px;">' + note.title + '</h3><p>' + note.tldr + '</p>' +
          '<div class="meta" style="margin-top: 10px;">' + note.tags.map((tag) => '<span class="tag">' + tag + '</span>').join("") + '</div></div>' +
        '</article>'
      )).join("");
    }

    function renderPrompt() {
      $("#promptBox").textContent = data.agentBrief;
    }

    function render() {
      const query = $("#search").value.trim();
      renderWorkspace();
      renderStats();
      renderNav();
      renderTagCloud(query);
      renderWikiCards(query);
      renderWikiDetail();
      renderRawList(query);
      renderPrompt();
    }

    $("#search").addEventListener("input", render);
    $("#requirementInput").addEventListener("input", render);
    $("#scopeInput").addEventListener("input", render);
    $$("#contextOptions input").forEach((input) => input.addEventListener("change", render));
    $$(".tab-button").forEach((button) => button.addEventListener("click", () => showTab(button.dataset.tab)));
    async function copyText(value) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }

    $("#copyBrief").addEventListener("click", async () => {
      try {
        const value = activeTab === "workspace" ? buildWorkspacePrompt() : data.agentBrief;
        const ok = await copyText(value);
        $("#copyBrief").textContent = ok ? "Copied" : "Copy Failed";
      } catch {
        $("#copyBrief").textContent = "Copy Failed";
      }
      setTimeout(() => $("#copyBrief").textContent = "Copy Current Prompt", 900);
    });

    $("#copyWorkspace").addEventListener("click", async () => {
      try {
        const ok = await copyText(buildWorkspacePrompt());
        $("#copyWorkspace").textContent = ok ? "Copied" : "Copy Workspace Prompt";
      } catch {
        $("#copyWorkspace").textContent = "Copy Failed";
      }
      setTimeout(() => $("#copyWorkspace").textContent = "Copy Workspace Prompt", 900);
    });

    $("#resetWorkspace").addEventListener("click", () => {
      $("#requirementInput").value = "";
      $("#scopeInput").value = "";
      activeMode = "refactor";
      $$("#contextOptions input").forEach((input) => input.checked = true);
      render();
    });

    render();
  </script>
</body>
</html>`;
}

async function main() {
  const [wikiFiles, rawFiles, indexMarkdown] = await Promise.all([
    readMarkdownFiles(wikiDir),
    readMarkdownFiles(rawDir),
    fs.readFile(path.join(root, "index.md"), "utf8"),
  ]);

  const wikiPages = wikiFiles.map(parseWikiPage).sort((a, b) => a.title.localeCompare(b.title));
  const rawNotes = rawFiles.map(parseRawNote).sort((a, b) => b.id.localeCompare(a.id));
  const pendingConcepts = collectPendingConcepts(indexMarkdown);
  const data = {
    generatedAt: new Date().toISOString(),
    wikiPages,
    rawNotes,
    pendingConcepts,
    topTags: topTags(rawNotes),
  };
  data.agentBrief = makeAgentBrief(data);

  await fs.writeFile(outputPath, buildHtml(data), "utf8");
  console.log(`Generated ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
