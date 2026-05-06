# Multi-Format Feeds Design

**Date:** 2026-05-07  
**Status:** Approved

## Overview

Add Atom 1.0 and JSON Feed 1.1 output alongside the existing RSS 2.0 feeds. Refactor the feed infrastructure so that dropping a single file into a content section directory automatically generates all three feed formats. Advertise feeds globally in `BaseHead.astro` and per-section on section index pages.

---

## URL Table

| Collection               | RSS                  | Atom                  | JSON Feed              |
| ------------------------ | -------------------- | --------------------- | ---------------------- |
| Main (posts + weeknotes) | `/rss.xml`           | `/atom.xml`           | `/feed.json`           |
| Notes                    | `/notes/rss.xml`     | `/notes/atom.xml`     | `/notes/feed.json`     |
| Weeknotes                | `/weeknotes/rss.xml` | `/weeknotes/atom.xml` | `/weeknotes/feed.json` |

All existing RSS URLs are preserved.

---

## Architecture

### Routing — one file per collection

Each collection gets a single Astro endpoint file using a `[format]` dynamic segment. `getStaticPaths` returns the three format values; Astro includes dots in param values so the URLs resolve correctly.

```
src/pages/[format].ts                → /rss.xml, /atom.xml, /feed.json
src/pages/notes/[format].ts          → /notes/rss.xml, /notes/atom.xml, /notes/feed.json
src/pages/weeknotes/[format].ts      → /weeknotes/rss.xml, /weeknotes/atom.xml, /weeknotes/feed.json
```

The existing `rss.xml.ts`, `notes/rss.xml.ts`, and `weeknotes/rss.xml.ts` are deleted.

Adding a new collection in the future = one new `[format].ts` file.

---

### `src/lib/feed.ts` — refactored primitives

#### Types

```ts
/** Supported feed format param values */
export type FeedFormat = "rss.xml" | "atom.xml" | "feed.json";

/** A function that serialises pre-built FeedItems into an HTTP Response */
export type FeedSerializer = (opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}) => Response;

/** Config passed to createFeedEndpoint */
export interface FeedEndpointConfig {
  getSources: (context: APIContext) => Promise<FeedSource[]>;
  title: string;
  description: string;
  /** Given the format filename (e.g. 'atom.xml'), return the self path (e.g. '/notes/atom.xml') */
  selfPath: (format: string) => string;
}
```

#### Serializers (all exported)

- **`rssSerializer`** — existing `buildFeed` logic, moved/renamed. Produces RSS 2.0 with `content:encoded` and `atom:link` self-reference.
- **`atomSerializer`** — new. Produces valid Atom 1.0 XML with `<feed>`, `<entry>`, `<content type="html">`, and a `<link rel="self">`.
- **`jsonFeedSerializer`** — new. Produces JSON Feed 1.1 with `content_html`, `date_published`, and the standard `feed_url` top-level field. Returns `Content-Type: application/feed+json`.

#### `createFeedEndpoint(config)` factory

Returns `{ getStaticPaths, GET }` ready for direct re-export from a page file.

- `getStaticPaths` always returns `[{ params: { format: 'rss.xml' } }, { params: { format: 'atom.xml' } }, { params: { format: 'feed.json' } }]`.
- `GET` calls `config.getSources(context)`, builds and sorts items (shared internal helper, capped at `RSS_MAX_ENTRIES = 40`), then dispatches to the correct serializer based on `context.params.format`.

#### Internal helpers (unchanged/private)

- `createContainer()` — AstroContainer with MDX renderer (existing)
- `renderEntryHtml()` — renders a content entry to absolute-URL HTML (existing)
- `entryToFeedItem()` — converts a rendered entry to `FeedItem` (existing)
- `buildFeedItems()` — sorts, slices, and renders a flat list of `{ entry, source }` pairs into `FeedItem[]` (extracted from current `buildMultiCollectionFeed`)

#### Removed helpers

`buildCollectionFeed` and `buildMultiCollectionFeed` are deleted — they have no callers after this refactor. `createFeedEndpoint` + `buildFeedItems` fully replaces them.

---

### Page files

