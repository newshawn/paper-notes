import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const outputPath = path.join(root, "dev-cockpit.html");

const IGNORE_DIRS = new Set([".git", ".claude", ".obsidian", "node_modules", ".DS_Store"]);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripMarkdown(value = "") {
  return value
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .trim();
}

function getTitle(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;
}

function getSection(markdown, name) {
  const sections = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const match = sections.find((item) => item[1].trim() === name);
  if (!match) return "";
  const start = match.index + match[0].length;
  const next = sections.find((item) => item.index > match.index);
  const end = next ? next.index : markdown.length;
  return markdown.slice(start, end).trim();
}

function firstParagraph(markdown) {
  return markdown
    .split(/\n\s*\n/)
    .map((item) => stripMarkdown(item.replace(/\n/g, " ")))
    .find(Boolean) ?? "";
}

function extractTags(markdown) {
  const tagsLine = markdown.match(/^\s*-\s+\*\*Tags\*\*:\s+(.+)$/m)?.[1] ?? "";
  return [...tagsLine.matchAll(/#[\w-]+/g)].map((item) => item[0]);
}

async function walk(dir, prefix = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(absolute, relative));
      continue;
    }

    files.push(relative);
  }

  return files.sort();
}

async function safeRead(relative) {
  try {
    return await fs.readFile(path.join(root, relative), "utf8");
  } catch {
    return "";
  }
}

function classifyFile(file) {
  if (file.startsWith("Raw/")) return "Raw 笔记";
  if (file.startsWith("Wiki/")) return "Wiki 概念";
  if (file.startsWith("docs/")) return "文档";
  if (file.startsWith("scripts/")) return "脚本";
  if (file.endsWith(".html")) return "HTML 页面";
  if (["README.md", "AGENTS.md", "CLAUDE.md", "schema.md", "index.md", "log.md"].includes(file)) return "核心文件";
  return "其他";
}

function makeFileFacts(files) {
  const groups = new Map();
  files.forEach((file) => {
    const group = classifyFile(file);
    groups.set(group, (groups.get(group) ?? 0) + 1);
  });
  return [...groups.entries()].map(([name, count]) => ({ name, count }));
}

async function parseWiki() {
  const dir = path.join(root, "Wiki");
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(async (entry) => {
      const file = `Wiki/${entry.name}`;
      const markdown = await safeRead(file);
      const keyClaims = getSection(markdown, "Key Claims") || getSection(markdown, "Key Claims（跨论文整合）");
      const questions = getSection(markdown, "Contradictions / Open Questions");
      return {
        file,
        title: getTitle(markdown, entry.name.replace(/\.md$/, "")),
        coverage: markdown.match(/\[coverage:\s*([^\]]+)\]/)?.[1] ?? "unknown",
        updated: markdown.match(/\[last-updated:\s*([^\]]+)\]/)?.[1] ?? "unknown",
        definition: firstParagraph(getSection(markdown, "Definition")),
        claims: keyClaims.split("\n").filter((line) => /^\s*[-*]\s+/.test(line)).length,
        questions: Math.max(
          questions.split("\n").filter((line) => /^\s*[-*]\s+/.test(line)).length,
          [...questions.matchAll(/^###\s+/gm)].length,
        ),
      };
    }));
}

async function parseRaw() {
  const dir = path.join(root, "Raw");
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const notes = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => b.name.localeCompare(a.name))
    .map(async (entry) => {
      const file = `Raw/${entry.name}`;
      const markdown = await safeRead(file);
      return {
        file,
        id: markdown.match(/^\s*-\s+\*\*ID\*\*:\s+(.+)$/m)?.[1]?.trim() ?? entry.name.replace(/\.md$/, ""),
        title: getTitle(markdown, entry.name.replace(/\.md$/, "")),
        tags: extractTags(markdown),
        tldr: firstParagraph(getSection(markdown, "TL;DR")),
      };
    }));
  return notes;
}

