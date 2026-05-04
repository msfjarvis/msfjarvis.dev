# RSS Feed Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@astrojs/rss` with hand-rolled XML generation across three feed endpoints, preserving existing lightbox HTML cleanup and weeknote cutoff-date URL rewriting.

**Architecture:** All RSS generation logic lives in `src/lib/feed.ts`. It exposes `buildFeed` (raw XML → Response), `buildCollectionFeed` (single collection), and `buildMultiCollectionFeed` (multiple collections). The three page files become thin callers that fetch, filter, and pass entries in. Private helpers handle MDX rendering, lightbox cleanup, and URL absolutisation.

**Tech Stack:** Astro 6, TypeScript, `cheerio` (DOM cleanup), `@astrojs/mdx` (rendering), npm

**Spec:** `docs/superpowers/specs/2026-05-04-rss-feed-migration-design.md`

---

### Task 1: Rewrite `src/lib/feed.ts`

**Files:**
- Modify: `src/lib/feed.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Write `src/lib/feed.ts` with the following complete content:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import mdxRenderer from '@astrojs/mdx/server.js';
import { render } from 'astro:content';
import { load } from 'cheerio';
import type { APIContext } from 'astro';

// --- Types ---

/** Normalised item shape for all feeds. */
export interface FeedItem {
  title: string;
  url: string;
  date: Date;
  guid?: string;    // defaults to url
  html?: string;    // → <content:encoded>
  summary?: string; // → <description>
}

/** One collection's contribution to a multi-collection feed. */
export interface FeedSource {
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
}

// --- Helpers ---

/** Escape a string for safe embedding in XML text or attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert root-relative URLs in src/href attributes to absolute URLs for RSS */
function absolutizeUrls(html: string, origin: string): string {
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);
}

/**
 * Create an AstroContainer with the MDX renderer for server-side rendering.
 *
 * The Cloudflare adapter prerenders in workerd where `import.meta.url` is not a
 * valid URL, which causes `AstroContainer.create()` → `createManifest()` →
 * `new URL(import.meta.url)` to throw. We temporarily patch the global URL
 * constructor so invalid URLs fall back to `file://<cwd>/` (only used for the
 * container's internal `rootDir`, which isn't relevant for `renderToString`).
 */
async function createContainer() {
  const OrigURL = globalThis.URL;
  const SafeURL = class extends OrigURL {
    constructor(url: string | URL, base?: string | URL) {
      try {
        super(url, base);
      } catch {
        super('file:///tmp/astro-container/');
      }
    }
  };
  globalThis.URL = SafeURL as typeof URL;
  try {
    const container = await AstroContainer.create();
    container.addServerRenderer({ renderer: mdxRenderer });
    return container;
  } finally {
    globalThis.URL = OrigURL;
  }
}

/** Remove duplicate images from lightbox components for RSS feeds */
function removeLightboxDuplicates(html: string): string {
  const $ = load(html);

  // For each figure with lightbox, keep only the image/picture and remove button/container
  $('[data-image-lightbox]').each((_, figure) => {
    const $figure = $(figure);

    // Get the actual picture/img from inside the button
    const $button = $figure.find('[data-lightbox-trigger]');
    if ($button.length > 0) {
      const imageHtml = $button.html();
      if (!imageHtml) {
        throw Error('Failed to find lightbox trigger in page, has the layout changed?');
      }
      $button.replaceWith(imageHtml);
    }
  });

  // Remove all lightbox containers
  $('[data-lightbox-container]').remove();

  // Remove all script tags (not needed for RSS, and lightbox scripts shouldn't be there)
  $('script').remove();

  return $.html();
}

/** Render a single entry to absolute-URL HTML via the container */
async function renderEntryHtml(
  container: Awaited<ReturnType<typeof createContainer>>,
  entry: any,
  origin: string,
): Promise<string> {
  const { Content } = await render(entry);
  let html = await container.renderToString(Content);
  html = removeLightboxDuplicates(html);
  return absolutizeUrls(html, origin);
}

