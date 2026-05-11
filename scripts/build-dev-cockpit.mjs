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

function parseLogEntries(logMarkdown) {
  const entries = [...logMarkdown.matchAll(/^##\s+\[([^\]]+)\]\s+([^|]+)\|\s+(.+)$/gm)];
  return entries.slice(0, 6).map((item) => ({
    date: item[1],
    action: item[2].trim(),
    target: item[3].trim(),
  }));
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
        <a href="#demos">查看 Demo</a>
        <a href="#export">导出 Prompt</a>
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
          <p>先选一个工作模式，再写一句需求。页面会把方案、计划、demo 和执行 prompt 摆出来，避免一上来就掉进长 markdown。</p>
        </div>
        <div class="panel">
          <h3>推荐流程</h3>
          <p>日常开发优先选“做计划”：写一句需求 → 看计划和风险 → 复制 prompt。只有需求还不清楚时才先探索方案。</p>
        </div>
      </section>

      <section id="choose">
        <div class="section-head">
          <h2>先选择你要做什么</h2>
          <p>先选任务入口，再填写需求。默认推荐“做计划”，因为稳定开发最需要的是清晰执行路径。</p>
        </div>
        <div class="choice-grid" id="choiceGrid"></div>
        <div class="mini-guide">
          <div class="mini-step"><b>01</b><span>选任务</span></div>
          <div class="mini-step"><b>02</b><span>写需求</span></div>
          <div class="mini-step"><b>03</b><span>看计划</span></div>
          <div class="mini-step"><b>04</b><span>扫风险</span></div>
          <div class="mini-step"><b>05</b><span>复制 prompt</span></div>
        </div>
      </section>

      <section id="work">
        <div class="section-head">
          <h2>需求简报</h2>
          <p>只填两件事：你要做什么，以及相关关键词。其余内容由页面生成。</p>
        </div>
        <div class="workspace">
          <div class="stack">
            <div class="panel">
              <h3 id="taskTitle">要做什么？</h3>
              <textarea class="textarea" id="requirementInput" placeholder="先在上面选一个工作模式，或者直接写一句需求。"></textarea>
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
              <h3>仓库快照</h3>
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
          <p>日常开发推荐“稳健计划”。需求不清楚时先选“最小闭环”，体验优先时选“交互原型”。</p>
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

      <section id="demos">
        <div class="section-head">
          <h2>Demo 草图</h2>
          <p>每个要点下面都应该有一个能看的 demo：算法例子、UI 状态、数据流或测试样例。</p>
        </div>
        <div class="demo-grid">
          <article class="demo">
            <h3>A · 数据 / 控制流</h3>
            <div class="demo-body">
              <div class="flow" id="flowDemo"></div>
            </div>
          </article>
          <article class="demo">
            <h3>B · 风险矩阵</h3>
            <div class="demo-body">
              <div class="matrix" id="riskDemo"></div>
            </div>
          </article>
          <article class="demo">
            <h3>C · 算法例子</h3>
            <div class="demo-body">
              <p id="algorithmDemo"></p>
            </div>
          </article>
          <article class="demo">
            <h3>D · 验收故事</h3>
            <div class="demo-body">
              <p id="testDemo"></p>
            </div>
          </article>
        </div>
      </section>

      <section id="context">
        <div class="section-head">
          <h2>仓库上下文</h2>
          <p>从仓库生成的轻量上下文，用来避免 LLM 一上来就失焦。</p>
        </div>
        <div class="workspace">
          <div class="panel">
            <h3>最近记录</h3>
            <div class="file-list" id="recentLog"></div>
          </div>
          <div class="panel">
            <h3>相关 Wiki / Raw</h3>
            <div class="file-list" id="paperContext"></div>
          </div>
        </div>
      </section>

      <section id="export">
        <div class="section-head">
          <h2>导出 Prompt</h2>
          <p>把当前选择导出给 LLM。这里故意偏具体，让执行者知道先读什么、改什么、怎么验收。</p>
        </div>
        <div class="prompt">
          <div class="actions">
            <button class="primary" id="copyPrompt">复制 prompt</button>
            <button id="copyPlan">复制计划 markdown</button>
            <button id="reset">重置</button>
          </div>
          <pre id="promptOutput"></pre>
        </div>
      </section>
    </main>
  </div>

  <script id="repo-data" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("repo-data").textContent);
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];

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
        label: "做 Demo",
        title: "给要点配 demo",
        description: "我需要每个要点下面有可看的 demo：流程、风险、算法例子或测试故事。",
        mode: "algorithm",
        approach: "prototype",
        placeholder: "例如：设计一个算法 demo，展示如何根据关键词匹配相关文件和 Raw/Wiki。",
      },
      {
        id: "inspect",
        label: "先理解",
        title: "改之前先看仓库",
        description: "先看相关文件、最近 log 和上下文，再决定是否动手改代码。",
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
        title: "03 交互原型",
        summary: "先把 demo 做出来，用交互验证 plan 是否好用，再回头固化脚本和文档。",
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
        ["阶段 2", "生成上下文", ["扫描文件", "提取 Wiki / Raw 摘要", "按关键词排序相关项"]],
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

    function renderDemos() {
      const requirement = $("#requirementInput").value.trim() || "当前需求";
      $("#flowDemo").innerHTML = [
        ["输入", "需求 + 关键词"],
        ["上下文", "匹配文件 / Wiki / Raw"],
        ["计划", "方案 + 阶段"],
        ["导出", "LLM prompt / markdown"],
      ].map(([label, text]) => '<div><b>' + label + '</b><span>' + text + '</span></div>').join("");

      $("#riskDemo").innerHTML = [
        ["范围漂移", "需求太散时先锁定一句话目标。"],
        ["上下文偏差", "相关文件由关键词排序，执行前仍要读源码。"],
        ["Demo 过期", "demo 是计划辅助，不是生产逻辑。"],
        ["过度设计", "日常先走稳健计划；需求不清楚才探索。"],
      ].map(([label, text]) => '<div><strong>' + label + '</strong><span>' + text + '</span></div>').join("");

      $("#algorithmDemo").textContent = "示例：把需求拆成关键词，给文件路径 / Wiki 标题 / Raw 标签打分；命中越多越靠前。当前需求：「" + requirement + "」。";
      $("#testDemo").textContent = "验收故事：修改生成脚本后运行 node scripts/build-dev-cockpit.mjs；再解析嵌入 JS，检查导出 prompt、方案卡、demo 草图是否存在。";
    }

    function renderRecentLog() {
      $("#recentLog").innerHTML = data.recentLog.map((entry) => (
        '<div class="file-row"><code>' + entry.date + ' · ' + entry.action + '</code><span>' + entry.target + '</span></div>'
      )).join("");
    }

    function renderPaperContext() {
      const items = matchedPapers();
      $("#paperContext").innerHTML = items.length ? items.map((item) => (
        '<a class="file-row" href="' + item.file + '"><code>' + item.type + ' · ' + item.title + '</code><span>' + item.meta + '</span></a>'
      )).join("") : '<div class="file-row"><code>没有直接匹配的论文上下文</code><span>可以用关键词缩小范围。</span></div>';
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
        "实现计划：",
        planMarkdown(),
        "",
        "完成前请验证：",
        "- 生成脚本能重新运行。",
        "- HTML 中关键交互和导出 prompt 存在。",
        "- 如果修改 repo 文件，更新 log.md 并按仓库规则提交推送。",
      ].join("\\n");
    }

    function renderPrompt() {
      $("#promptOutput").textContent = promptText();
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
      renderDemos();
      renderRecentLog();
      renderPaperContext();
      renderPrompt();
    }

    ["input", "change"].forEach((eventName) => {
      $("#requirementInput").addEventListener(eventName, render);
      $("#focusInput").addEventListener(eventName, render);
      $("#modeInput").addEventListener(eventName, render);
      $$("#constraintInputs input").forEach((input) => input.addEventListener(eventName, render));
    });

    $("#copyPrompt").addEventListener("click", async () => {
      const ok = await copyText(promptText());
      $("#copyPrompt").textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => $("#copyPrompt").textContent = "复制 prompt", 900);
    });

    $("#copyPlan").addEventListener("click", async () => {
      const ok = await copyText(planMarkdown());
      $("#copyPlan").textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => $("#copyPlan").textContent = "复制计划 markdown", 900);
    });

    $("#reset").addEventListener("click", () => {
      $("#requirementInput").value = "";
      $("#focusInput").value = "";
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
  const [wikiPages, rawNotes, logMarkdown] = await Promise.all([
    parseWiki(),
    parseRaw(),
    safeRead("log.md"),
  ]);

  const data = {
    generatedAt: new Date().toISOString(),
    files,
    groups: makeFileFacts(files),
    wikiPages,
    rawNotes,
    recentLog: parseLogEntries(logMarkdown),
  };

  await fs.writeFile(outputPath, buildHtml(data), "utf8");
  console.log(`Generated ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
