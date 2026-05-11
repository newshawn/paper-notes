#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const [, , htmlArg, markdownArg] = process.argv;

const REQUIRED_HTML_SECTIONS = [
  ["Review Verdict", ["review verdict", "建议继续", "需要补证据", "不建议执行"]],
  ["Workspace State", ["当前工作区状态", "workspace state"]],
  ["Evidence-backed Claims", ["evidence-backed claims", "证据来源"]],
  ["Current Flow", ["当前流程", "当前数据流", "current flow"]],
  ["Target Flow", ["目标流程", "目标数据流", "target flow"]],
  ["Change Scope", ["change scope", "will change", "must not change"]],
  ["Before/After Comparison", ["改动前后对比", "before", "after"]],
  ["End-to-End Demos", ["end-to-end demos", "具体 demo", "success path"]],
  ["Human Decisions", ["human decisions", "需要用户", "拍板"]],
  ["Acceptance Checklist", ["acceptance checklist", "验收"]],
  ["Execution Handoff", ["execution handoff", "执行交接"]],
];

const REQUIRED_MARKDOWN_SECTIONS = [
  ["Execution Gate", ["execution gate", "verdict approved", "blocking decisions resolved", "执行门槛"]],
  ["Files to Read", ["必读文件", "read", "实际读取"]],
  ["Change Scope", ["change scope", "will change", "must not change", "不能碰"]],
  ["Execution Steps", ["执行步骤", "steps"]],
  ["Validation", ["验证", "验收", "test", "lint"]],
  ["Post-Execution Handoff", ["post-execution", "执行后回填", "实际改动"]],
];

const HTML_DETAIL_CHECKS = [
  ["will change", ["will change", "会修改", "会新增"]],
  ["might change", ["might change", "可能修改"]],
  ["must not change", ["must not change", "不得修改", "不能碰"]],
  ["human decision recommendations", ["推荐", "建议答案", "default"]],
  ["success path", ["success path", "成功路径"]],
  ["blocked path", ["blocked path", "阻断路径", "blocking"]],
  ["warning path", ["warning path", "warning", "警告路径"]],
];

const MARKDOWN_DETAIL_CHECKS = [
  ["HTML approval gate", ["html verdict approved", "html 通过", "review 通过"]],
  ["blocking decisions gate", ["blocking decisions resolved", "blocking decision", "阻断决策"]],
  ["actual changed files handoff", ["实际改了哪些文件", "changed files", "实际改动"]],
  ["plan deviation handoff", ["偏离", "deviation"]],
  ["project map maintenance", ["dev/project-map.md", "项目地图"]],
];

function usage() {
  console.error("Usage: node scripts/check-plan-artifact.mjs <plan-review.html> <plan-review.md>");
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function runChecks(label, text, checks, severity) {
  return checks.flatMap(([name, terms]) => {
    if (hasAny(text, terms)) return [];
    return [{ label, name, severity, terms }];
  });
}

async function readArtifact(filePath) {
  const resolved = path.resolve(filePath);
  const content = await fs.readFile(resolved, "utf8");
  return { resolved, content };
}

if (!htmlArg || !markdownArg) {
  usage();
  process.exit(2);
}

let html;
let markdown;

try {
  html = await readArtifact(htmlArg);
  markdown = await readArtifact(markdownArg);
} catch (error) {
  console.error(`Could not read artifact: ${error.message}`);
  process.exit(2);
}

const htmlText = normalize(stripHtml(html.content));
const markdownText = normalize(markdown.content);

const failures = [
  ...runChecks("HTML", htmlText, REQUIRED_HTML_SECTIONS, "error"),
  ...runChecks("Markdown", markdownText, REQUIRED_MARKDOWN_SECTIONS, "error"),
  ...runChecks("HTML", htmlText, HTML_DETAIL_CHECKS, "warning"),
  ...runChecks("Markdown", markdownText, MARKDOWN_DETAIL_CHECKS, "warning"),
];

const errors = failures.filter((failure) => failure.severity === "error");
const warnings = failures.filter((failure) => failure.severity === "warning");

console.log("Plan artifact check");
console.log(`HTML: ${html.resolved}`);
console.log(`Markdown: ${markdown.resolved}`);

if (!failures.length) {
  console.log("OK: artifact contains the required review and execution structure.");
  process.exit(0);
}

for (const failure of failures) {
  const prefix = failure.severity === "error" ? "ERROR" : "WARN";
  console.log(`${prefix}: ${failure.label} is missing ${failure.name}`);
  console.log(`      expected one of: ${failure.terms.join(" / ")}`);
}

if (errors.length) {
  console.log(`FAILED: ${errors.length} required check(s) missing, ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`PASSED WITH WARNINGS: ${warnings.length} optional quality check(s) missing.`);
