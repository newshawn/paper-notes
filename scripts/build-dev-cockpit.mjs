import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const outputPath = path.join(root, "dev-cockpit.html");
const rulePath = "docs/plan-artifact-pipeline.md";

async function safeRead(relativePath) {
  try {
    return await fs.readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function buildHtml({ ruleMarkdown }) {
  const payload = JSON.stringify({ ruleMarkdown }).replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plan Artifact Renderer</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8f5;
      --surface: #fffefb;
      --surface-2: #eef3ea;
      --ink: #202421;
      --muted: #626a64;
      --line: #dbe2d7;
      --blue: #2563eb;
      --teal: #0f766e;
      --shadow: 0 18px 42px rgba(24, 31, 27, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    a { color: var(--blue); text-underline-offset: 3px; }
    button, textarea, input { font: inherit; }

    main {
      width: min(1480px, calc(100% - 40px));
      margin: 0 auto;
      padding: 26px 0 34px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
      margin-bottom: 18px;
    }

    h1, h2, h3, p { margin-top: 0; }

    h1 {
      margin-bottom: 8px;
      font-size: clamp(28px, 4vw, 46px);
      line-height: 1.05;
      letter-spacing: 0;
    }

    header p, .hint, .rule-summary {
      color: var(--muted);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    button {
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      color: var(--ink);
      padding: 9px 13px;
      cursor: pointer;
    }

    button.primary {
      border-color: #1f2937;
      background: #1f2937;
      color: white;
    }

    .grid {
      display: grid;
      grid-template-columns: 420px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
      box-shadow: var(--shadow);
      padding: 16px;
      min-width: 0;
    }

    .stack {
      display: grid;
      gap: 14px;
    }

    textarea {
      display: block;
      width: 100%;
      min-height: 190px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      color: var(--ink);
      padding: 12px;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    #ruleView {
      max-height: 420px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      padding: 12px;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
    }

    iframe {
      width: 100%;
      min-height: 620px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
    }

    .markdown-preview {
      min-height: 620px;
      max-height: 760px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      padding: 18px;
    }

    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3 {
      line-height: 1.18;
      margin: 18px 0 8px;
    }

    .markdown-preview h1 { font-size: 28px; }
    .markdown-preview h2 { font-size: 21px; border-bottom: 1px solid var(--line); padding-bottom: 5px; }
    .markdown-preview h3 { font-size: 17px; }
    .markdown-preview p { margin: 8px 0; }
    .markdown-preview ul,
    .markdown-preview ol { margin: 8px 0 12px; padding-left: 22px; }
    .markdown-preview pre {
      overflow: auto;
      background: var(--surface-2);
      border-radius: 8px;
      padding: 12px;
    }
    .markdown-preview code {
      background: var(--surface-2);
      border-radius: 5px;
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .rule-summary {
      display: grid;
      gap: 8px;
      margin: 0;
      padding-left: 18px;
    }

    @media (max-width: 1120px) {
      header { grid-template-columns: 1fr; }
      .actions { justify-content: flex-start; }
      .grid, .preview-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 680px) {
      main { width: min(100% - 24px, 1480px); padding-top: 16px; }
      .actions { display: grid; grid-template-columns: 1fr; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Plan Artifact Renderer</h1>
        <p>一个轻量 HTML + Markdown 渲染器。规则写在 Markdown 里；HTML 给人 review，Markdown 给 agent 执行。</p>
      </div>
      <div class="actions">
        <button id="copyRule">复制规则</button>
        <button class="primary" id="copyPlanPrompt">复制 plan 生成指令</button>
        <button id="loadDemo">载入 ingest demo</button>
        <button id="reset">重置</button>
      </div>
    </header>

    <section class="grid">
      <div class="stack">
        <article class="panel">
          <h2>Pipeline 规则</h2>
          <p class="hint">真相源：<a href="${rulePath}">${rulePath}</a></p>
          <ul class="rule-summary">
            <li>先根据需求和项目规则生成 HTML + Markdown plan。</li>
            <li>人类只 review HTML；有问题就要求同步修改 HTML 和 Markdown。</li>
            <li>HTML 没问题后，把对应 Markdown 交给 agent 执行。</li>
          </ul>
        </article>

        <article class="panel">
          <h2>需求 Prompt</h2>
          <textarea id="requirementInput" placeholder="写你的需求、背景和约束。例如：我要优化当前 ingest 模块，需要先生成一个能 review 的 HTML plan 和对应 markdown。"></textarea>
        </article>

        <article class="panel">
          <h2>规则 Markdown</h2>
          <div id="ruleView" class="markdown-preview"></div>
        </article>
      </div>

      <div class="stack">
        <article class="panel">
          <h2>粘贴 / 编辑 artifact</h2>
          <div class="preview-grid">
            <div>
              <h3>plan-review.html</h3>
              <textarea id="htmlInput" placeholder="把 agent 生成的 plan-review.html 粘贴到这里。"></textarea>
            </div>
            <div>
              <h3>plan-review.md</h3>
              <textarea id="markdownInput" placeholder="把 agent 生成的 plan-review.md 粘贴到这里。"></textarea>
            </div>
          </div>
          <p class="hint">修改 HTML 时，要同步修改 Markdown；修改 Markdown 时，也要确认 HTML 仍然表达同一份 plan。</p>
          <div class="actions">
            <button id="copyMarkdown">复制 Markdown 给 agent 执行</button>
            <button id="copyExecutionPrompt">复制执行 prompt</button>
          </div>
        </article>

        <article class="panel">
          <h2>渲染预览</h2>
          <div class="preview-grid">
            <div>
              <h3>HTML 给人看</h3>
              <iframe id="htmlPreview" title="HTML plan preview" sandbox=""></iframe>
            </div>
            <div>
              <h3>Markdown 给 agent 看</h3>
              <div id="markdownPreview" class="markdown-preview"></div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>

  <script id="renderer-data" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("renderer-data").textContent);
    const $ = (selector) => document.querySelector(selector);

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function inlineMarkdown(value) {
      return escapeHtml(value)
        .replace(/\\\`([^\\\`]+)\\\`/g, "<code>$1</code>")
        .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
    }

    function renderMarkdown(markdown) {
      const lines = String(markdown || "").split("\\n");
      const html = [];
      let listTag = "";
      let inCode = false;
      let codeLines = [];

      function closeList() {
        if (listTag) {
          html.push("</" + listTag + ">");
          listTag = "";
        }
      }

      function closeCode() {
        if (inCode) {
          html.push("<pre><code>" + escapeHtml(codeLines.join("\\n")) + "</code></pre>");
          codeLines = [];
          inCode = false;
        }
      }

      for (const line of lines) {
        if (line.startsWith("~~~") || line.startsWith(String.fromCharCode(96, 96, 96))) {
          if (inCode) {
            closeCode();
          } else {
            closeList();
            inCode = true;
            codeLines = [];
          }
          continue;
        }

        if (inCode) {
          codeLines.push(line);
          continue;
        }

        if (/^###\\s+/.test(line)) {
          closeList();
          html.push("<h3>" + inlineMarkdown(line.replace(/^###\\s+/, "")) + "</h3>");
          continue;
        }

        if (/^##\\s+/.test(line)) {
          closeList();
          html.push("<h2>" + inlineMarkdown(line.replace(/^##\\s+/, "")) + "</h2>");
          continue;
        }

        if (/^#\\s+/.test(line)) {
          closeList();
          html.push("<h1>" + inlineMarkdown(line.replace(/^#\\s+/, "")) + "</h1>");
          continue;
        }

        if (/^\\s*[-*]\\s+/.test(line)) {
          if (listTag !== "ul") {
            closeList();
            html.push("<ul>");
            listTag = "ul";
          }
          html.push("<li>" + inlineMarkdown(line.replace(/^\\s*[-*]\\s+/, "")) + "</li>");
          continue;
        }

        if (/^\\s*\\d+\\.\\s+/.test(line)) {
          if (listTag !== "ol") {
            closeList();
            html.push("<ol>");
            listTag = "ol";
          }
          html.push("<li>" + inlineMarkdown(line.replace(/^\\s*\\d+\\.\\s+/, "")) + "</li>");
          continue;
        }

        if (!line.trim()) {
          closeList();
          continue;
        }

        closeList();
        html.push("<p>" + inlineMarkdown(line) + "</p>");
      }

      closeCode();
      closeList();
      return html.join("\\n") || "<p class=\\"hint\\">还没有 Markdown artifact。</p>";
    }

    function ingestDemoHtml() {
      return [
        "<!doctype html>",
        "<html lang=\\"zh-CN\\">",
        "<meta charset=\\"utf-8\\">",
        "<title>Plan Review · 优化 ingest 模块</title>",
        "<style>",
        "body{font:15px/1.6 system-ui;margin:0;background:#f7f8f5;color:#202421}",
        "main{max-width:1100px;margin:auto;padding:24px}",
        "section{border:1px solid #dbe2d7;border-radius:10px;background:#fffefb;padding:14px;margin:12px 0}",
        ".grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
        ".flow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}",
        ".step{border:1px solid #dbe2d7;border-radius:8px;background:#fbfdf9;padding:10px}",
        "table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #dbe2d7;padding:8px;text-align:left;vertical-align:top}",
        "code{background:#eef3ea;border-radius:5px;padding:2px 5px}",
        "@media(max-width:860px){.grid,.flow{grid-template-columns:1fr}}",
        "</style>",
        "<main>",
        "<h1>Plan Review：优化当前 ingest 模块</h1>",
        "<p>目标：在 ingest 生成 Raw 前后加入结构化校验和可审阅报告，保持 ingest 只动 Raw/ 和 log.md。</p>",
        "<section><h2>1. 当前 ingest 如何实现</h2><div class=\\"flow\\">",
        "<div class=\\"step\\"><b>输入</b><br>用户给 arxiv / PDF / 笔记。</div>",
        "<div class=\\"step\\"><b>读规则</b><br>读取 schema.md、log.md、existing Raw。</div>",
        "<div class=\\"step\\"><b>查重</b><br>检查 arxiv id / 同题论文。</div>",
        "<div class=\\"step\\"><b>写入</b><br>生成 Raw/&lt;id&gt;.md，必要时保存 PDF。</div>",
        "<div class=\\"step\\"><b>记录</b><br>追加 log.md，不修改 Wiki/。</div>",
        "</div></section>",
        "<section><h2>2. 需要优化的问题</h2><div class=\\"grid\\">",
        "<p>规则靠 agent 记忆，缺 section、tag 越界、Related Wiki 缺失可能晚发现。</p>",
        "<p>用户缺少 review 摘要，不知道该优先检查 benchmark、tag、PDF 还是结构。</p>",
        "</div></section>",
        "<section><h2>3. 优化模块</h2><table><tr><th>模块</th><th>职责</th><th>例子</th></tr>",
        "<tr><td>Preflight</td><td>写 Raw 前检查 ID、重复论文、候选 tags。</td><td>paper-id 已存在时阻断。</td></tr>",
        "<tr><td>Template Guard</td><td>检查 5-section 和理解型元素。</td><td>缺 What would break this 给 warning。</td></tr>",
        "<tr><td>Tag Guard</td><td>对齐 schema.md 受控标签。</td><td>#entropy-guided 建议映射到 #entropy。</td></tr>",
        "<tr><td>Review Report</td><td>生成给人看的风险摘要。</td><td>提示 benchmark 数字是否已核 PDF。</td></tr>",
        "</table></section>",
        "<section><h2>4. 验收方式</h2><ul><li>缺 Tags 能报错。</li><li>越界 tag 能提示 approved tag。</li><li>历史 Raw 只报告兼容问题，不自动 retrofit。</li><li>确认 ingest 仍只动 Raw/ 和 log.md。</li></ul></section>",
        "</main>",
        "</html>",
      ].join("\\n");
    }

    function ingestDemoMarkdown() {
      return [
        "# Plan Review：优化当前 ingest 模块",
        "",
        "## 需求摘要",
        "在生成 Raw 前后加入结构化校验和可审阅报告，确保 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录稳定；保持 ingest 只动 Raw/ 和 log.md，不触碰 Wiki/。",
        "",
        "## 必读文件",
        "- AGENTS.md",
        "- schema.md",
        "- log.md 顶部",
        "- Raw/2510-igpo.md 或 Raw/2601-at2po.md",
        "",
        "## 现有流程",
        "- 用户输入 arxiv / PDF / 笔记。",
        "- Agent 读取 schema.md、log.md、existing Raw。",
        "- Agent 查重，生成 Raw/<id>.md，必要时保存 PDF。",
        "- Agent 追加 log.md，不修改 Wiki/。",
        "",
        "## 执行计划",
        "- 设计最小 ingest lint / review report 规则。",
        "- 增加 Preflight：检查 ID、重复论文、候选 tags。",
        "- 增加 Template Guard：检查 5-section 和理解型元素。",
        "- 增加 Tag Guard：从 schema.md 解析 approved tags。",
        "- 生成 Review Report：列出需要人工确认的数字、PDF、benchmark、tag。",
        "- 更新文档和 log.md。",
        "",
        "## 具体例子",
        "~~~text",
        "Raw/2605-demo.md",
        "- 缺 Tags -> 报错：Missing required metadata: Tags",
        "- 含 #entropy-guided -> 报错：Tag not approved; consider #entropy",
        "- 缺 What would break this -> 警告：Method section lacks break-condition check",
        "~~~",
        "",
        "## 验收",
        "- 构造缺 Tags 的 Raw，lint 能报错。",
        "- 构造越界 tag，lint 能指出 approved tag。",
        "- 对现有 Raw 跑检查，只报告历史兼容问题，不自动 retrofit。",
        "- 确认 ingest 仍只动 Raw/ 和 log.md，不改 Wiki/。",
      ].join("\\n");
    }

    function planGenerationPrompt() {
      return [
        data.ruleMarkdown,
        "",
        "现在请根据下面的用户需求进入 plan 模式。",
        "",
        "用户需求：",
        $("#requirementInput").value.trim() || "[在这里写需求]",
        "",
        "请先读取项目规则和相关文件，再只输出两个 fenced code blocks：",
        "~~~html",
        "<!-- plan-review.html -->",
        "~~~",
        "~~~markdown",
        "<!-- plan-review.md -->",
        "~~~",
      ].join("\\n");
    }

    function executionPrompt() {
      return [
        "请根据下面已经通过人类 review 的 markdown plan 执行。",
        "",
        "注意：HTML 只用于理解，不要只改 HTML；执行以 Markdown 为准。",
        "",
        "## Markdown Plan",
        $("#markdownInput").value.trim() || "[还没有 markdown plan]",
      ].join("\\n");
    }

    async function copyText(text, button) {
      let ok = false;
      if (navigator.clipboard?.writeText) {
        ok = await navigator.clipboard.writeText(text).then(() => true, () => false);
      }
      if (!ok) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      }
      const old = button.textContent;
      button.textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => button.textContent = old, 900);
    }

    function render() {
      $("#ruleView").innerHTML = renderMarkdown(data.ruleMarkdown);
      $("#htmlPreview").srcdoc = $("#htmlInput").value.trim() || "<!doctype html><meta charset=\\"utf-8\\"><body style=\\"font:16px system-ui;padding:24px;color:#626a64\\">还没有 HTML artifact。</body>";
      $("#markdownPreview").innerHTML = renderMarkdown($("#markdownInput").value);
    }

    $("#copyRule").addEventListener("click", (event) => copyText(data.ruleMarkdown, event.currentTarget));
    $("#copyPlanPrompt").addEventListener("click", (event) => copyText(planGenerationPrompt(), event.currentTarget));
    $("#copyMarkdown").addEventListener("click", (event) => copyText($("#markdownInput").value.trim(), event.currentTarget));
    $("#copyExecutionPrompt").addEventListener("click", (event) => copyText(executionPrompt(), event.currentTarget));
    $("#loadDemo").addEventListener("click", () => {
      $("#requirementInput").value = "优化当前 ingest 模块：在生成 Raw 前后加入结构化校验和可审阅报告，确保 ID、受控 Tags、5-section、理解型元素、Related Wiki 和 log 记录都稳定；保持 ingest 只动 Raw/ 和 log.md，不触碰 Wiki/。";
      $("#htmlInput").value = ingestDemoHtml();
      $("#markdownInput").value = ingestDemoMarkdown();
      render();
    });
    $("#reset").addEventListener("click", () => {
      $("#requirementInput").value = "";
      $("#htmlInput").value = "";
      $("#markdownInput").value = "";
      render();
    });

    ["input", "change"].forEach((eventName) => {
      $("#requirementInput").addEventListener(eventName, render);
      $("#htmlInput").addEventListener(eventName, render);
      $("#markdownInput").addEventListener(eventName, render);
    });

    render();
  </script>
</body>
</html>`;
}

async function main() {
  const ruleMarkdown = await safeRead(rulePath);
  await fs.writeFile(outputPath, buildHtml({ ruleMarkdown }), "utf8");
  console.log(`Generated ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
