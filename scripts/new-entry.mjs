#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

const TYPE_TO_DIR = {
  posts: "posts",
  notes: "notes",
  weeknotes: "weeknotes",
};

function getIsoWeekParts(date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
  return { week, year: utcDate.getUTCFullYear() };
}

function deriveWeeknoteMetadata(now) {
  const { week, year } = getIsoWeekParts(now);
  return {
    title: `Weeknotes: Week #${week} (${year})`,
    slug: `week-${week}-${year}`,
  };
}

export function slugifyTitle(str) {
  return str
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFrontmatter({ title, now }) {
  const timestamp = now.toISOString();
  return `---\ntitle: ${JSON.stringify(title)}\ndate: ${JSON.stringify(timestamp)}\nlastmod: ${JSON.stringify(timestamp)}\nsummary: ""\ntags: []\ncategories: []\ndraft: true\ndeleted: false\n---\n`;
}

export function createEntry({ root = PROJECT_ROOT, type, title, now = new Date() }) {
  const collection = TYPE_TO_DIR[type];
  if (!collection) {
    throw new Error(`Invalid content type: ${type}`);
  }

  const resolved =
    type === "weeknotes"
      ? deriveWeeknoteMetadata(now)
      : title?.trim()
        ? { title: title.trim(), slug: slugifyTitle(title.trim()) }
        : null;

  if (!resolved) {
    throw new Error("A title is required");
  }

  const { title: resolvedTitle, slug } = resolved;
  const entryDir = path.join(root, "src", "content", collection, slug);
  const entryPath = path.join(entryDir, "index.mdx");

  if (existsSync(entryPath)) {
    throw new Error(`Entry already exists: ${entryPath}`);
  }

  mkdirSync(entryDir, { recursive: true });
  writeFileSync(entryPath, `${buildFrontmatter({ title: resolvedTitle, now })}\n`, "utf8");
  return entryPath;
}

function main() {
  const [, , type, ...titleParts] = process.argv;
  const title = titleParts.join(" ").trim();

  if (!type || (type !== "weeknotes" && !title)) {
    console.error("Usage: node scripts/new-entry.mjs <posts|notes> <title>");
    console.error("   or: node scripts/new-entry.mjs <weeknotes>");
    process.exit(1);
  }

  try {
    const entryPath = createEntry({ type, title });
    console.log(`✓ Created ${path.relative(PROJECT_ROOT, entryPath)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
