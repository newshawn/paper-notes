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
  if (file.startsWith("Raw/")) return "Raw";
  if (file.startsWith("Wiki/")) return "Wiki";
  if (file.startsWith("docs/")) return "Docs";
  if (file.startsWith("scripts/")) return "Scripts";
  if (file.endsWith(".html")) return "HTML";
  if (["README.md", "AGENTS.md", "CLAUDE.md", "schema.md", "index.md", "log.md"].includes(file)) return "Core";
  return "Other";
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
  <title>PaperNotes Dev Cockpit</title>
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
      .approach-grid, .plan-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 680px) {
      main { padding: 16px; }
      .hero h2 { font-size: 26px; }
      .stats, .approach-grid, .plan-grid, .demo-grid, .flow { grid-template-columns: 1fr; }
      .section-head { display: grid; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand">
        <h1>PaperNotes Dev Cockpit</h1>
        <p>把“我要改什么”变成可比较、可演示、可交给 LLM 执行的计划。</p>
      </div>
      <nav class="nav" aria-label="Sections">
        <a href="#requirement">Requirement</a>
        <a href="#approaches">Approaches</a>
        <a href="#plan">Plan</a>
        <a href="#demos">Demos</a>
        <a href="#context">Repo Context</a>
        <a href="#export">Export Prompt</a>
      </nav>
      <div class="quick-links">
        <a href="review.html">Open review.html</a>
        <a href="README.md">README.md</a>
        <a href="schema.md">schema.md</a>
        <a href="AGENTS.md">AGENTS.md</a>
      </div>
    </aside>

    <main>
      <section class="hero" id="top">
        <div class="panel">
          <h2>开发前，先把方向摆到桌面上。</h2>
          <p>像 html-effectiveness 的 exploration / implementation plan：同一个需求先生成几条路线、风险表、关键文件和 demo，再导出给 LLM 执行。它不是源码真相源，而是开发决策界面。</p>
        </div>
        <div class="panel">
          <h3>Two HTMLs, Two Jobs</h3>
          <p><strong>review.html</strong> 用来看仓库和知识库状态。<strong>dev-cockpit.html</strong> 用来拆需求、比较方案、组织 demo、导出执行 prompt。</p>
        </div>
      </section>

      <div class="stats" id="stats"></div>

      <section id="requirement">
        <div class="section-head">
          <h2>Requirement</h2>
          <p>先写需求，再让页面帮你组织上下文。这里的内容不会写回仓库，只用于生成计划和 prompt。</p>
        </div>
        <div class="workspace">
          <div class="stack">
            <div class="panel">
              <h3>What are we building?</h3>
              <textarea class="textarea" id="requirementInput" placeholder="例如：给当前仓库加一个开发 cockpit，能比较实现方案、展示 demo、导出 LLM prompt。"></textarea>
            </div>
            <div class="panel">
              <h3>Focus</h3>
              <input class="input" id="focusInput" placeholder="文件、模块、概念或关键词，例如 scripts / review.html / compile / entropy">
            </div>
            <div class="panel">
              <h3>Mode</h3>
              <select class="select" id="modeInput">
                <option value="feature">Feature development</option>
                <option value="algorithm">Algorithm design</option>
                <option value="refactor">Refactor</option>
                <option value="debug">Debug / repair</option>
                <option value="research">Research workflow</option>
                <option value="docs">Docs / knowledge workflow</option>
              </select>
            </div>
            <div class="panel">
              <h3>Planning constraints</h3>
              <div class="chips" id="constraintInputs">
                <label class="chip"><input type="checkbox" value="Keep changes small and reversible" checked>Small slices</label>
                <label class="chip"><input type="checkbox" value="Prefer existing repo patterns" checked>Existing patterns</label>
                <label class="chip"><input type="checkbox" value="Include runnable demos or examples" checked>Demos</label>
                <label class="chip"><input type="checkbox" value="Call out risks before implementation" checked>Risks first</label>
                <label class="chip"><input type="checkbox" value="Regenerate generated HTML after script changes" checked>Regenerate HTML</label>
              </div>
            </div>
          </div>

          <div class="stack">
            <div class="panel">
              <h3>Live brief</h3>
              <p id="liveBrief"></p>
            </div>
            <div class="panel">
              <h3>Matched files</h3>
              <div class="file-list" id="matchedFiles"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="approaches">
        <div class="section-head">
          <h2>Approaches</h2>
          <p>三条路线并排看。选中一条后，下面的计划和导出 prompt 会跟着变。</p>
        </div>
        <div class="approach-grid" id="approachGrid"></div>
      </section>

      <section id="plan">
        <div class="section-head">
          <h2>Implementation Plan</h2>
          <p>把需求拆成可 review 的小片，每片都有产物和验证方式。</p>
        </div>
        <div class="plan-grid" id="planGrid"></div>
      </section>

      <section id="demos">
        <div class="section-head">
          <h2>Demo Slots</h2>
          <p>每个要点下面都应该有一个能看的 demo：算法例子、UI 状态、数据流或测试样例。</p>
        </div>
        <div class="demo-grid">
          <article class="demo">
            <h3>A · Data / Control Flow</h3>
            <div class="demo-body">
              <div class="flow" id="flowDemo"></div>
            </div>
          </article>
          <article class="demo">
            <h3>B · Risk Matrix</h3>
            <div class="demo-body">
              <div class="matrix" id="riskDemo"></div>
            </div>
          </article>
          <article class="demo">
            <h3>C · Algorithm Example</h3>
            <div class="demo-body">
              <p id="algorithmDemo"></p>
            </div>
          </article>
          <article class="demo">
            <h3>D · Test Story</h3>
            <div class="demo-body">
              <p id="testDemo"></p>
            </div>
          </article>
        </div>
      </section>

      <section id="context">
        <div class="section-head">
          <h2>Repo Context</h2>
          <p>从仓库生成的轻量上下文，用来避免 LLM 一上来就失焦。</p>
        </div>
        <div class="workspace">
          <div class="panel">
            <h3>Recent log</h3>
            <div class="file-list" id="recentLog"></div>
          </div>
          <div class="panel">
            <h3>Relevant Wiki / Raw</h3>
            <div class="file-list" id="paperContext"></div>
          </div>
        </div>
      </section>

      <section id="export">
        <div class="section-head">
          <h2>Export Prompt</h2>
          <p>把当前选择导出给 LLM。这里故意偏具体，让执行者知道先读什么、改什么、怎么验收。</p>
        </div>
        <div class="prompt">
          <div class="actions">
            <button class="primary" id="copyPrompt">Copy prompt</button>
            <button id="copyPlan">Copy plan markdown</button>
            <button id="reset">Reset</button>
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

    const approachTemplates = [
      {
        id: "thin",
        title: "01 Thin vertical slice",
        summary: "先做最小可用路径：少量文件、完整闭环、快速验证。适合需求还在变、但你想尽快摸到真实体验。",
        cost: "Low",
        risk: "Low",
        best: "需求还不稳定",
        files: "1-3 files",
      },
      {
        id: "modular",
        title: "02 Modular foundation",
        summary: "先抽出数据模型和生成逻辑，再铺 UI。适合这个能力以后会反复复用，需要长期维护。",
        cost: "Medium",
        risk: "Medium",
        best: "会持续演进",
        files: "3-6 files",
      },
      {
        id: "prototype",
        title: "03 Interactive prototype",
        summary: "先把 demo 做出来，用交互验证 plan 是否好用，再回头固化脚本和文档。",
        cost: "Medium",
        risk: "Medium",
        best: "体验优先",
        files: "2-5 files",
      },
    ];

    const planTemplates = {
      thin: [
        ["Slice 1", "Trace current repo", ["Read rules and current scripts", "Identify source of truth", "List likely touched files"]],
        ["Slice 2", "Build one working path", ["Create or edit generator", "Render the first HTML workflow", "Add copy/export affordance"]],
        ["Slice 3", "Verify and document", ["Regenerate HTML", "Run static checks", "Update README/log"]],
        ["Slice 4", "Polish handoff", ["Tighten labels", "Add missing risk notes", "Commit and push"]],
      ],
      modular: [
        ["Slice 1", "Define model", ["Separate repo facts from UI templates", "Design prompt export shape", "Name maintenance boundaries"]],
        ["Slice 2", "Generate contexts", ["Scan files", "Extract Wiki/Raw summaries", "Rank matches from focus words"]],
        ["Slice 3", "Render cockpit", ["Approach cards", "Plan timeline", "Demo slots", "Export panel"]],
        ["Slice 4", "Guard maintenance", ["Docs", "Regeneration command", "Static checks", "Log entry"]],
      ],
      prototype: [
        ["Slice 1", "Sketch interaction", ["Write fake data flow", "Create live requirement input", "Make approach cards selectable"]],
        ["Slice 2", "Add demos", ["Algorithm example", "Risk matrix", "Test story", "Data flow"]],
        ["Slice 3", "Connect repo facts", ["Matched files", "Recent log", "Wiki/Raw hints"]],
        ["Slice 4", "Harden export", ["Copy prompt", "Copy markdown plan", "Reset state", "Validate script parse"]],
      ],
    };

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
        ["Files", data.files.length],
        ["Scripts", data.groups.find((item) => item.name === "Scripts")?.count || 0],
        ["Wiki pages", data.wikiPages.length],
        ["Raw notes", data.rawNotes.length],
      ];
      $("#stats").innerHTML = stats.map(([label, value]) =>
        '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>'
      ).join("");
    }

    function renderBrief() {
      const requirement = $("#requirementInput").value.trim() || "还没有写需求。先写一句话，页面会自动组织计划。";
      const mode = $("#modeInput").selectedOptions[0].textContent;
      const files = matchedFiles().slice(0, 4).join(", ");
      $("#liveBrief").textContent = mode + " · " + requirement + " · likely files: " + files;
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
      if (file.startsWith("docs/")) return "Docs";
      if (file.startsWith("scripts/")) return "Script";
      if (file.endsWith(".html")) return "HTML";
      return "Core";
    }

    function renderApproaches() {
      $("#approachGrid").innerHTML = approachTemplates.map((item) => (
        '<article class="approach' + (item.id === activeApproach ? " active" : "") + '" data-approach="' + item.id + '">' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.summary + '</p>' +
          '<table><tr><td>Cost</td><td>' + item.cost + '</td></tr><tr><td>Risk</td><td>' + item.risk + '</td></tr><tr><td>Best when</td><td>' + item.best + '</td></tr><tr><td>Touch</td><td>' + item.files + '</td></tr></table>' +
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
        ["Input", "需求 + focus words"],
        ["Context", "匹配文件 / Wiki / Raw"],
        ["Plan", "方案 + milestones"],
        ["Export", "LLM prompt / markdown"],
      ].map(([label, text]) => '<div><b>' + label + '</b><span>' + text + '</span></div>').join("");

      $("#riskDemo").innerHTML = [
        ["Scope drift", "需求太散时先锁定 one-sentence goal。"],
        ["Wrong context", "相关文件由 focus words 排序，执行前仍要读源码。"],
        ["Demo rot", "demo 是计划辅助，不是生产逻辑。"],
        ["Over-build", "先选 thin slice，只有复用明确时再 modular。"],
      ].map(([label, text]) => '<div><strong>' + label + '</strong><span>' + text + '</span></div>').join("");

      $("#algorithmDemo").textContent = "示例：把需求拆成 tokens，给文件路径 / Wiki 标题 / Raw tags 打分；命中越多越靠前。当前需求：「" + requirement + "」。";
      $("#testDemo").textContent = "验收故事：修改生成脚本后运行 node scripts/build-dev-cockpit.mjs；再解析嵌入 JS，检查导出 prompt、方案卡、demo slots 是否存在。";
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
      )).join("") : '<div class="file-row"><code>No direct paper match</code><span>Use focus words to narrow research context.</span></div>';
    }

    function planMarkdown() {
      const approach = approachTemplates.find((item) => item.id === activeApproach);
      const slices = planTemplates[activeApproach];
      return [
        "# Development Plan",
        "",
        "## Requirement",
        $("#requirementInput").value.trim() || "[write requirement]",
        "",
        "## Selected Approach",
        approach.title + " — " + approach.summary,
        "",
        "## Milestones",
        ...slices.flatMap((slice) => ["", "### " + slice[0] + " · " + slice[1], ...slice[2].map((item) => "- " + item)]),
        "",
        "## Likely Files",
        ...matchedFiles().map((file) => "- " + file),
      ].join("\\n");
    }

    function promptText() {
      const approach = approachTemplates.find((item) => item.id === activeApproach);
      return [
        "你正在 /Users/xuexiang/Documents/PaperNotes 仓库中工作。",
        "",
        "请先读 AGENTS.md、schema.md、log.md 顶部，再根据任务读取相关文件。",
        "",
        "用户需求：",
        $("#requirementInput").value.trim() || "[write requirement]",
        "",
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
      $("#copyPrompt").textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => $("#copyPrompt").textContent = "Copy prompt", 900);
    });

    $("#copyPlan").addEventListener("click", async () => {
      const ok = await copyText(planMarkdown());
      $("#copyPlan").textContent = ok ? "Copied" : "Copy plan markdown";
      setTimeout(() => $("#copyPlan").textContent = "Copy plan markdown", 900);
    });

    $("#reset").addEventListener("click", () => {
      $("#requirementInput").value = "";
      $("#focusInput").value = "";
      $("#modeInput").value = "feature";
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
