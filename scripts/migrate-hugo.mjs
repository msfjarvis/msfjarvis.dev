#!/usr/bin/env node
/**
 * Migrates Hugo content to Astro content collections.
 *
 * Usage: node scripts/migrate-hugo.mjs <path-to-hugo-root>
 *
 * What it does:
 *   - content/posts/<slug>/       → weeknotes or posts (detected by slug pattern)
 *   - content/notes/<slug>.md     → src/content/notes/
 *   - Post images                 → public/<collection>/<slug>/
 *   - TOML frontmatter            → YAML frontmatter
 *   - Hugo shortcodes             → MDX components / plain HTML
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import toml from '@iarna/toml';
import yaml from 'js-yaml';
import fse from 'fs-extra';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

/** Directory name pattern for weeknotes in the Hugo posts folder. */
const WEEKNOTE_DIR_RE = /^weeknotes-week-(\d+)-(\d{4})$/;

/** Image extensions to copy alongside content. */
const IMAGE_EXTS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.avif']);

/** MDX component import lines keyed by component name. */
const MDX_IMPORTS = {
  Figure: "import Figure from '../../components/Figure.astro';",
  Asciinema: "import Asciinema from '../../components/Asciinema.astro';",
};

// ---------------------------------------------------------------------------
// Frontmatter parsing (Hugo TOML  +++  delimiters)
// ---------------------------------------------------------------------------

/**
 * Parse Hugo's TOML frontmatter delimited by `+++`.
 * Returns { data, body } where data is a plain object and body is the content string.
 */
function parseHugoFile(raw) {
  // Match opening +++, TOML content, closing +++, then rest of file
  const match = raw.match(/^\+\+\+\r?\n([\s\S]+?)\r?\n\+\+\+\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('File does not have TOML frontmatter delimited by +++');
  }
  const data = toml.parse(match[1]);
  const body = match[2].trimStart();
  return { data, body };
}

// ---------------------------------------------------------------------------
// Frontmatter serialisation (Astro YAML  ---  delimiters)
// ---------------------------------------------------------------------------

/**
 * Build the Astro YAML frontmatter block from Hugo parsed data.
 * Only includes fields the Astro schema cares about; drops Hugo-specific ones.
 */
