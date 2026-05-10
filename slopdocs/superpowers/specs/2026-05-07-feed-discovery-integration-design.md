# Feed Discovery Integration Design

**Date:** 2026-05-07  
**Status:** Approved

## Overview

Add an Astro integration (`feedDiscovery`) that automatically collects every feed registered by `createFeedEndpoint` into a build-time global registry and exposes them via a Vite virtual module (`virtual:site-feeds`). The home page imports this module and advertises all feeds in its `<head>`, making the site fully discoverable by feed readers when pointed at `msfjarvis.dev`.

---

## Problem

The home page currently advertises only the three main feeds (RSS, Atom, JSON Feed) via hardcoded `<link rel="alternate">` tags in `BaseHead.astro`. The notes and weeknotes section feeds are only discoverable from their respective index pages. Adding a new content section requires manually wiring its feeds into the home page.

---

## Solution

`createFeedEndpoint` registers all three format links for a feed into a module-level registry as a side effect. The `feedDiscovery` Astro integration provides a Vite plugin whose virtual module (`virtual:site-feeds`) imports every `[format].ts` file in the project (triggering registration), then exports the complete feed list. The home page consumes it.

Adding a new content section in the future = drop in a `[format].ts` file. Zero extra wiring required.

---

## Architecture

### Registry in `src/lib/feed.ts`

A module-level array accumulates `AlternateFeed` entries. `createFeedEndpoint` pushes all three format entries as a side effect at call time (i.e. when the page module is evaluated):

```ts
const _feedRegistry: AlternateFeed[] = [];

export function getRegisteredFeeds(): AlternateFeed[] {
  return [..._feedRegistry];
}
```

Two lookup tables added alongside `FEED_SERIALIZERS`:

```ts
const FORMAT_MIME_TYPES: Record<FeedFormat, string> = {
  "rss.xml": "application/rss+xml",
  "atom.xml": "application/atom+xml",
  "feed.json": "application/feed+json",
};

const FORMAT_LABELS: Record<FeedFormat, string> = {
  "rss.xml": "RSS",
  "atom.xml": "Atom",
  "feed.json": "JSON Feed",
};
```

In `createFeedEndpoint`, before returning `{ getStaticPaths, GET }`:

```ts
for (const format of Object.keys(FEED_SERIALIZERS) as FeedFormat[]) {
  _feedRegistry.push({
    type: FORMAT_MIME_TYPES[format],
    title: `${config.title} — ${FORMAT_LABELS[format]}`,
    href: config.selfPath(format),
  });
}
```

This runs once per `[format].ts` file, at module evaluation time.

---

### `src/integrations/feed-discovery.ts` — Astro integration

Default export `feedDiscovery()` returns an `AstroIntegration` with a single `name` (`feed-discovery`) and a `hooks['astro:config:setup']` that adds a Vite plugin.

**Vite plugin (`vite-plugin-site-feeds`):**

- `resolveId(id)`: returns `\0virtual:site-feeds` when `id === 'virtual:site-feeds'`
- `load(id)`: when the resolved sentinel is matched, generates a JavaScript module string:
  1. Uses Node's built-in `fs.globSync` (Node 22, available in this project's runtime) to find all files named `[format].ts` (or `[format].js`) anywhere under `src/pages/` — no extra dependency needed
  2. Emits one `import` statement per found file (by absolute path) — these are side-effect-only imports that trigger `createFeedEndpoint` registration
  3. Emits `import { getRegisteredFeeds } from '<abs-path-to-feed.ts>';`
  4. Emits `export const feeds = getRegisteredFeeds();`

The glob runs inside `load`, not at plugin instantiation, so new `[format].ts` files are discovered on the next Vite module load (no restart needed in dev).

**Integration needs `config.root` to resolve absolute paths.** This is available via the `astro:config:setup` hook's `config` argument.

---

### `src/env.d.ts` — virtual module type declaration (new file)

This file does not currently exist. Create it with:

```ts
/// <reference types="astro/client" />

declare module "virtual:site-feeds" {
  import type { AlternateFeed } from "./consts";
  export const feeds: AlternateFeed[];
}
```

---

### `astro.config.mjs` — register the integration

```js
import feedDiscovery from './src/integrations/feed-discovery.ts';

export default defineConfig({
  integrations: [mdx(), sitemap(), feedDiscovery()],
  ...
});
```

---

### `src/pages/index.astro` — consume the registry

```ts
import { feeds } from "virtual:site-feeds";
export const prerender = true;
```

`feeds` is passed to `<BaseLayout alternateFeeds={feeds}>`. The three hardcoded global feed links in `BaseHead.astro` remain — they continue to appear on every page. The `alternateFeeds` on the home page adds all 9 feeds to just the home page's `<head>`.

---

## Data Flow

```
[format].ts module evaluated
  └─ createFeedEndpoint({ title, selfPath, ... })
       └─ _feedRegistry.push({ type, title, href }) × 3 formats

virtual:site-feeds resolved by Vite
  └─ glob src/pages/**/[format].ts
  └─ import each file (side effects fire if not already cached)
  └─ getRegisteredFeeds() → AlternateFeed[]
  └─ export { feeds }

index.astro (prerendered)
  └─ import { feeds } from 'virtual:site-feeds'
  └─ <BaseLayout alternateFeeds={feeds}>
       └─ <BaseHead alternateFeeds={feeds}>
            └─ <link rel="alternate"> × 9 (3 global hardcoded + 9 from registry,
                                            but global 3 are duplicated — see note)
```

> **Deduplication note:** `BaseHead.astro` currently hardcodes the three main feed `<link>` tags on every page AND renders `alternateFeeds` after them. On the home page, the virtual module will include those same three main feeds (since `src/pages/[format].ts` registers them). This produces duplicates. Fix: either remove the three hardcoded tags from `BaseHead.astro` (and rely on `alternateFeeds` everywhere they're needed), or deduplicate in `BaseHead.astro` by href. The simplest fix is to remove the hardcoded tags and have the global feeds come from `alternateFeeds` only on the home page — but that removes them from ALL other pages.
>
> **Chosen fix:** Keep the three hardcoded global tags in `BaseHead.astro`. In `BaseHead.astro`, filter `alternateFeeds` to exclude any entry whose `href` matches one of the three already-hardcoded paths (`/rss.xml`, `/atom.xml`, `/feed.json`) before rendering. `index.astro` passes `feeds` from the registry without any filtering — deduplication lives in `BaseHead.astro`, which already owns those hardcoded links.

---

## Files Changed

| Action | Path                                 |
| ------ | ------------------------------------ |
| Modify | `src/lib/feed.ts`                    |
| Create | `src/integrations/feed-discovery.ts` |
| Modify | `src/env.d.ts`                       |
| Modify | `astro.config.mjs`                   |
| Modify | `src/pages/index.astro`              |