/** Convert a rendered collection entry into a FeedItem. */
async function entryToFeedItem(
  container: Awaited<ReturnType<typeof createContainer>>,
  entry: any,
  url: string,
  origin: string,
): Promise<FeedItem> {
  const html = await renderEntryHtml(container, entry, origin);
  return {
    title: entry.data.title,
    url,
    date: new Date(entry.data.date),
    summary: entry.data.summary || undefined,
    html,
  };
}

// --- Core builder ---

/**
 * Build an RSS 2.0 feed from a pre-normalised list of FeedItems.
 * Adds xmlns:content only when items need it.
 */
export function buildFeed(opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}): Response {
  const { title, description, selfPath, items } = opts;
  const site = opts.context.site!;

  const needsContent = items.some((i) => i.html);

  const ns = [
    needsContent ? 'xmlns:content="http://purl.org/rss/1.0/modules/content/"' : '',
    'xmlns:atom="http://www.w3.org/2005/Atom"',
  ]
    .filter(Boolean)
    .join(' ');

  const xmlItems = items.map((item) => {
    const guid = item.guid || item.url;
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.url}</link>
      <guid>${guid}</guid>
      ${item.summary ? `<description>${escapeXml(item.summary)}</description>` : ''}
      <pubDate>${item.date.toUTCString()}</pubDate>
      ${item.html ? `<content:encoded><![CDATA[${item.html}]]></content:encoded>` : ''}
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>
<rss version="2.0" ${ns}>
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${site.href}</link>
    <atom:link href="${site.origin}${selfPath}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-us</language>
${xmlItems.join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

// --- Collection feed builders ---

/** High-level helper for single-collection feeds (notes, weeknotes). */
export async function buildCollectionFeed(opts: {
  context: APIContext;
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
  title: string;
  description: string;
  selfPath: string;
}): Promise<Response> {
  const site = opts.context.site!;
  const container = await createContainer();
  const sorted = [...opts.entries].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const items = await Promise.all(
    sorted.map((entry) => {
      const url = opts.urlBuilder(entry, site.origin);
      return entryToFeedItem(container, entry, url, site.origin);
    }),
  );

  return buildFeed({
    context: opts.context,
    title: opts.title,
    description: opts.description,
    selfPath: opts.selfPath,
    items,
  });
}

/**
 * High-level helper for multi-collection feeds that combine entries from
 * multiple collections (e.g. the site-wide /rss.xml combining posts + weeknotes).
 */
export async function buildMultiCollectionFeed(opts: {
  context: APIContext;
  sources: FeedSource[];
  title: string;
  description: string;
  selfPath: string;
}): Promise<Response> {
  const site = opts.context.site!;
  const container = await createContainer();

  const allEntries = opts.sources.flatMap((source) =>
    source.entries.map((entry) => ({ entry, source })),
  );
  const sorted = allEntries.sort(
    (a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime(),
  );

  const items = await Promise.all(
    sorted.map(({ entry, source }) => {
      const url = source.urlBuilder(entry, site.origin);
      return entryToFeedItem(container, entry, url, site.origin);
    }),
  );

  return buildFeed({
    context: opts.context,
    title: opts.title,
    description: opts.description,
    selfPath: opts.selfPath,
    items,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/feed.ts
git commit -m "refactor(feed): replace @astrojs/rss helpers with hand-rolled buildFeed"
```

---

### Task 2: Rewrite `src/pages/rss.xml.ts`

**Files:**
- Modify: `src/pages/rss.xml.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Write `src/pages/rss.xml.ts` with the following complete content:

```ts
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { filterDrafts } from '../utils';
import { buildMultiCollectionFeed } from '../lib/feed';
import type { FeedSource } from '../lib/feed';

export const prerender = true;

const cutoffDate = new Date('2026-05-01');

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', filterDrafts);
  const weeknotes = await getCollection('weeknotes', filterDrafts);

  const sources: FeedSource[] = [
    {
      entries: posts,
      urlBuilder: (entry, origin) => `${origin}/posts/${entry.id}/`,
    },
    {
      entries: weeknotes,
      urlBuilder: (entry, origin) =>
        entry.data.date < cutoffDate
          ? `${origin}/posts/weeknotes-${entry.id}/`
          : `${origin}/weeknotes/${entry.id}/`,
    },
  ];

  return buildMultiCollectionFeed({
    context,
    sources,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    selfPath: '/rss.xml',
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/rss.xml.ts
git commit -m "refactor(feed): migrate main rss.xml to hand-rolled buildMultiCollectionFeed"
```

---

### Task 3: Rewrite `src/pages/notes/rss.xml.ts`

**Files:**
- Modify: `src/pages/notes/rss.xml.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Write `src/pages/notes/rss.xml.ts` with the following complete content:

```ts
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { filterDrafts } from '../../utils';
import { buildCollectionFeed } from '../../lib/feed';

export const prerender = true;

export async function GET(context: APIContext) {
  const notes = await getCollection('notes', filterDrafts);

  return buildCollectionFeed({
    context,
    entries: notes,
    urlBuilder: (entry, origin) => `${origin}/notes/${entry.id}/`,
    title: `Notes — ${SITE_TITLE}`,
    description: 'Short notes by Harsh Shandilya',
    selfPath: '/notes/rss.xml',
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/notes/rss.xml.ts
git commit -m "refactor(feed): migrate notes rss.xml to hand-rolled buildCollectionFeed"
```

---

### Task 4: Rewrite `src/pages/weeknotes/rss.xml.ts`

**Files:**
- Modify: `src/pages/weeknotes/rss.xml.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Write `src/pages/weeknotes/rss.xml.ts` with the following complete content:

```ts
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { filterDrafts } from '../../utils';
import { buildCollectionFeed } from '../../lib/feed';

export const prerender = true;

export async function GET(context: APIContext) {
  const weeknotes = await getCollection('weeknotes', filterDrafts);

  return buildCollectionFeed({
    context,
    entries: weeknotes,
    urlBuilder: (entry, origin) => `${origin}/weeknotes/${entry.id}/`,
    title: `Weeknotes — ${SITE_TITLE}`,
    description: 'Weekly notes by Harsh Shandilya',
    selfPath: '/weeknotes/rss.xml',
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/weeknotes/rss.xml.ts
git commit -m "refactor(feed): migrate weeknotes rss.xml to hand-rolled buildCollectionFeed"
```

---

### Task 5: Remove `@astrojs/rss` dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (via npm install)

- [ ] **Step 1: Remove the package from `package.json`**

In `package.json`, delete the line:
```json
"@astrojs/rss": "^4.0.18",
```

- [ ] **Step 2: Update the lockfile**

```bash
npm install
```

Expected: lockfile regenerates without `@astrojs/rss` entries. No other errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove @astrojs/rss dependency"
```

---

### Task 6: Verify TypeScript and build

**Files:** none modified — verification only

- [ ] **Step 1: TypeScript check**

```bash
npm run astro check
```

Expected: zero errors. If there are import errors referencing `@astrojs/rss`, they indicate a missed import in one of the page files — fix the specific file.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds and produces `dist/rss.xml`, `dist/notes/rss.xml`, `dist/weeknotes/rss.xml`.

- [ ] **Step 3: Inspect main feed**

```bash
head -30 dist/rss.xml
```

Expected output starts with:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>msfjarvis.dev</title>
```

Also confirm `<atom:link>` and `<content:encoded>` are present:
```bash
grep -c 'content:encoded' dist/rss.xml
grep 'atom:link' dist/rss.xml
```

Expected: `content:encoded` count > 0 (one per item), one `atom:link` line with `href="https://msfjarvis.dev/rss.xml"`.

- [ ] **Step 4: Spot-check cutoff date URL rewriting**

```bash
grep 'weeknotes' dist/rss.xml | grep '<link>' | head -10
```

Expected: weeknotes published before 2026-05-01 appear as `/posts/weeknotes-<id>/`; those on or after as `/weeknotes/<id>/`.

- [ ] **Step 5: Commit**

No code changes in this task — if build passed cleanly, no commit needed. If fixes were required, commit them with:

```bash
git add <fixed files>
git commit -m "fix(feed): <describe what was wrong>"
```
