# Multi-Format Feeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Atom 1.0 and JSON Feed 1.1 alongside the existing RSS 2.0 feeds, using a `createFeedEndpoint` factory so each collection needs only one file to produce all three formats.

**Architecture:** Refactor `src/lib/feed.ts` to expose three named serializers (`rssSerializer`, `atomSerializer`, `jsonFeedSerializer`) and a `createFeedEndpoint(config)` factory that returns ready-to-export `{ getStaticPaths, GET }`. Each collection gets a single `[format].ts` page file; Astro resolves the `format` param (`rss.xml`, `atom.xml`, `feed.json`) to the correct URL. Feed discovery links live in `BaseHead.astro` (global) and section index pages (section-specific).

**Tech Stack:** Astro 6, TypeScript, MDX renderer via AstroContainer

---

## File Map

| Action  | Path                              | Responsibility                                    |
| ------- | --------------------------------- | ------------------------------------------------- |
| Rewrite | `src/lib/feed.ts`                 | All feed primitives, serializers, factory         |
| Delete  | `src/pages/rss.xml.ts`            | Replaced by `[format].ts`                         |
| Delete  | `src/pages/notes/rss.xml.ts`      | Replaced by `[format].ts`                         |
| Delete  | `src/pages/weeknotes/rss.xml.ts`  | Replaced by `[format].ts`                         |
| Create  | `src/pages/[format].ts`           | Main combined feed (posts + weeknotes)            |
| Create  | `src/pages/notes/[format].ts`     | Notes-only feed                                   |
| Create  | `src/pages/weeknotes/[format].ts` | Weeknotes-only feed                               |
| Modify  | `src/components/BaseHead.astro`   | Global feed `<link>` tags + `alternateFeeds` prop |
| Modify  | `src/layouts/BaseLayout.astro`    | Forward `alternateFeeds` to `BaseHead`            |
| Modify  | `src/pages/notes/index.astro`     | Pass notes feed links                             |
| Modify  | `src/pages/weeknotes/index.astro` | Pass weeknotes feed links                         |

---

## Task 1: Rewrite `src/lib/feed.ts`

**Files:**

- Rewrite: `src/lib/feed.ts`

- [ ] **Step 1: Replace the file with the new implementation**

Write `src/lib/feed.ts` with this complete content:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import mdxRenderer from "@astrojs/mdx/server.js";
import { render } from "astro:content";
import { load } from "cheerio";
import type { APIContext } from "astro";
import { AUTHOR_NAME, SITE_URL } from "../consts";

/** Maximum number of entries to include in any feed. */
const RSS_MAX_ENTRIES = 40;

// --- Types ---

/** Supported feed format param values (match the [format] page param). */
export type FeedFormat = "rss.xml" | "atom.xml" | "feed.json";

/** Normalised item shape used by all serializers. */
export interface FeedItem {
  title: string;
  url: string;
  date: Date;
  guid?: string; // defaults to url
  html?: string;
  summary?: string;
}

/** One collection's contribution to a multi-source feed. */
export interface FeedSource {
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
}

/** A function that turns pre-built FeedItems into an HTTP Response. */
export type FeedSerializer = (opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}) => Response;

/** Config passed to createFeedEndpoint. */
export interface FeedEndpointConfig {
  /**
   * Called once per GET request to return the sources for this feed.
   * context is provided in case the implementation needs site/request info,
   * but most implementations will just call getCollection() here.
   */
  getSources: (context: APIContext) => Promise<FeedSource[]>;
  title: string;
  description: string;
  /**
   * Given a format filename (e.g. "atom.xml"), return the canonical
   * self-path for this feed (e.g. "/notes/atom.xml").
   */
  selfPath: (format: string) => string;
}

// --- XML helpers ---

/** Escape a string for safe embedding in XML text or attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert root-relative URLs in src/href attributes to absolute URLs. */
function absolutizeUrls(html: string, origin: string): string {
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);
}