function buildFrontmatter(data, schemaType) {
  const out = {};

  // title — required
  if (data.title) out.title = String(data.title);

  // date — required; TOML gives us a Date object
  if (data.date) {
    out.date = data.date instanceof Date
      ? data.date.toISOString()
      : String(data.date);
  }

  // lastmod — optional; skip if identical to date
  if (data.lastmod) {
    const lm = data.lastmod instanceof Date
      ? data.lastmod.toISOString()
      : String(data.lastmod);
    if (lm !== out.date) out.lastmod = lm;
  }

  // summary — from Hugo's summary or description field
  const summary = data.summary || data.description;
  if (summary) out.summary = String(summary);

  // tags — skip empty arrays
  if (Array.isArray(data.tags) && data.tags.length > 0) {
    out.tags = data.tags;
  }

  // aliases — Hugo paths that should 301 → this page.
  // Normalise each to have a leading slash (Hugo allows relative aliases).
  if (Array.isArray(data.aliases) && data.aliases.length > 0) {
    out.aliases = data.aliases.map(a => '/' + String(a).replace(/^\//, ''));
  }

  // draft / deleted — only write when true to keep frontmatter clean
  if (schemaType !== 'note') {
    if (data.draft === true) out.draft = true;
  }
  if (data.deleted === true) out.deleted = true;

  return `---\n${yaml.dump(out, { lineWidth: -1 }).trimEnd()}\n---`;
}

// ---------------------------------------------------------------------------
// Shortcode transformation
// ---------------------------------------------------------------------------

/**
 * Parse named attributes from a Hugo shortcode attribute string.
 * Handles: key="value", key='value' (with backslash escapes).
 */
function parseShortcodeAttrs(attrStr) {
  const attrs = {};
  // Match key="..." or key='...' with backslash-escaped quotes inside
  const re = /(\w+)=(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    const value = (m[2] ?? m[3]).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    attrs[m[1]] = value;
  }
  return attrs;
}

/**
 * Transform Hugo shortcodes in a content body.
 *
 * @param {string} body - Raw markdown body from Hugo
 * @param {string} slug - The output slug, used to build absolute image paths
 * @param {string} collection - 'posts' | 'weeknotes' | 'notes'
 * @returns {{ body: string, usedComponents: Set<string> }}
 */
function transformContent(body, slug, collection) {
  const usedComponents = new Set();

  // ---- details shortcode → native HTML <details> ----
  // {{<details summary="text" >}} ... {{</details>}}
  body = body.replace(/\{\{<\s*details\s+summary="([^"]+)"\s*>\}\}/g, (_, summary) => {
    return `<details>\n<summary>${summary}</summary>`;
  });
  body = body.replace(/\{\{<\/details>\}\}/g, '</details>');

  // ---- gfycat: defunct service, remove ----
  body = body.replace(/\{\{<\s*gfycat\s+\S+\s*>\}\}/g, '');

  // ---- horizontal_line → <hr /> ----
  body = body.replace(/\{\{<\s*horizontal_line\s*>\}\}/g, '<hr />');

  // ---- sub "text" → <sub>text</sub> ----
  // {{< sub "..." >}} or {{<sub "..." >}}
  body = body.replace(/\{\{<\s*sub\s+"([^"]+)"\s*>\}\}/g, '<sub>$1</sub>');

  // ---- asciinema ID → <Asciinema id="ID" /> ----
  body = body.replace(/\{\{<\s*asciinema\s+(\S+)\s*>\}\}/g, (_, id) => {
    usedComponents.add('Asciinema');
    return `<Asciinema id="${id}" />`;
  });

  // ---- figure → <Figure ... /> ----
  // Hugo shortcode variants:
  //   {{< figure src="..." title="..." >}}
  //   {{<figure src="..." >}}          (no space after {{<)
  //   {{< figure src="..." loading="lazy" >}}  (extra attrs to ignore)
  body = body.replace(/\{\{<\s*figure\s+([^>]+?)\s*>\}\}/g, (_, attrStr) => {
    const attrs = parseShortcodeAttrs(attrStr);
    const src = attrs.src || '';
    const alt = attrs.alt || '';
    const title = attrs.title || '';

    // Convert relative src to absolute public path
    const publicSrc = src.startsWith('/')
      ? src
      : `/${collection}/${slug}/${src}`;

    // Escape double quotes in attribute values for JSX — without this,
    // alt text containing `"quoted words"` breaks the MDX parser.
    const esc = (s) => s.replace(/"/g, '&quot;');

    const parts = [`src="${esc(publicSrc)}"`];
    if (alt) parts.push(`alt="${esc(alt)}"`);
    if (title) parts.push(`title="${esc(title)}"`);

    usedComponents.add('Figure');
    return `<Figure ${parts.join(' ')} />`;
  });

  // ---- Absolutise relative Markdown image paths ----
  // In .mdx files Vite tries to import relative paths as modules, which fails
  // since images live in public/. In .md files a relative path works at
  // runtime (the page is served from /collection/slug/) but absolute paths
  // are safer for RSS and other non-page contexts.
  const imageExtRe = /\.(?:webp|jpe?g|png|gif|svg|avif)$/i;

  // Inline images: ![alt](relative.ext) or ![alt](relative.ext "title")
  body = body.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, target) => {
      const [rawSrc, ...titleParts] = target.split(/\s+(?=")/);
      const title = titleParts.join(' ');
      if (rawSrc.startsWith('/') || rawSrc.startsWith('http') || rawSrc.startsWith('#')) {
        return match; // already absolute or anchor
      }
      if (!imageExtRe.test(rawSrc)) return match; // not an image
      const absSrc = `/${collection}/${slug}/${rawSrc}`;
      return title ? `![${alt}](${absSrc} ${title})` : `![${alt}](${absSrc})`;
    }
  );

  // Reference-style image definitions: [ref]: relative.ext
  body = body.replace(
    /^(\[[^\]]+\]):\s*([^\s]+)(.*)/gm,
    (match, ref, target, rest) => {
      if (target.startsWith('/') || target.startsWith('http') || target.startsWith('#')) {
        return match;
      }
      if (!imageExtRe.test(target)) return match;
      return `${ref}: /${collection}/${slug}/${target}${rest}`;
    }
  );

  return { body, usedComponents };
}

/**
 * Escape prose content for MDX: replace bare `<>` (empty JSX fragments)
 * and any `<` not followed by a letter, `/`, `!`, or `?` (i.e. not a real tag)
 * with HTML entities so the MDX parser doesn't treat them as JSX.
 * Only called for files that will be written as `.mdx`.
 */
function escapeMdxProse(body) {
  // Convert HTML comments to JSX comments — <!-- --> is invalid in MDX
  body = body.replace(/<!--([\/\s\S]*?)-->/g, (_, content) => `{/*${content}*/}`);
  // Replace bare <> with HTML entities
  body = body.replace(/<>/g, '&lt;&gt;');
  // Replace < that isn't the start of a real tag (letter, /, !, ?) with &lt;
  // This catches things like "x < y", "n < 5", etc.
  body = body.replace(/<(?![a-zA-Z/!?])/g, '&lt;');
  return body;
}

/**
 * Build the MDX import block for components used in the file.
 */
function buildImports(usedComponents) {
  return [...usedComponents]
    .sort()
    .map(name => MDX_IMPORTS[name])
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

/**
 * Migrate a Hugo page bundle (directory with index.md) to an Astro content file.
 *
 * @param {string} srcDir        - Path to the Hugo page bundle directory
 * @param {string} slug          - Output slug (may differ from directory name for weeknotes)
 * @param {string} collection    - 'posts' | 'weeknotes'
 * @param {string} astroDestDir  - Destination src/content/<collection>/ directory
 * @param {string} publicDestDir - Destination public/<collection>/ directory
 */
function migratePageBundle(srcDir, slug, collection, astroDestDir, publicDestDir) {
  const indexPath = join(srcDir, 'index.md');
  if (!existsSync(indexPath)) {
    console.warn(`  ⚠ No index.md in ${srcDir} — skipping`);
    return;
  }

  const raw = readFileSync(indexPath, 'utf8');
  let data, body;
  try {
    ({ data, body } = parseHugoFile(raw));
  } catch (err) {
    console.warn(`  ⚠ ${srcDir}: ${err.message} — skipping`);
    return;
  }

  // Hugo's slug field overrides the directory name for the URL.
  // We must use it as the output filename so URLs stay correct.
  const outputSlug = data.slug ? String(data.slug) : slug;

  const { body: transformedBody, usedComponents } = transformContent(body, outputSlug, collection);

  const frontmatter = buildFrontmatter(data, collection);
  const needsMdx = usedComponents.size > 0;
  const processedBody = needsMdx ? escapeMdxProse(transformedBody) : transformedBody;
  const ext = needsMdx ? '.mdx' : '.md';

  let output = frontmatter + '\n';
  if (needsMdx) {
    output += '\n' + buildImports(usedComponents) + '\n\n' + processedBody;
  } else {
    output += '\n' + transformedBody;
  }

  const destFile = join(astroDestDir, outputSlug + ext);
  writeFileSync(destFile, output, 'utf8');
  console.log(`  ✓ ${collection}/${outputSlug}${ext}`);

  // Copy image assets to public/<collection>/<outputSlug>/
  const entries = readdirSync(srcDir);
  const images = entries.filter(f => {
    const fullPath = join(srcDir, f);
    return statSync(fullPath).isFile() && IMAGE_EXTS.has(extname(f).toLowerCase());
  });

  if (images.length > 0) {
    const publicSlugDir = join(publicDestDir, outputSlug);
    fse.ensureDirSync(publicSlugDir);
    for (const img of images) {
      copyFileSync(join(srcDir, img), join(publicSlugDir, img));
    }
    console.log(`    + ${images.length} image(s) → public/${collection}/${outputSlug}/`);
  }
}

/**
 * Migrate a flat Hugo note file to an Astro content file.
 */
function migrateNote(srcFile, slug, astroDestDir) {
  const raw = readFileSync(srcFile, 'utf8');
  let data, body;
  try {
    ({ data, body } = parseHugoFile(raw));
  } catch (err) {
    console.warn(`  ⚠ ${srcFile}: ${err.message} — skipping`);
    return;
  }

  const frontmatter = buildFrontmatter(data, 'note');
  const output = frontmatter + '\n\n' + body;

  const destFile = join(astroDestDir, slug + '.md');
  writeFileSync(destFile, output, 'utf8');
  console.log(`  ✓ notes/${slug}.md`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const hugoRoot = process.argv[2];
  if (!hugoRoot) {
    console.error('Usage: node scripts/migrate-hugo.mjs <path-to-hugo-root>');
    process.exit(1);
  }

  const hugoPostsDir = join(hugoRoot, 'content', 'posts');
  const hugoNotesDir = join(hugoRoot, 'content', 'notes');

  const astroPostsDir = join(PROJECT_ROOT, 'src', 'content', 'posts');
  const astroNotesDir = join(PROJECT_ROOT, 'src', 'content', 'notes');
  const astroWeeknotesDir = join(PROJECT_ROOT, 'src', 'content', 'weeknotes');

  const publicPostsDir = join(PROJECT_ROOT, 'public', 'posts');
  const publicWeeknotesDir = join(PROJECT_ROOT, 'public', 'weeknotes');

  for (const dir of [astroPostsDir, astroNotesDir, astroWeeknotesDir, publicPostsDir, publicWeeknotesDir]) {
    fse.ensureDirSync(dir);
  }

  // -------------------------------------------------------------------------
  // 1. Posts + weeknotes (Hugo keeps them together in content/posts/)
  //    Weeknotes are identified by slug pattern: weeknotes-week-N-YYYY
  //    They must be processed to the weeknotes collection with slug week-N-YYYY.
  // -------------------------------------------------------------------------
  console.log('\n── Posts & Weeknotes ──────────────────────────────────────────');

  const postDirs = readdirSync(hugoPostsDir)
    .filter(name => statSync(join(hugoPostsDir, name)).isDirectory())
    .sort(); // stable ordering

  let postCount = 0;
  let weeknoteCount = 0;

  for (const dirName of postDirs) {
    const weeknoteMatch = dirName.match(WEEKNOTE_DIR_RE);

    if (weeknoteMatch) {
      // Weeknote: weeknotes-week-N-YYYY → week-N-YYYY
      const newSlug = `week-${weeknoteMatch[1]}-${weeknoteMatch[2]}`;
      migratePageBundle(
        join(hugoPostsDir, dirName),
        newSlug,
        'weeknotes',
        astroWeeknotesDir,
        publicWeeknotesDir,
      );
      weeknoteCount++;
    } else {
      // Regular post
      migratePageBundle(
        join(hugoPostsDir, dirName),
        dirName,
        'posts',
        astroPostsDir,
        publicPostsDir,
      );
      postCount++;
    }
  }

  // -------------------------------------------------------------------------
  // 2. Notes (flat .md files in content/notes/, skip _index.md)
  // -------------------------------------------------------------------------
  console.log('\n── Notes ──────────────────────────────────────────────────────');

  const noteFiles = readdirSync(hugoNotesDir)
    .filter(name => {
      const fullPath = join(hugoNotesDir, name);
      return statSync(fullPath).isFile()
        && extname(name) === '.md'
        && basename(name) !== '_index.md';
    })
    .sort();

  let noteCount = 0;
  for (const fileName of noteFiles) {
    const slug = basename(fileName, '.md');
    migrateNote(join(hugoNotesDir, fileName), slug, astroNotesDir);
    noteCount++;
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`
── Done ───────────────────────────────────────────────────────
  Posts:      ${postCount}
  Weeknotes:  ${weeknoteCount}
  Notes:      ${noteCount}
  Total:      ${postCount + weeknoteCount + noteCount}
`);
}

main().catch(err => {
  console.error('\n✗ Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