function buildHtml(data) {
  const payload = JSON.stringify(data).replaceAll("</script", "<\\/script");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PaperNotes 开发工作台</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8f5;
      --surface: #fffefb;
      --surface-2: #f0f4ef;
      --ink: #202421;
      --muted: #626a64;
      --line: #dbe2d7;
      --blue: #2563eb;
      --teal: #0f766e;
      --green: #15803d;
      --amber: #b45309;
      --red: #be123c;
      --shadow: 0 18px 42px rgba(24, 31, 27, 0.08);
    }

    * { box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    a { color: var(--blue); text-underline-offset: 3px; }
    button, input, textarea, select { font: inherit; }

    .shell {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      min-height: 100vh;
    }

    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 22px 16px;
      border-right: 1px solid var(--line);
      background: #ecf1e9;
    }

    main {
      min-width: 0;
      padding: 26px;
    }

    .brand h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.14;
      letter-spacing: 0;
    }

    .brand p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
    }

    .nav {
      display: grid;
      gap: 8px;
      margin-top: 22px;
    }

    .nav a {
      display: block;
      padding: 9px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--ink);
      text-decoration: none;
    }

    .nav a:hover {
      border-color: var(--line);
      background: var(--surface);
    }

    .quick-links {
      display: grid;
      gap: 8px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }

    .quick-links a {
      color: var(--muted);
      font-size: 13px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
      gap: 14px;
      margin-bottom: 16px;
    }

    .panel, .stat, .approach, .milestone, .demo, .file-row, .prompt {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }

    .hero .panel {
      padding: 24px;
    }

    .hero h2 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.08;
      letter-spacing: 0;
    }

    .hero p, .panel p {
      margin: 0;
      color: var(--muted);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .stat {
      min-height: 92px;
      padding: 14px;
      box-shadow: none;
    }

    .stat b {
      display: block;
      font-size: 26px;
      line-height: 1;
    }

    .stat span {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .choice-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .choice-card {
      min-height: 185px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: left;
      cursor: pointer;
    }

    .choice-card.active {
      border-color: rgba(37, 99, 235, 0.46);
      background: rgba(37, 99, 235, 0.07);
    }

    .choice-card small {
      display: block;
      color: var(--teal);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .choice-card h3 {
      margin: 8px 0;
      font-size: 18px;
      line-height: 1.2;
    }

    .choice-card p {
      margin: 0;
      color: var(--muted);
    }

    .mini-guide {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .mini-step {
      min-height: 64px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfdf9;
    }

    .mini-step b {
      display: block;
      margin-bottom: 2px;
      color: var(--teal);
      font-size: 12px;
    }

    .mini-step span {
      color: var(--muted);
      font-size: 13px;
    }

    section {
      margin: 18px 0;
    }

    .section-head {
      display: flex;
      gap: 12px;
      align-items: end;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .section-head h2 {
      margin: 0;
      font-size: 22px;
      letter-spacing: 0;
    }

    .section-head p {
      max-width: 680px;
      margin: 0;
      color: var(--muted);
    }

    .workspace {
      display: grid;
      grid-template-columns: minmax(310px, 0.82fr) minmax(0, 1.18fr);
      gap: 14px;
      align-items: start;
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .panel {
      padding: 15px;
    }

    .panel h3 {
      margin: 0 0 8px;
      font-size: 15px;
    }

    .input, .textarea, .select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: white;
      color: var(--ink);
    }

    .input, .select {
      min-height: 38px;
      padding: 8px 10px;
    }

    .textarea {
      min-height: 180px;
      padding: 10px 11px;
      resize: vertical;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip, .tag, .badge {
      display: inline-flex;
      align-items: center;
      min-height: 25px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f7faf5;
      color: var(--muted);
      font-size: 12px;
    }

    .chip input {
      margin: 0 6px 0 0;
    }

    .approach-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .approach {
      padding: 14px;
      box-shadow: none;
      cursor: pointer;
    }

    .approach.active {
      border-color: rgba(37, 99, 235, 0.46);
      background: rgba(37, 99, 235, 0.07);
    }

    .approach h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }

    .approach p {
      min-height: 70px;
      margin: 0 0 10px;
      color: var(--muted);
    }

    .approach table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .approach td {
      padding: 5px 0;
      border-top: 1px solid var(--line);
      vertical-align: top;
    }

    .approach td:last-child {
      text-align: right;
      color: var(--muted);
    }

    .plan-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .milestone {
      min-height: 180px;
      padding: 14px;
      box-shadow: none;
    }

    .milestone b {
      display: block;
      color: var(--teal);
      font-size: 13px;
      text-transform: uppercase;
    }

    .milestone h3 {
      margin: 6px 0 8px;
      font-size: 16px;
    }

    .milestone ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .demo {
      min-height: 220px;
      overflow: hidden;
      box-shadow: none;
    }

    .demo h3 {
      margin: 0;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      font-size: 15px;
      background: var(--surface-2);
    }

    .demo-body {
      padding: 14px;
    }

    .flow {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .flow div {
      min-height: 70px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfdf9;
    }

    .flow b {
      display: block;
      margin-bottom: 4px;
      color: var(--teal);
      font-size: 13px;
    }

    .matrix {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .matrix div {
      min-height: 74px;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: #fbfdf9;
    }

    .matrix strong {
      display: block;
      margin-bottom: 4px;
    }

    .file-list {
      display: grid;
      gap: 8px;
    }

    .file-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      padding: 10px 12px;
      box-shadow: none;
    }

    .file-row code {
      color: var(--teal);
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .file-row span {
      color: var(--muted);
      font-size: 12px;
    }

    .prompt {
      display: grid;
      gap: 10px;
      padding: 14px;
    }

    .artifact-preview {
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fffefb;
      box-shadow: var(--shadow);
    }

    .artifact-preview h1,
    .artifact-preview h2,
    .artifact-preview h3 {
      margin: 0;
      letter-spacing: 0;
    }

    .artifact-preview h1 {
      font-size: 24px;
      line-height: 1.18;
    }

    .artifact-preview h2 {
      margin-top: 4px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--line);
      font-size: 17px;
    }

    .artifact-preview p {
      margin: 0;
      color: var(--muted);
    }

    .artifact-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .artifact-card {
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfdf9;
    }

    .review-grid {
      display: grid;
      grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.15fr);
      gap: 12px;
      align-items: start;
    }

    .artifact-input {
      min-height: 240px;
      resize: vertical;
      width: 100%;
      padding: 10px 11px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: white;
      color: var(--ink);
      font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .artifact-frame {
      width: 100%;
      min-height: 560px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: white;
    }

    .artifact-card ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }

    .artifact-card li {
      color: var(--muted);
    }

    .prompt pre {
      max-height: 520px;
      margin: 0;
      overflow: auto;
      white-space: pre-wrap;
      font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    button {
      min-height: 36px;
      padding: 7px 11px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
    }

    button.primary {
      border-color: #1f2937;
      background: #1f2937;
      color: white;
    }

    .hidden { display: none !important; }

    @media (max-width: 1060px) {
      .shell { grid-template-columns: 1fr; }
      aside { position: relative; height: auto; }
      .hero, .workspace { grid-template-columns: 1fr; }
      .choice-grid, .approach-grid, .plan-grid, .mini-guide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .review-grid { grid-template-columns: 1fr; }
      .artifact-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 680px) {
      main { padding: 16px; }
      .hero h2 { font-size: 26px; }
      .stats, .choice-grid, .approach-grid, .plan-grid, .demo-grid, .flow, .mini-guide { grid-template-columns: 1fr; }
      .section-head { display: grid; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand">
        <h1>PaperNotes 开发工作台</h1>
        <p>把“我要改什么”变成可比较、可演示、可交给 LLM 执行的计划。</p>
      </div>
      <nav class="nav" aria-label="Sections">
        <a href="#choose">选择任务</a>
        <a href="#work">填写需求</a>
        <a href="#approaches">比较方案</a>
        <a href="#materials">评审素材</a>
        <a href="#artifact">预览评审稿</a>
        <a href="#export">复制执行</a>
      </nav>
      <div class="quick-links">
        <a href="review.html">打开 review.html</a>
        <a href="README.md">README.md</a>
        <a href="schema.md">schema.md</a>
        <a href="AGENTS.md">AGENTS.md</a>
      </div>
    </aside>

    <main>
      <section class="hero" id="top">
        <div class="panel">
          <h2>今天想让 LLM 帮你做什么？</h2>
          <p>先把需求和项目规则整理成生成指令，让大模型输出 HTML + markdown。你在这里 review，确认合理后再交给执行模型。</p>
        </div>
        <div class="panel">
          <h3>推荐流程</h3>
          <p>需求 → 生成 HTML+MD → 本页 review → 复制执行稿。</p>
        </div>
      </section>

      <section id="choose">
        <div class="section-head">
          <h2>先选择你要做什么</h2>
          <p>先选任务入口，再写需求。日常默认“做计划”；需要 HTML 可视化 plan 时选“可视化”。</p>
        </div>
        <div class="choice-grid" id="choiceGrid"></div>
        <div class="mini-guide">
          <div class="mini-step"><b>01</b><span>选任务</span></div>
          <div class="mini-step"><b>02</b><span>写需求</span></div>
          <div class="mini-step"><b>03</b><span>大模型生成 HTML+MD</span></div>
          <div class="mini-step"><b>04</b><span>本页 review</span></div>
          <div class="mini-step"><b>05</b><span>复制执行稿</span></div>
        </div>
      </section>

      <section id="work">
        <div class="section-head">
          <h2>需求简报</h2>
          <p>写清这次想改什么、为什么改。页面会自动补项目规则、相关文件和 review 要点。</p>
        </div>
        <div class="workspace">
          <div class="stack">
            <div class="panel">
              <h3 id="taskTitle">需求 Prompt</h3>
              <textarea class="textarea" id="requirementInput" placeholder="写需求、背景、约束，以及你希望 LLM 规划什么。下一步会复制“生成 HTML+Markdown 评审稿”的指令给大模型。"></textarea>
            </div>
            <div class="panel">
              <h3>相关关键词</h3>
              <input class="input" id="focusInput" placeholder="文件、模块、概念或关键词，例如 scripts / review.html / compile / entropy">
            </div>
            <div class="panel hidden">
              <h3>模式</h3>
              <select class="select" id="modeInput">
                <option value="feature">功能开发</option>
                <option value="algorithm">算法设计</option>
                <option value="refactor">重构</option>
                <option value="debug">调试 / 修复</option>
                <option value="research">研究工作流</option>
                <option value="docs">文档 / 知识库工作流</option>
              </select>
            </div>
            <div class="panel">
              <h3>计划约束</h3>
              <div class="chips" id="constraintInputs">
                <label class="chip"><input type="checkbox" value="保持改动小且可回退" checked>小步改</label>
                <label class="chip"><input type="checkbox" value="优先沿用当前仓库模式" checked>沿用现有模式</label>
                <label class="chip"><input type="checkbox" value="包含可运行 demo 或具体例子" checked>带 demo</label>
                <label class="chip"><input type="checkbox" value="实现前先指出风险" checked>先看风险</label>
                <label class="chip"><input type="checkbox" value="修改生成器后重新生成 HTML" checked>重新生成 HTML</label>
              </div>
            </div>
          </div>

          <div class="stack">
            <div class="panel">
              <h3>当前简报</h3>
              <p id="liveBrief"></p>
            </div>
            <div class="panel">
              <h3>项目快照</h3>
              <div class="stats" id="stats"></div>
            </div>
            <div class="panel">
              <h3>相关文件</h3>
              <div class="file-list" id="matchedFiles"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="approaches">
        <div class="section-head">
          <h2>方案比较</h2>
          <p>日常开发推荐“稳健计划”。需求不清楚时先选“最小闭环”；需要 HTML 帮你 review plan 时选“可视化评审”。</p>
        </div>
        <div class="approach-grid" id="approachGrid"></div>
      </section>

      <section id="plan">
        <div class="section-head">
          <h2>执行计划</h2>
          <p>把需求拆成可 review 的小片，每片都有产物和验证方式。</p>
        </div>
        <div class="plan-grid" id="planGrid"></div>
      </section>

      <section id="materials">
        <div class="section-head">
          <h2>评审素材</h2>
          <p>这些只是生成 plan artifact 的素材：当前项目模块、需求模块和参考示例。</p>
        </div>
        <div class="demo-grid">
          <article class="demo">
            <h3>A · 当前项目模块</h3>
            <div class="demo-body">
              <div class="flow" id="codebaseModules"></div>
            </div>
          </article>
          <article class="demo">
            <h3>B · 需求模块</h3>
            <div class="demo-body">
              <div class="matrix" id="requirementModules"></div>
            </div>
          </article>
          <article class="demo">
            <h3>C · 参考示例</h3>
            <div class="demo-body">
              <div class="matrix" id="referenceExamples"></div>
            </div>
          </article>
          <article class="demo">
            <h3>D · 评审重点</h3>
            <div class="demo-body">
              <div class="matrix" id="reviewFocus"></div>
            </div>
          </article>
        </div>
      </section>

      <section id="artifact">
        <div class="section-head">
          <h2>预览大模型生成的评审稿</h2>
          <p>把大模型生成的 HTML 和 markdown 粘贴回来。先看 HTML 是否可读、计划是否合理，再决定是否交给执行模型。</p>
        </div>
        <div class="review-grid">
          <div class="stack">
            <div class="panel">
              <h3>粘贴 HTML artifact</h3>
              <textarea class="artifact-input" id="htmlArtifactInput" placeholder="把大模型生成的 plan-review.html 内容粘贴到这里。"></textarea>
            </div>
            <div class="panel">
              <h3>粘贴 Markdown 计划</h3>
              <textarea class="artifact-input" id="markdownArtifactInput" placeholder="把大模型生成的 plan-review.md 内容粘贴到这里。"></textarea>
            </div>
          </div>
          <div class="panel">
            <h3>HTML 预览</h3>
            <iframe class="artifact-frame" id="htmlArtifactPreview" title="HTML artifact preview" sandbox=""></iframe>
          </div>
        </div>
      </section>

      <section id="export">
        <div class="section-head">
          <h2>复制执行稿</h2>
          <p>review 通过后直接复制；页面不再展开长 prompt，避免和已审 markdown 重复。</p>
        </div>
        <div class="prompt">
          <div class="actions">
            <button id="loadIngestDemo">载入 ingest 优化示例</button>
            <button class="primary" id="copyGenerationPrompt">复制 artifact 生成指令</button>
            <button class="primary" id="copyPrompt">复制 prompt</button>
            <button id="copyPlan">复制已审 markdown</button>
            <button id="reset">重置</button>
          </div>
          <p class="hint">“复制 prompt”会包含已审 markdown、必要项目规则和相关文件；“复制已审 markdown”只复制计划本身。</p>
        </div>
      </section>
    </main>
  </div>

  <script id="repo-data" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("repo-data").textContent);
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];

    function escapeClient(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    const taskTemplates = [
      {
        id: "explore",
        label: "探索",
        title: "我还不确定怎么做",
        description: "我还不确定怎么做。先让页面生成几条路线，比较成本、风险和适用场景。",
        mode: "feature",
        approach: "thin",
        placeholder: "例如：我要给当前仓库加一个 lint workflow，但不确定是脚本、HTML 入口，还是文档规则。",
      },
      {
        id: "plan",
        label: "做计划",
        title: "把需求拆成执行计划",
        description: "目标比较明确。把它拆成阶段、改动文件、验证命令和交付清单。日常开发优先用这个。",
        mode: "feature",
        approach: "modular",
        placeholder: "例如：实现 Raw lint，检查 TL;DR、Tags、Related Wiki，并把结果写进 log。",
      },
      {
        id: "demo",
        label: "可视化",
        title: "生成可视化评审稿",
        description: "我需要用 HTML 看 plan：现有系统、改动方案、具体例子、风险和验收。",
        mode: "algorithm",
        approach: "prototype",
        placeholder: "例如：设计一个算法 demo，展示如何根据关键词匹配相关文件和 Raw/Wiki。",
      },
      {
        id: "inspect",
        label: "先理解",
        title: "改之前先看仓库",
        description: "先看相关文件和项目规则，再决定是否动手改代码。",
        mode: "research",
        approach: "thin",
        placeholder: "例如：我想理解 review.html 和 dev-cockpit.html 的分工，以及下一步该改哪里。",
      },
    ];

    const approachTemplates = [
      {
        id: "thin",
        title: "01 最小闭环",
        summary: "先做最小可用路径：少量文件、完整闭环、快速验证。适合需求还在变、但你想尽快摸到真实体验。",
        cost: "低",
        risk: "低",
        best: "需求还不稳定",
        files: "1-3 个文件",
      },
      {
        id: "modular",
        title: "02 稳健计划",
        summary: "先抽出数据模型和生成逻辑，再铺 UI。适合这个能力以后会反复复用，需要长期维护。",
        cost: "中",
        risk: "中",
        best: "会持续演进",
        files: "3-6 个文件",
      },
      {
        id: "prototype",
        title: "03 可视化评审",
        summary: "先把 plan 渲染成 HTML，检查现有系统、改动方案、具体例子和验收方式是否合理。",
        cost: "中",
        risk: "中",
        best: "体验优先",
        files: "2-5 个文件",
      },
    ];

    const planTemplates = {
      thin: [
        ["阶段 1", "摸清当前结构", ["读取规则和相关脚本", "确认真相源", "列出可能改动文件"]],
        ["阶段 2", "做一条最小闭环", ["创建或修改生成器", "生成第一个可用页面 / 功能", "加入复制或导出入口"]],
        ["阶段 3", "验证并记录", ["重新生成 HTML", "运行静态检查", "更新 README / log"]],
        ["阶段 4", "收尾交付", ["压缩文案", "补齐风险提示", "提交并推送"]],
      ],
      modular: [
        ["阶段 1", "定义计划模型", ["把仓库事实和 UI 模板分开", "设计 prompt 导出格式", "明确维护边界"]],
        ["阶段 2", "生成项目摘要", ["扫描文件", "提取 Wiki / Raw 摘要", "按关键词排序相关项"]],
        ["阶段 3", "渲染工作台", ["方案卡片", "执行计划", "Demo 草图", "导出面板"]],
        ["阶段 4", "保证可维护", ["补文档", "保留生成命令", "跑静态检查", "写 log 记录"]],
      ],
      prototype: [
        ["阶段 1", "先画交互", ["写出数据流样例", "做实时需求输入", "让方案卡可选择"]],
        ["阶段 2", "补 demo", ["算法例子", "风险矩阵", "验收故事", "数据流"]],
        ["阶段 3", "接入仓库事实", ["相关文件", "最近 log", "Wiki / Raw 提示"]],
        ["阶段 4", "打磨导出", ["复制 prompt", "复制 markdown 计划", "重置状态", "验证脚本可解析"]],
      ],
    };

    let activeTask = "plan";
    let activeApproach = "modular";

    function textMatch(value, query) {
      return String(value || "").toLowerCase().includes(query.toLowerCase());
    }

    function terms() {
      return [$("#requirementInput").value, $("#focusInput").value]
        .join(" ")
        .toLowerCase()
        .split(/\\s+/)
        .filter((term) => term.length > 1);
    }

    function score(value) {
      const haystack = String(value || "").toLowerCase();
      return terms().reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    }

    function selectedConstraints() {
      return $$("#constraintInputs input:checked").map((input) => input.value);
    }

    function currentTask() {
      return taskTemplates.find((item) => item.id === activeTask) || taskTemplates[0];
    }

    function matchedFiles() {
      const ranked = data.files
        .map((file) => ({ file, score: score(file) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
        .map((item) => item.file);
      const defaults = ["AGENTS.md", "schema.md", "README.md", "scripts/build-review.mjs", "review.html", "log.md"];
      return (ranked.length ? ranked : defaults).slice(0, 10);
    }

    function matchedPapers() {
      const wiki = data.wikiPages
        .map((page) => ({ type: "Wiki", file: page.file, title: page.title, meta: page.coverage + " · " + page.claims + " claims", score: score([page.file, page.title, page.definition].join(" ")) }))
        .filter((item) => item.score > 0);
      const raw = data.rawNotes
        .map((note) => ({ type: "Raw", file: note.file, title: note.title, meta: note.tags.join(" "), score: score([note.file, note.title, note.tags.join(" "), note.tldr].join(" ")) }))
        .filter((item) => item.score > 0);
      return [...wiki, ...raw].sort((a, b) => b.score - a.score).slice(0, 8);
    }

    function renderStats() {
      const stats = [
        ["文件", data.files.length],
        ["脚本", data.groups.find((item) => item.name === "脚本")?.count || 0],
        ["Wiki 页", data.wikiPages.length],
        ["Raw 笔记", data.rawNotes.length],
      ];
      $("#stats").innerHTML = stats.map(([label, value]) =>
        '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>'
      ).join("");
    }

    function renderChoices() {
      $("#choiceGrid").innerHTML = taskTemplates.map((item) => (
        '<button class="choice-card' + (item.id === activeTask ? " active" : "") + '" data-task="' + item.id + '">' +
          '<small>' + item.label + '</small>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.description + '</p>' +
        '</button>'
      )).join("");
      $$("[data-task]").forEach((card) => card.addEventListener("click", () => {
        const task = taskTemplates.find((item) => item.id === card.dataset.task);
        activeTask = task.id;
        activeApproach = task.approach;
        $("#modeInput").value = task.mode;
        $("#requirementInput").placeholder = task.placeholder;
        render();
        $("#work").scrollIntoView({ behavior: "smooth", block: "start" });
      }));
    }

    function renderBrief() {
      const requirement = $("#requirementInput").value.trim() || "还没有写需求。先写一句话，页面会自动组织计划。";
      const mode = $("#modeInput").selectedOptions[0].textContent;
      const files = matchedFiles().slice(0, 4).join(", ");
      const task = currentTask();
      $("#taskTitle").textContent = task.title;
      $("#requirementInput").placeholder = task.placeholder;
      $("#liveBrief").textContent = task.label + " · " + mode + " · " + requirement + " · 可能相关文件：" + files;
    }

    function renderFileList(selector, files) {
      $(selector).innerHTML = files.map((file) => {
        const href = file.replaceAll(" ", "%20");
        return '<a class="file-row" href="' + href + '"><code>' + file + '</code><span>' + classify(file) + '</span></a>';
      }).join("");
    }

    function classify(file) {
      if (file.startsWith("Raw/")) return "Raw";
      if (file.startsWith("Wiki/")) return "Wiki";
      if (file.startsWith("docs/")) return "文档";
      if (file.startsWith("scripts/")) return "脚本";
      if (file.endsWith(".html")) return "HTML";
      return "核心";
    }

    function renderApproaches() {
      $("#approachGrid").innerHTML = approachTemplates.map((item) => (
        '<article class="approach' + (item.id === activeApproach ? " active" : "") + '" data-approach="' + item.id + '">' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.summary + '</p>' +
          '<table><tr><td>成本</td><td>' + item.cost + '</td></tr><tr><td>风险</td><td>' + item.risk + '</td></tr><tr><td>适合</td><td>' + item.best + '</td></tr><tr><td>改动</td><td>' + item.files + '</td></tr></table>' +
        '</article>'
      )).join("");
      $$("[data-approach]").forEach((card) => card.addEventListener("click", () => {
        activeApproach = card.dataset.approach;
        render();
      }));
    }

    function renderPlan() {
      const slices = planTemplates[activeApproach];
      $("#planGrid").innerHTML = slices.map((slice) => (
        '<article class="milestone"><b>' + slice[0] + '</b><h3>' + slice[1] + '</h3><ul>' +
          slice[2].map((item) => '<li>' + item + '</li>').join("") +
        '</ul></article>'
      )).join("");
    }

    function renderMaterials() {
      const requirement = $("#requirementInput").value.trim() || "当前需求";
      const groups = data.groups.slice(0, 4);
      $("#codebaseModules").innerHTML = groups.map((item) =>
        '<div><b>' + item.name + '</b><span>' + item.count + ' 个文件</span></div>'
      ).join("");

      $("#requirementModules").innerHTML = [
        ["需求", requirement.slice(0, 90) || "未填写"],
        ["关键词", $("#focusInput").value.trim() || "未指定"],
        ["工作流", currentTask().label],
        ["方案", (approachTemplates.find((item) => item.id === activeApproach) || approachTemplates[0]).title],
      ].map(([label, text]) => '<div><strong>' + label + '</strong><span>' + text + '</span></div>').join("");

      $("#referenceExamples").innerHTML = [
        ["项目地图", "用模块卡片展示哪些目录/脚本会被改。"],
        ["需求拆解", "把目标、非目标、约束、验收标准分开。"],
        ["Plan demo", "为关键步骤配输入/输出或 UI 状态示例。"],
        ["执行包", "最终 markdown 能直接交给 LLM 执行。"],
      ].map(([label, text]) => '<div><b>' + label + '</b><span>' + text + '</span></div>').join("");

      $("#reviewFocus").innerHTML = [
        ["合理性", "计划是否真的对应当前需求？"],
        ["项目事实", "是否引用了正确的模块、规则和文件？"],
        ["可执行", "每一步是否能被 LLM 明确执行？"],
        ["验收", "是否有清晰检查命令或验收故事？"],
      ].map(([label, text]) => '<div><strong>' + label + '</strong><span>' + text + '</span></div>').join("");
    }

    function artifactModel() {
      const task = currentTask();
      const approach = approachTemplates.find((item) => item.id === activeApproach);
      const slices = planTemplates[activeApproach];
      const requirement = $("#requirementInput").value.trim() || "还没有填写需求。请先写清楚目标和约束。";
      const focus = $("#focusInput").value.trim() || "未指定；先根据需求和项目结构判断。";
      return {
        task,
        approach,
        slices,
        requirement,
        focus,
        files: matchedFiles().slice(0, 8),
        papers: matchedPapers().slice(0, 5),
        constraints: selectedConstraints(),
      };
    }

    function scaffoldHtml() {
      const model = artifactModel();
      const paperItems = model.papers.length ? model.papers.map((item) => '<li>' + escapeClient(item.type + ' · ' + item.title + ' (' + item.file + ')') + '</li>').join("") : "<li>无直接匹配；执行前按需补读相关文件。</li>";
      return [
        '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Plan Review</title><style>body{font:15px/1.6 system-ui;padding:24px;max-width:1100px;margin:auto;color:#202421}section{border:1px solid #dbe2d7;border-radius:10px;padding:14px;margin:12px 0;background:#fffefb}h1,h2{margin-top:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:760px){.grid{grid-template-columns:1fr}}</style><body>',
        '<h1>Plan Review：' + escapeClient(model.task.title) + '</h1>',
        '<p>这是占位预览。真正的 HTML+Markdown 应由大模型根据左侧生成指令产出，再粘贴回本页 review。</p>',
        '<div class="artifact-grid">',
          '<section><h2>1. 当前项目模块</h2><ul>' + data.groups.map((item) => '<li>' + escapeClient(item.name + '：' + item.count + ' 个文件') + '</li>').join("") + '</ul></section>',
          '<section><h2>2. 需求模块</h2><p>' + escapeClient(model.requirement) + '</p><p><strong>关键词：</strong>' + escapeClient(model.focus) + '</p></section>',
          '<section><h2>3. 推荐方案</h2><p><strong>' + escapeClient(model.approach.title) + '</strong></p><p>' + escapeClient(model.approach.summary) + '</p></section>',
          '<section><h2>4. 执行计划草图</h2><ul>' + model.slices.map((slice) => '<li><strong>' + escapeClient(slice[0] + ' · ' + slice[1]) + '</strong>：' + escapeClient(slice[2].join("；")) + '</li>').join("") + '</ul></section>',
          '<section><h2>5. 相关文件</h2><ul>' + model.files.map((file) => '<li>' + escapeClient(file) + '</li>').join("") + '</ul></section>',
          '<section><h2>6. 相关 Raw / Wiki</h2><ul>' + paperItems + '</ul></section>',
        '</div>',
        '<section><h2>7. Review 检查</h2><ul><li>是否展示了真实项目模块？</li><li>是否有需求专属 demo，而不是页面自身 demo？</li><li>计划是否能直接执行？</li></ul></section></body></html>',
      ].join("");
    }

    function scaffoldMarkdown() {
      const model = artifactModel();
      return [
        "# 需求评审稿：" + model.task.title,
        "",
        "## 1. 需求和项目规则",
        model.requirement,
        "",
        "关键词：" + model.focus,
        "",
        "## 2. 推荐方案",
        model.approach.title + " — " + model.approach.summary,
        "",
        "## 3. 执行计划",
        ...model.slices.flatMap((slice) => ["", "### " + slice[0] + " · " + slice[1], ...slice[2].map((item) => "- " + item)]),
        "",
        "## 4. Review 检查",
        "- 需求是否能用一句话验收？",
        "- 改动文件是否集中？",
        "- 是否有风险和 demo 支撑？",
        "- 是否需要先读更多源码？",
        "",
        "## 5. 相关文件",
        ...model.files.map((file) => "- " + file),
        "",
        "## 6. 交给 LLM 前的执行指令",
        "如果这份评审稿合理，请让 LLM 先读 AGENTS.md、schema.md、log.md 顶部和相关文件，再按计划执行；完成后运行生成/检查命令，更新 log，并按仓库规则提交推送。",
      ].join("\\n");
    }

    function ingestDemoHtml() {
      return [
        "<!doctype html>",
        "<html lang=\\"zh-CN\\">",
        "<meta charset=\\"utf-8\\">",
        "<title>Plan Review · 优化 ingest 模块</title>",
        "<style>",
        "body{font:15px/1.6 system-ui;margin:0;background:#f7f8f5;color:#202421}",
        "main{max-width:1120px;margin:auto;padding:24px}",
        "h1,h2,h3{margin:0 0 8px}p{margin:0;color:#626a64}",
        "section,.card{border:1px solid #dbe2d7;border-radius:10px;background:#fffefb;padding:14px;margin:12px 0}",
        ".grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
        ".flow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}",
        ".step{border:1px solid #dbe2d7;border-radius:8px;background:#fbfdf9;padding:10px;min-height:96px}",
        ".step b{display:block;color:#0f766e;margin-bottom:4px}",
        "table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #dbe2d7;padding:8px;text-align:left;vertical-align:top}",
        "code{background:#eef3ea;border-radius:5px;padding:2px 5px}",
        "@media(max-width:840px){.grid,.flow{grid-template-columns:1fr}}",
        "</style>",
        "<main>",
        "<h1>Plan Review：优化当前 ingest 模块</h1>",
        "<p>目标：把现在依赖人工遵守规则的 ingest 流程，升级成“LLM 生成 Raw 前后都有结构化校验和可审阅报告”的稳定工作流。</p>",
        "<section><h2>1. 当前 ingest 是怎么实现的</h2><div class=\\"flow\\">",
        "<div class=\\"step\\"><b>输入</b>用户给 arxiv / PDF / 笔记。</div>",
        "<div class=\\"step\\"><b>读规则</b>先读 <code>schema.md</code>、<code>log.md</code>、existing Raw。</div>",
        "<div class=\\"step\\"><b>查重</b>在 <code>Raw/</code> 查 arxiv id / 同题论文。</div>",
        "<div class=\\"step\\"><b>写 Raw</b>按 5-section + 理解型元素生成 <code>Raw/&lt;id&gt;.md</code>。</div>",
        "<div class=\\"step\\"><b>存 PDF</b>必要时保存到 <code>Raw/pdfs/&lt;id&gt;.pdf</code>。</div>",
        "<div class=\\"step\\"><b>记 log</b>在 <code>log.md</code> 顶部追加 ingest 记录，不改 Wiki。</div>",
        "</div></section>",
        "<section><h2>2. 现在的问题</h2><div class=\\"grid\\">",
        "<div class=\\"card\\"><h3>规则靠记忆</h3><p>必须 section、受控 tags、Related Wiki、log 格式都靠 LLM 自觉，容易漏。</p></div>",
        "<div class=\\"card\\"><h3>失败太晚发现</h3><p>Raw 写完以后才发现 tag 越界、ID 重复、缺理解型元素，会增加返工。</p></div>",
        "<div class=\\"card\\"><h3>没有审阅摘要</h3><p>用户看 Raw 前，不知道这次 ingest 是否完整、哪些地方需要重点审。</p></div>",
        "<div class=\\"card\\"><h3>lint 不可复用</h3><p>检查逻辑散落在自然语言规则里，不能被 HTML / CLI / LLM prompt 共同使用。</p></div>",
        "</div></section>",
        "<section><h2>3. 优化后的 ingest 模块</h2><table>",
        "<thead><tr><th>模块</th><th>职责</th><th>具体例子</th></tr></thead><tbody>",
        "<tr><td>Preflight</td><td>写 Raw 前检查 ID、重复论文、受控 tags 候选。</td><td><code>paper-id=2605-foo</code> 已存在时直接阻断。</td></tr>",
        "<tr><td>Template Guard</td><td>检查 TL;DR / Method / Key Results / Takeaway / Open Questions 是否齐全。</td><td>缺 <code>What would break this</code> 时标红提醒。</td></tr>",
        "<tr><td>Tag Guard</td><td>从 <code>schema.md</code> 解析 approved tags，禁止自造 tag。</td><td><code>#entropy-guided</code> 建议映射到 <code>#entropy</code>。</td></tr>",
        "<tr><td>Review Report</td><td>生成 ingest review 摘要，方便用户先看风险再看 Raw。</td><td>“需人工确认：Benchmark 数字来自摘要，未核 PDF 表格”。</td></tr>",
        "</tbody></table></section>",
        "<section><h2>4. 建议改动文件</h2><ul>",
        "<li><code>scripts/ingest-lint.mjs</code>：新增可复用 lint 脚本。</li>",
        "<li><code>scripts/build-dev-cockpit.mjs</code>：在 plan artifact 生成指令里提示 ingest lint 输出。</li>",
        "<li><code>docs/dev-cockpit-workflow.md</code>：补充 ingest review demo 用法。</li>",
        "<li><code>log.md</code>：记录 workflow refactor，不触碰 <code>Wiki/</code>。</li>",
        "</ul></section>",
        "<section><h2>5. 验收方式</h2><ul>",
        "<li>构造一个缺 <code>Tags</code> 的 Raw，lint 能报错。</li>",
        "<li>构造一个越界 tag，lint 能指出并建议最接近 approved tag。</li>",
        "<li>对现有 Raw 跑 lint，只报告历史兼容问题，不自动 retrofit。</li>",
        "<li>确认 ingest 仍只动 <code>Raw/</code> 和 <code>log.md</code>，不改 <code>Wiki/</code>。</li>",
        "</ul></section>",
        "</main>",
        "</html>",
      ].join("\\n");
    }

    function ingestDemoMarkdown() {
      return [
        "# Plan Review：优化当前 ingest 模块",
        "",
        "## 目标",
        "把现在依赖人工遵守规则的 ingest 流程，升级成“LLM 生成 Raw 前后都有结构化校验和可审阅报告”的稳定工作流。",
        "",
        "## 当前 ingest 流程",
        "- 输入：用户给 arxiv / PDF / 笔记。",
        "- 读规则：先读 schema.md、log.md、existing Raw。",
        "- 查重：在 Raw/ 查 arxiv id / 同题论文。",
        "- 写 Raw：按 5-section + 理解型元素生成 Raw/<id>.md。",
        "- 存 PDF：必要时保存到 Raw/pdfs/<id>.pdf。",
        "- 记 log：在 log.md 顶部追加 ingest 记录，不改 Wiki。",
        "",
        "## 问题",
        "- 规则靠 LLM 记忆，容易漏 section、tag、Related Wiki 或 log 格式。",
        "- 失败太晚发现，Raw 写完后才发现 ID 重复或 tag 越界。",
        "- 没有审阅摘要，用户不知道该重点检查哪里。",
        "- lint 逻辑不可复用，HTML / CLI / prompt 无法共享。",
        "",
        "## 优化模块",
        "- Preflight：写 Raw 前检查 ID、重复论文、受控 tags 候选。",
        "- Template Guard：检查 TL;DR / Method / Key Results / Takeaway / Open Questions 是否齐全。",
        "- Tag Guard：从 schema.md 解析 approved tags，禁止自造 tag。",
        "- Review Report：生成 ingest review 摘要，列出需要人工确认的数字、PDF、benchmark 和 tag。",
        "",
        "## 建议改动文件",
        "- scripts/ingest-lint.mjs：新增可复用 lint 脚本。",
        "- scripts/build-dev-cockpit.mjs：在 plan artifact 生成指令里提示 ingest lint 输出。",
        "- docs/dev-cockpit-workflow.md：补充 ingest review demo 用法。",
        "- log.md：记录 workflow refactor，不触碰 Wiki/。",
        "",
        "## 具体实现例子",
        "~~~text",
        "Raw/2605-demo.md",
        "- 缺 Tags → 报错：Missing required metadata: Tags",
        "- 含 #entropy-guided → 报错：Tag not approved; consider #entropy",
        "- 缺 What would break this → 警告：Method section lacks break-condition check",
        "~~~",
        "",
        "## 验收",
        "- 构造一个缺 Tags 的 Raw，lint 能报错。",
        "- 构造一个越界 tag，lint 能指出并建议最接近 approved tag。",
        "- 对现有 Raw 跑 lint，只报告历史兼容问题，不自动 retrofit。",
        "- 确认 ingest 仍只动 Raw/ 和 log.md，不改 Wiki/。",
      ].join("\\n");
    }

    function loadIngestDemo() {
      activeTask = "plan";
      activeApproach = "modular";
      $("#modeInput").value = "feature";
      $("#requirementInput").value = "优化当前 ingest 模块：在生成 Raw 前后加入结构化校验和可审阅报告，确保 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录都稳定；保持 ingest 只动 Raw/ 和 log.md，不触碰 Wiki/。";
      $("#focusInput").value = "ingest Raw schema tags log lint";
      $("#htmlArtifactInput").value = ingestDemoHtml();
      $("#markdownArtifactInput").value = ingestDemoMarkdown();
      render();
      $("#artifact").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function generationPrompt() {
      const model = artifactModel();
      return [
        "你要根据下面的需求和项目规则，生成两个 artifact：",
        "1. plan-review.html：给人类 review 的自包含 HTML 页面。",
        "2. plan-review.md：同内容的 markdown 执行计划。",
        "",
        "重要目标：HTML 不是装饰，也不是 prompt 生成器 demo。HTML 必须用于 review 这次具体 plan 是否合理。",
        "",
        "HTML 必须包含这些模块：",
        "- 当前项目模块：用卡片/表格展示相关目录、脚本、页面、文档，以及它们在本次改动中的角色。",
        "- 需求模块：目标、非目标、约束、用户故事、验收标准。",
        "- 方案比较：至少 2 个方案，说明为什么推荐其中一个。",
        "- Plan demo：针对本次需求的 demo，例如 UI 状态、数据流、算法输入输出、前后对比或测试故事；不要演示这个生成器本身。",
        "- 执行计划：按阶段列出要改文件、改动内容、验证命令和风险。",
        "- Review checklist：让人能判断是否可以交给 LLM 执行。",
        "",
        "Markdown 必须适合直接交给 LLM 执行，包含明确文件、步骤、验证和注意事项。",
        "",
        "用户需求：",
        model.requirement,
        "",
        "关键词：",
        model.focus,
        "",
        "页面初步匹配的相关文件：",
        ...model.files.map((file) => "- " + file),
        "",
        "项目模块统计：",
        ...data.groups.map((item) => "- " + item.name + "：" + item.count + " 个文件"),
        "",
        "约束：",
        ...model.constraints.map((item) => "- " + item),
        "",
        "请只输出两个 fenced code blocks：",
        "~~~html",
        "<!-- plan-review.html -->",
        "~~~",
        "~~~markdown",
        "<!-- plan-review.md -->",
        "~~~",
      ].join("\\n");
    }

    function planMarkdown() {
      const approach = approachTemplates.find((item) => item.id === activeApproach);
      const slices = planTemplates[activeApproach];
      const task = currentTask();
      return [
        "# 开发计划",
        "",
        "## 工作流",
        task.label + " — " + task.title,
        "",
        "## 需求",
        $("#requirementInput").value.trim() || "[写需求]",
        "",
        "## 选定方案",
        approach.title + " — " + approach.summary,
        "",
        "## 阶段",
        ...slices.flatMap((slice) => ["", "### " + slice[0] + " · " + slice[1], ...slice[2].map((item) => "- " + item)]),
        "",
        "## 可能相关文件",
        ...matchedFiles().map((file) => "- " + file),
      ].join("\\n");
    }

    function promptText() {
      const approach = approachTemplates.find((item) => item.id === activeApproach);
      const task = currentTask();
      const reviewedMarkdown = $("#markdownArtifactInput").value.trim() || scaffoldMarkdown();
      const reviewedHtml = $("#htmlArtifactInput").value.trim() || scaffoldHtml();
      return [
        "你正在 /Users/xuexiang/Documents/PaperNotes 仓库中工作。",
        "",
        "请先读 AGENTS.md、schema.md、log.md 顶部，再根据任务读取相关文件。",
        "",
        "用户需求：",
        $("#requirementInput").value.trim() || "[写需求]",
        "",
        "工作流：" + task.label + " — " + task.title,
        "开发模式：" + $("#modeInput").selectedOptions[0].textContent,
        "选定方案：" + approach.title,
        approach.summary,
        "",
        "约束：",
        ...selectedConstraints().map((item) => "- " + item),
        "",
        "可能相关文件：",
        ...matchedFiles().map((file) => "- " + file),
        "",
        "已经 review 过的 markdown 计划：",
        reviewedMarkdown,
        "",
        "对应 HTML 评审稿（供理解，不要手改生成物后忘记更新源文件）：",
        reviewedHtml,
        "",
        "完成前请验证：",
        "- 生成脚本能重新运行。",
        "- HTML 中关键交互和导出 prompt 存在。",
        "- 如果修改 repo 文件，更新 log.md 并按仓库规则提交推送。",
      ].join("\\n");
    }

    function renderArtifact() {
      $("#htmlArtifactPreview").srcdoc = $("#htmlArtifactInput").value.trim() || scaffoldHtml();
      if (!$("#markdownArtifactInput").value.trim()) {
        $("#markdownArtifactInput").placeholder = scaffoldMarkdown();
      }
    }

    async function copyText(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }

    function render() {
      renderChoices();
      renderStats();
      renderBrief();
      renderFileList("#matchedFiles", matchedFiles());
      renderApproaches();
      renderPlan();
      renderMaterials();
      renderArtifact();
    }

    ["input", "change"].forEach((eventName) => {
      $("#requirementInput").addEventListener(eventName, render);
      $("#focusInput").addEventListener(eventName, render);
      $("#modeInput").addEventListener(eventName, render);
      $("#htmlArtifactInput").addEventListener(eventName, render);
      $("#markdownArtifactInput").addEventListener(eventName, render);
      $$("#constraintInputs input").forEach((input) => input.addEventListener(eventName, render));
    });

    $("#copyPrompt").addEventListener("click", async () => {
      const ok = await copyText(promptText());
      $("#copyPrompt").textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => $("#copyPrompt").textContent = "复制 prompt", 900);
    });

    $("#copyGenerationPrompt").addEventListener("click", async () => {
      const ok = await copyText(generationPrompt());
      $("#copyGenerationPrompt").textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => $("#copyGenerationPrompt").textContent = "复制 artifact 生成指令", 900);
    });

    $("#copyPlan").addEventListener("click", async () => {
      const ok = await copyText($("#markdownArtifactInput").value.trim() || scaffoldMarkdown());
      $("#copyPlan").textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => $("#copyPlan").textContent = "复制已审 markdown", 900);
    });

    $("#loadIngestDemo").addEventListener("click", loadIngestDemo);

    $("#reset").addEventListener("click", () => {
      $("#requirementInput").value = "";
      $("#focusInput").value = "";
      $("#htmlArtifactInput").value = "";
      $("#markdownArtifactInput").value = "";
      $("#modeInput").value = "feature";
      activeTask = "plan";
      activeApproach = "modular";
      $$("#constraintInputs input").forEach((input) => input.checked = true);
      render();
    });

    render();
  </script>
</body>
</html>`;
}

async function main() {
  const files = (await walk(root)).filter((file) => !file.startsWith("Raw/pdfs/") && !file.endsWith(".pdf"));
  const [wikiPages, rawNotes] = await Promise.all([
    parseWiki(),
    parseRaw(),
  ]);

  const data = {
    generatedAt: new Date().toISOString(),
    files,
    groups: makeFileFacts(files),
    wikiPages,
    rawNotes,
  };

  await fs.writeFile(outputPath, buildHtml(data), "utf8");
  console.log(`Generated ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