Each page file is ~15 lines:

```ts
// src/pages/notes/[format].ts
import { getCollection } from "astro:content";
import { SITE_TITLE } from "../../consts";
import { filterDrafts } from "../../utils";
import { createFeedEndpoint } from "../../lib/feed";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources() {
    const notes = await getCollection("notes", filterDrafts);
    return [{ entries: notes, urlBuilder: (e, origin) => `${origin}/notes/${e.id}/` }];
  },
  title: `Notes — ${SITE_TITLE}`,
  description: "Short notes by Harsh Shandilya",
  selfPath: (format) => `/notes/${format}`,
});
```

The main `[format].ts` passes two sources (posts + weeknotes) with the existing cutoff-date URL logic for weeknotes.

---

### Feed advertising

#### `BaseHead.astro`

New optional prop:

```ts
alternateFeeds?: Array<{ type: string; title: string; href: string }>
```

The three main feed `<link rel="alternate">` tags are hardcoded. Any `alternateFeeds` entries are rendered after them:

```html
<!-- hardcoded globals -->
<link rel="alternate" type="application/rss+xml" title="msfjarvis.dev — RSS" href="/rss.xml" />
<link rel="alternate" type="application/atom+xml" title="msfjarvis.dev — Atom" href="/atom.xml" />
<link
  rel="alternate"
  type="application/feed+json"
  title="msfjarvis.dev — JSON Feed"
  href="/feed.json"
/>
<!-- injected section feeds -->
{alternateFeeds?.map(f =>
<link rel="alternate" type="{f.type}" title="{f.title}" href="{f.href}" />)}
```

#### `BaseLayout.astro`

Forwards `alternateFeeds` to `BaseHead` unchanged.

#### `notes/index.astro` and `weeknotes/index.astro`

Each passes its three section feed links via `alternateFeeds` on `<BaseLayout>`.

---

## Data Flow

```
[format].ts
  └─ createFeedEndpoint({ getSources, title, description, selfPath })
       ├─ getStaticPaths() → [rss.xml, atom.xml, feed.json]
       └─ GET(context)
            ├─ getSources(context) → FeedSource[]
            ├─ buildFeedItems(sources, container, origin) → FeedItem[]
            └─ dispatch on context.params.format
                 ├─ rssSerializer     → Response (text/xml)
                 ├─ atomSerializer    → Response (text/xml)
                 └─ jsonFeedSerializer→ Response (application/feed+json)
```

---

## Feed Format Specifications

### Atom 1.0

- Root: `<feed xmlns="http://www.w3.org/2005/Atom">`
- `<id>`: site origin URL
- `<title>`, `<subtitle>` (description), `<updated>` (most recent entry date)
- `<link rel="self">` pointing to the feed URL
- `<link rel="alternate">` pointing to the site
- Per entry: `<entry>` with `<id>` (URL), `<title>`, `<link href>`, `<published>`, `<updated>` (same as published), `<summary>` (if present), `<content type="html">` (CDATA-wrapped HTML)

### JSON Feed 1.1

- `version`: `"https://jsonfeed.org/version/1.1"`
- `title`, `description` (mapped to JSON Feed `description` field), `home_page_url`, `feed_url`
- `authors`: `[{ name: AUTHOR_NAME, url: SITE_URL }]`
- Per item: `id` (URL), `url`, `title`, `date_published` (ISO 8601), `summary` (if present), `content_html`

---

## Files Changed

| Action | Path                              |
| ------ | --------------------------------- |
| Delete | `src/pages/rss.xml.ts`            |
| Delete | `src/pages/notes/rss.xml.ts`      |
| Delete | `src/pages/weeknotes/rss.xml.ts`  |
| Modify | `src/lib/feed.ts`                 |
| Create | `src/pages/[format].ts`           |
| Create | `src/pages/notes/[format].ts`     |
| Create | `src/pages/weeknotes/[format].ts` |
| Modify | `src/components/BaseHead.astro`   |
| Modify | `src/layouts/BaseLayout.astro`    |
| Modify | `src/pages/notes/index.astro`     |
| Modify | `src/pages/weeknotes/index.astro` |
