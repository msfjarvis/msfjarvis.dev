# RSS Feed Migration: Replace @astrojs/rss with hand-rolled XML

**Date:** 2026-05-04  
**Status:** Approved

## Background

The site uses `@astrojs/rss` to generate three RSS feeds. The package produces invalid RSS output. The reference implementation in `../yashgarg.dev` hand-rolls XML and is known-good. This spec describes porting that approach to msfjarvis.dev.

## Goals

- Produce valid RSS 2.0 with `content:encoded` for full post HTML
- Remove dependency on `@astrojs/rss`
- Preserve the cutoff-date URL rewriting for weeknotes in the main feed
- Keep existing lightbox HTML cleanup (cheerio-based)
- Be extensible for future feeds (per-tag, per-collection, etc.)

## Non-goals

- Cover image support (not used on this site)
- `dc:creator` / author per item (not used on this site)
- Sidenote stripping (yashgarg.dev-specific, not present here)
- Renaming feed URLs (redirects already in place, filenames stay as `rss.xml`)

## Architecture

### `src/lib/feed.ts` — rewritten

All RSS generation logic lives here. Public API is minimal; internals are private.

#### Types (exported)

```ts
interface FeedItem {
  title: string;
  url: string;
  date: Date;
  guid?: string;     // defaults to url
  html?: string;     // → <content:encoded>
  summary?: string;  // → <description>
}

interface FeedSource {
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
}
```

#### Private helpers (kept or adapted from existing code)

| Function | Source | Notes |
|---|---|---|
| `escapeXml(s)` | kept as-is | XML-escapes a string |
| `absolutizeUrls(html, origin)` | kept as-is | Rewrites root-relative src/href to absolute |
| `createContainer()` | kept as-is | AstroContainer with Cloudflare URL workaround |
| `removeLightboxDuplicates(html)` | kept as-is | cheerio-based; removes duplicate images from lightbox components |
| `renderEntryHtml(container, entry, origin)` | new (combines existing logic) | Renders MDX, applies lightbox cleanup, absolutizes URLs |
| `entryToFeedItem(container, entry, url, origin)` | new | Returns a `FeedItem`; no covers, no footer |

#### Public functions (new)

**`buildFeed(opts) → Response`**  
Hand-rolls RSS 2.0 XML and returns a `Response` with `Content-Type: text/xml; charset=utf-8`.
- Adds `xmlns:content` only when any item has `html`
- Adds `<atom:link rel="self">` using `selfPath`
- Adds `<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>`
- Items include: `<title>`, `<link>`, `<guid>`, `<pubDate>`, optional `<description>` (escaped), optional `<content:encoded>` (CDATA)

**`buildCollectionFeed(opts) → Promise<Response>`**  
For single-collection feeds (notes, weeknotes).  
Accepts: `context, entries, urlBuilder, title, description, selfPath`  
Callers are responsible for passing pre-filtered entries (draft/deleted filtering via `filterDrafts` stays in the page file).  
Sorts entries by date descending, renders each to a `FeedItem`, calls `buildFeed`.

**`buildMultiCollectionFeed(opts) → Promise<Response>`**  
For feeds combining multiple collections (posts + weeknotes main feed).  
Accepts: `context, sources: FeedSource[], title, description, selfPath`  
Merges all sources, sorts by date descending, renders each to a `FeedItem`, calls `buildFeed`.

### Page files — rewritten

#### `src/pages/rss.xml.ts` (main feed)

Uses `buildMultiCollectionFeed` with two sources:
- posts: `urlBuilder = (entry, origin) => \`${origin}/posts/${entry.id}/\``
- weeknotes: `urlBuilder` applies cutoff date logic:
  - `entry.data.date < new Date('2026-05-01')` → `${origin}/posts/weeknotes-${entry.id}/`
  - otherwise → `${origin}/weeknotes/${entry.id}/`

The `cutoffDate` constant stays scoped to this file.

#### `src/pages/notes/rss.xml.ts`

Uses `buildCollectionFeed` with `urlBuilder = (entry, origin) => \`${origin}/notes/${entry.id}/\``.

#### `src/pages/weeknotes/rss.xml.ts`

Uses `buildCollectionFeed` with `urlBuilder = (entry, origin) => \`${origin}/weeknotes/${entry.id}/\``.

### `package.json`

- Remove `@astrojs/rss`
- `cheerio` stays
- Run `pnpm install` to update lockfile

## Data Flow

```
GET /rss.xml
  → rss.xml.ts: getCollection(posts) + getCollection(weeknotes)
  → buildMultiCollectionFeed()
      → createContainer()
      → for each entry: renderEntryHtml() → entryToFeedItem()
      → buildFeed()
  → Response (text/xml)
```

## Error Handling

- `removeLightboxDuplicates` already throws if lightbox trigger HTML is missing (preserved)
- `createContainer` catches URL parse failures in Cloudflare workerd (preserved)
- No new error handling needed

## Testing

Manual verification: run `astro build` and inspect the three feed files in `dist/`. Validate against an RSS validator (e.g. validator.w3.org/feed/).