// --- AstroContainer helpers ---

/**
 * Create an AstroContainer with the MDX renderer for server-side rendering.
 *
 * The Cloudflare adapter prerenders in workerd where `import.meta.url` is not a
 * valid URL, which causes `AstroContainer.create()` → `createManifest()` →
 * `new URL(import.meta.url)` to throw. We temporarily patch the global URL
 * constructor so invalid URLs fall back to `file://<cwd>/`.
 */
async function createContainer() {
  const OrigURL = globalThis.URL;
  const SafeURL = class extends OrigURL {
    constructor(url: string | URL, base?: string | URL) {
      try {
        super(url, base);
      } catch {
        super("file:///tmp/astro-container/");
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

/** Remove duplicate images from lightbox components for feeds. */
function removeLightboxDuplicates(html: string): string {
  const $ = load(html);
  $("[data-image-lightbox]").each((_, figure) => {
    const $figure = $(figure);
    const $button = $figure.find("[data-lightbox-trigger]");
    if ($button.length > 0) {
      const imageHtml = $button.html();
      if (!imageHtml) {
        throw Error("Failed to find lightbox trigger in page, has the layout changed?");
      }
      $button.replaceWith(imageHtml);
    }
  });
  $("[data-lightbox-container]").remove();
  $("script").remove();
  return $.html();
}

/** Render a single entry to absolute-URL HTML via the container. */
async function renderEntryHtml(
  container: Awaited<ReturnType<typeof createContainer>>,
  entry: any,
  origin: string,
): Promise<string> {
  const { Content } = await render(entry);
  let html = await container.renderToString(Content);
  html = removeLightboxDuplicates(html);
  const $doc = load(html);
  html = $doc("body").html() ?? html;
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

// --- Internal item builder ---

/**
 * Sort, slice, and render a flat list of FeedSources into FeedItems.
 * Shared by all serializers via createFeedEndpoint.
 */
async function buildFeedItems(
  sources: FeedSource[],
  container: Awaited<ReturnType<typeof createContainer>>,
  origin: string,
): Promise<FeedItem[]> {
  const allEntries = sources.flatMap((source) =>
    source.entries.map((entry) => ({ entry, source })),
  );
  const sorted = allEntries
    .sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime())
    .slice(0, RSS_MAX_ENTRIES);

  return Promise.all(
    sorted.map(({ entry, source }) => {
      const url = source.urlBuilder(entry, origin);
      return entryToFeedItem(container, entry, url, origin);
    }),
  );
}

// --- Serializers ---

/** Produce an RSS 2.0 response. */
export function rssSerializer(opts: {
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
    needsContent ? 'xmlns:content="http://purl.org/rss/1.0/modules/content/"' : "",
    'xmlns:atom="http://www.w3.org/2005/Atom"',
  ]
    .filter(Boolean)
    .join(" ");

  const xmlItems = items.map((item) => {
    const guid = item.guid || item.url;
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid>${escapeXml(guid)}</guid>
      ${item.summary ? `<description>${escapeXml(item.summary)}</description>` : ""}
      <pubDate>${item.date.toUTCString()}</pubDate>
      ${item.html ? `<content:encoded><![CDATA[${item.html.replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>` : ""}
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>
<rss version="2.0" ${ns}>
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(site.href)}</link>
    <atom:link href="${escapeXml(`${site.origin}${selfPath}`)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-us</language>
${xmlItems.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Produce an Atom 1.0 response. */
export function atomSerializer(opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}): Response {
  const { title, description, selfPath, items } = opts;
  const site = opts.context.site!;

  const updated = items.length > 0 ? items[0].date.toISOString() : new Date().toISOString();

  const entries = items
    .map(
      (item) => `  <entry>
    <id>${escapeXml(item.url)}</id>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.url)}"/>
    <published>${item.date.toISOString()}</published>
    <updated>${item.date.toISOString()}</updated>
    ${item.summary ? `<summary>${escapeXml(item.summary)}</summary>` : ""}
    ${item.html ? `<content type="html"><![CDATA[${item.html.replace(/]]>/g, "]]]]><![CDATA[>")}]]></content>` : ""}
  </entry>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(site.href)}</id>
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link rel="self" href="${escapeXml(`${site.origin}${selfPath}`)}"/>
  <link rel="alternate" href="${escapeXml(site.href)}"/>
  <updated>${updated}</updated>
${entries}
</feed>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}

/** Produce a JSON Feed 1.1 response. */
export function jsonFeedSerializer(opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}): Response {
  const { title, description, selfPath, items } = opts;
  const site = opts.context.site!;

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title,
    description,
    home_page_url: site.href,
    feed_url: `${site.origin}${selfPath}`,
    authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
    items: items.map((item) => ({
      id: item.url,
      url: item.url,
      title: item.title,
      date_published: item.date.toISOString(),
      ...(item.summary ? { summary: item.summary } : {}),
      ...(item.html ? { content_html: item.html } : {}),
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });
}

// --- Factory ---

const FEED_SERIALIZERS: Record<FeedFormat, FeedSerializer> = {
  "rss.xml": rssSerializer,
  "atom.xml": atomSerializer,
  "feed.json": jsonFeedSerializer,
};

/**
 * Create Astro endpoint exports for a feed that serves all three formats
 * from a single [format].ts page file.
 *
 * Usage:
 *   export const { getStaticPaths, GET } = createFeedEndpoint({ ... });
 */
export function createFeedEndpoint(config: FeedEndpointConfig): {
  getStaticPaths: () => Array<{ params: { format: FeedFormat } }>;
  GET: (context: APIContext) => Promise<Response>;
} {
  return {
    getStaticPaths() {
      return (Object.keys(FEED_SERIALIZERS) as FeedFormat[]).map((format) => ({
        params: { format },
      }));
    },
    async GET(context: APIContext): Promise<Response> {
      const format = context.params.format as FeedFormat;
      const serializer = FEED_SERIALIZERS[format];
      if (!serializer) return new Response("Not found", { status: 404 });
      const site = context.site!;
      const sources = await config.getSources(context);
      const container = await createContainer();
      const items = await buildFeedItems(sources, container, site.origin);
      return serializer({
        context,
        title: config.title,
        description: config.description,
        selfPath: config.selfPath(format),
        items,
      });
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx astro check 2>&1 | tail -20
```

Expected: no errors referencing `feed.ts`. (Errors about the old `rss.xml.ts` files importing `buildCollectionFeed`/`buildMultiCollectionFeed` are expected and will be fixed in Task 2.)

---

## Task 2: Replace old RSS-only page files with `[format].ts` files

**Files:**

- Delete: `src/pages/rss.xml.ts`
- Delete: `src/pages/notes/rss.xml.ts`
- Delete: `src/pages/weeknotes/rss.xml.ts`
- Create: `src/pages/[format].ts`
- Create: `src/pages/notes/[format].ts`
- Create: `src/pages/weeknotes/[format].ts`

- [ ] **Step 1: Delete the three old RSS-only files**

```bash
rm /Users/msfjarvis/git-repos/msfjarvis.dev/src/pages/rss.xml.ts
rm /Users/msfjarvis/git-repos/msfjarvis.dev/src/pages/notes/rss.xml.ts
rm /Users/msfjarvis/git-repos/msfjarvis.dev/src/pages/weeknotes/rss.xml.ts
```

- [ ] **Step 2: Create `src/pages/[format].ts`** (main combined feed — posts + weeknotes)

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { filterDrafts } from "../utils";
import { createFeedEndpoint } from "../lib/feed";

export const prerender = true;

// Weeknotes published before this date were originally posted under /posts/weeknotes-<id>/
const cutoffDate = new Date("2026-05-01");

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources(_context: APIContext) {
    const posts = await getCollection("posts", filterDrafts);
    const weeknotes = await getCollection("weeknotes", filterDrafts);
    return [
      {
        entries: posts,
        urlBuilder: (entry: any, origin: string) => `${origin}/posts/${entry.id}/`,
      },
      {
        entries: weeknotes,
        urlBuilder: (entry: any, origin: string) =>
          entry.data.date < cutoffDate
            ? `${origin}/posts/weeknotes-${entry.id}/`
            : `${origin}/weeknotes/${entry.id}/`,
      },
    ];
  },
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  selfPath: (format) => `/${format}`,
});
```

- [ ] **Step 3: Create `src/pages/notes/[format].ts`**

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";
import { filterDrafts } from "../../utils";
import { createFeedEndpoint } from "../../lib/feed";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources(_context: APIContext) {
    const notes = await getCollection("notes", filterDrafts);
    return [
      {
        entries: notes,
        urlBuilder: (entry: any, origin: string) => `${origin}/notes/${entry.id}/`,
      },
    ];
  },
  title: `Notes — ${SITE_TITLE}`,
  description: "Short notes by Harsh Shandilya",
  selfPath: (format) => `/notes/${format}`,
});
```

- [ ] **Step 4: Create `src/pages/weeknotes/[format].ts`**

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";
import { filterDrafts } from "../../utils";
import { createFeedEndpoint } from "../../lib/feed";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources(_context: APIContext) {
    const weeknotes = await getCollection("weeknotes", filterDrafts);
    return [
      {
        entries: weeknotes,
        urlBuilder: (entry: any, origin: string) => `${origin}/weeknotes/${entry.id}/`,
      },
    ];
  },
  title: `Weeknotes — ${SITE_TITLE}`,
  description: "Weekly notes by Harsh Shandilya",
  selfPath: (format) => `/weeknotes/${format}`,
});
```

- [ ] **Step 5: Verify TypeScript compiles clean**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx astro check 2>&1 | tail -20
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/lib/feed.ts src/pages/\[format\].ts src/pages/notes/\[format\].ts src/pages/weeknotes/\[format\].ts
git rm src/pages/rss.xml.ts src/pages/notes/rss.xml.ts src/pages/weeknotes/rss.xml.ts
git commit -m "feat: refactor feed primitives and add Atom + JSON Feed support"
```

---

## Task 3: Build and verify all 9 feed files are generated

**Files:** (no source changes — verification only)

- [ ] **Step 1: Run the build**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npm run build 2>&1 | tail -30
```

Expected: build succeeds with no errors. Watch for the 9 feed paths in the output:
`/rss.xml`, `/atom.xml`, `/feed.json`, `/notes/rss.xml`, `/notes/atom.xml`, `/notes/feed.json`, `/weeknotes/rss.xml`, `/weeknotes/atom.xml`, `/weeknotes/feed.json`

- [ ] **Step 2: Confirm all 9 output files exist**

```bash
ls dist/rss.xml dist/atom.xml dist/feed.json \
   dist/notes/rss.xml dist/notes/atom.xml dist/notes/feed.json \
   dist/weeknotes/rss.xml dist/weeknotes/atom.xml dist/weeknotes/feed.json
```

Expected: all 9 files listed with no "No such file" errors.

- [ ] **Step 3: Spot-check the RSS feed is still valid XML with expected structure**

```bash
grep -c "<item>" dist/rss.xml
```

Expected: a number greater than 0.

- [ ] **Step 4: Spot-check the Atom feed structure**

```bash
grep "<feed xmlns=" dist/atom.xml && grep "<entry>" dist/atom.xml | head -1
```

Expected: both lines found (non-empty output).

- [ ] **Step 5: Spot-check the JSON Feed is valid JSON with correct version**

```bash
node -e "const f = JSON.parse(require('fs').readFileSync('dist/feed.json','utf8')); console.log(f.version, f.title, f.items.length + ' items')"
```

Expected: `https://jsonfeed.org/version/1.1 msfjarvis.dev <N> items` (N > 0).

- [ ] **Step 6: Spot-check a section feed**

```bash
node -e "const f = JSON.parse(require('fs').readFileSync('dist/notes/feed.json','utf8')); console.log(f.feed_url, f.items.length + ' items')"
```

Expected: `https://msfjarvis.dev/notes/feed.json <N> items`.

---

## Task 4: Update `BaseHead.astro` — global feed links + `alternateFeeds` prop

**Files:**

- Modify: `src/components/BaseHead.astro`

- [ ] **Step 1: Add `alternateFeeds` to the Props interface and destructure it**

In `src/components/BaseHead.astro`, replace the Props block and destructuring:

```astro
---
import '../styles/global.css';
import { SITE_TITLE } from '../consts';

interface Props {
  title: string;
  description: string;
  image?: string;
  alternateFeeds?: Array<{ type: string; title: string; href: string }>;
}

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const { title, description, image = '/android-chrome-512x512.webp', alternateFeeds } = Astro.props;
---
```

- [ ] **Step 2: Replace the existing single RSS `<link>` with all three global feed links plus the section feed slot**

Find and replace this line in the template section:

Old:

```html
<link rel="alternate" type="application/rss+xml" title={`${SITE_TITLE} — RSS`} href={new URL('rss.xml', Astro.site)} />
```

New:

```html
<link rel="alternate" type="application/rss+xml"   title={`${SITE_TITLE} — RSS`}       href={new URL('rss.xml',  Astro.site)} />
<link rel="alternate" type="application/atom+xml"  title={`${SITE_TITLE} — Atom`}      href={new URL('atom.xml', Astro.site)} />
<link rel="alternate" type="application/feed+json" title={`${SITE_TITLE} — JSON Feed`} href={new URL('feed.json',Astro.site)} />
{alternateFeeds?.map(f => (
  <link rel="alternate" type={f.type} title={f.title} href={new URL(f.href, Astro.site)} />
))}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx astro check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/components/BaseHead.astro
git commit -m "feat: add Atom and JSON Feed links to BaseHead and support alternateFeeds prop"
```

---

## Task 5: Update `BaseLayout.astro` — forward `alternateFeeds`

**Files:**

- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add `alternateFeeds` to the Props interface and forward it to BaseHead**

Replace the entire frontmatter and `<BaseHead>` usage in `src/layouts/BaseLayout.astro`:

```astro
---
import BaseHead from '../components/BaseHead.astro';
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

interface Props {
  title?: string;
  description?: string;
  alternateFeeds?: Array<{ type: string; title: string; href: string }>;
}

const {
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  alternateFeeds,
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <BaseHead title={title} description={description} alternateFeeds={alternateFeeds} />
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx astro check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/layouts/BaseLayout.astro
git commit -m "feat: forward alternateFeeds prop through BaseLayout"
```

---

## Task 6: Advertise section feeds on index pages

**Files:**

- Modify: `src/pages/notes/index.astro`
- Modify: `src/pages/weeknotes/index.astro`

- [ ] **Step 1: Add `alternateFeeds` to `notes/index.astro`**

In `src/pages/notes/index.astro`, replace the `<BaseLayout>` opening tag:

Old:

```astro
<BaseLayout title="Notes — Harsh Shandilya" description="Short notes by Harsh Shandilya">
```

New:

```astro
<BaseLayout
  title="Notes — Harsh Shandilya"
  description="Short notes by Harsh Shandilya"
  alternateFeeds={[
    { type: 'application/rss+xml',   title: 'Notes — RSS',       href: '/notes/rss.xml'   },
    { type: 'application/atom+xml',  title: 'Notes — Atom',      href: '/notes/atom.xml'  },
    { type: 'application/feed+json', title: 'Notes — JSON Feed', href: '/notes/feed.json' },
  ]}
>
```

- [ ] **Step 2: Add `alternateFeeds` to `weeknotes/index.astro`**

In `src/pages/weeknotes/index.astro`, replace the `<BaseLayout>` opening tag:

Old:

```astro
<BaseLayout title="Weeknotes — Harsh Shandilya" description="Weekly notes by Harsh Shandilya">
```

New:

```astro
<BaseLayout
  title="Weeknotes — Harsh Shandilya"
  description="Weekly notes by Harsh Shandilya"
  alternateFeeds={[
    { type: 'application/rss+xml',   title: 'Weeknotes — RSS',       href: '/weeknotes/rss.xml'   },
    { type: 'application/atom+xml',  title: 'Weeknotes — Atom',      href: '/weeknotes/atom.xml'  },
    { type: 'application/feed+json', title: 'Weeknotes — JSON Feed', href: '/weeknotes/feed.json' },
  ]}
>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx astro check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/pages/notes/index.astro src/pages/weeknotes/index.astro
git commit -m "feat: advertise section feeds on notes and weeknotes index pages"
```

---

## Task 7: Final build + full verification

**Files:** (no source changes — verification only)

- [ ] **Step 1: Full build**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npm run build 2>&1 | tail -30
```

Expected: build succeeds with 0 errors.

- [ ] **Step 2: Verify all 9 feed files present**

```bash
ls dist/rss.xml dist/atom.xml dist/feed.json \
   dist/notes/rss.xml dist/notes/atom.xml dist/notes/feed.json \
   dist/weeknotes/rss.xml dist/weeknotes/atom.xml dist/weeknotes/feed.json
```

Expected: all 9 listed.

- [ ] **Step 3: Verify global feed links appear in the homepage HTML**

```bash
grep -E 'application/(rss\+xml|atom\+xml|feed\+json)' dist/index.html
```

Expected: three matching `<link rel="alternate"` lines, one for each format.

- [ ] **Step 4: Verify section feed links appear on the notes index page**

```bash
grep -E 'application/(rss\+xml|atom\+xml|feed\+json)' dist/notes/index.html | grep -c "/notes/"
```

Expected: `3` (one per format, all pointing to `/notes/` paths — plus the 3 global ones may also match, so count will be at least 3; check the `/notes/` filter is working).

Actually run this instead to count total feed links on the notes page:

```bash
grep 'rel="alternate"' dist/notes/index.html
```

Expected: 6 lines total — 3 global main feeds + 3 notes-specific feeds.

- [ ] **Step 5: Validate Atom feed has entries**

```bash
grep -c "<entry>" dist/atom.xml
```

Expected: a number > 0.

- [ ] **Step 6: Validate self-referencing URLs in the Atom feed**

```bash
grep 'rel="self"' dist/atom.xml
```

Expected: `<link rel="self" href="https://msfjarvis.dev/atom.xml"/>`

- [ ] **Step 7: Validate feed_url in the notes JSON feed**

```bash
node -e "const f=JSON.parse(require('fs').readFileSync('dist/notes/feed.json','utf8')); console.log(f.feed_url)"
```

Expected: `https://msfjarvis.dev/notes/feed.json`

- [ ] **Step 8: Verify section feed links appear on the weeknotes index page**

```bash
grep 'rel="alternate"' dist/weeknotes/index.html
```

Expected: 6 lines total — 3 global main feeds + 3 weeknotes-specific feeds pointing to `/weeknotes/` paths.

- [ ] **Step 9: Validate feed_url in the weeknotes JSON feed**

```bash
node -e "const f=JSON.parse(require('fs').readFileSync('dist/weeknotes/feed.json','utf8')); console.log(f.feed_url)"
```

Expected: `https://msfjarvis.dev/weeknotes/feed.json`
