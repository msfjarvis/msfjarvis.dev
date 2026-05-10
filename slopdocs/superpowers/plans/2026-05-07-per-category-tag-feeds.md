# Per-Category and Per-Tag Feeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create per-category and per-tag feed endpoints and advertise them on their respective detail pages.

**Architecture:** Export `FEED_FORMATS`, `FEED_SERIALIZERS`, and a new `buildFeedFromSources` helper from `feed.ts`. Create `src/pages/categories/[category]/[format].ts` and `src/pages/tags/[tag]/[format].ts` — each uses `getStaticPaths` to generate all param×format combinations and `buildFeedFromSources` in `GET`. Update `[category].astro` and `[tag].astro` to pass `alternateFeeds`. These feeds do not go through the discovery registry (too many to advertise on the home page).

**Tech Stack:** Astro 6, TypeScript

---

## Notes on scope

- Categories come from **posts + weeknotes** only (notes has no categories field used here)
- Tags come from **posts + notes + weeknotes**
- Weeknotes before `WEEKNOTES_LEGACY_CUTOFF` use `/posts/weeknotes-<id>/` URLs
- `Astro.params.category` / `Astro.params.tag` are URL slugs; props hold the raw display name
- No changes to `categories/index.astro` or `tags/index.astro` — no meaningful "all categories" feed exists

---

## File Map

| Action | Path                                          | Responsibility                                                    |
| ------ | --------------------------------------------- | ----------------------------------------------------------------- |
| Modify | `src/lib/feed.ts`                             | Export `FEED_FORMATS`, `FEED_SERIALIZERS`, `buildFeedFromSources` |
| Create | `src/pages/categories/[category]/[format].ts` | Per-category feed endpoint                                        |
| Create | `src/pages/tags/[tag]/[format].ts`            | Per-tag feed endpoint                                             |
| Modify | `src/pages/categories/[category].astro`       | Advertise 3 category-specific feed links                          |
| Modify | `src/pages/tags/[tag].astro`                  | Advertise 3 tag-specific feed links                               |

---

## Task 1: Export `FEED_FORMATS`, `FEED_SERIALIZERS`, and `buildFeedFromSources` from `feed.ts`

**Files:**

- Modify: `src/lib/feed.ts`

- [ ] **Step 1: Export `FEED_FORMATS` and `FEED_SERIALIZERS`**

Currently both are `const` (unexported). Change their declarations:

Find:

```ts
const FEED_SERIALIZERS: Record<FeedFormat, FeedSerializer> = {
```

Replace with:

```ts
export const FEED_SERIALIZERS: Record<FeedFormat, FeedSerializer> = {
```

Find:

```ts
const FEED_FORMATS = Object.keys(FEED_SERIALIZERS) as FeedFormat[];
```

Replace with:

```ts
export const FEED_FORMATS = Object.keys(FEED_SERIALIZERS) as FeedFormat[];
```

- [ ] **Step 2: Add `buildFeedFromSources` export**

After the `getRegisteredFeeds` function and before `createFeedEndpoint`, add:

```ts
/**
 * Build a feed response from explicitly provided sources.
 *
 * Use this for parameterized endpoints (e.g. per-category, per-tag) that
 * cannot use createFeedEndpoint because they have extra route params beyond
 * `format`. The caller is responsible for calling getStaticPaths and
 * dispatching to this function in GET.
 *
 * Note: does not register into the feed discovery registry — use
 * createFeedEndpoint for feeds that should appear in virtual:site-feeds.
 */
export async function buildFeedFromSources(opts: {
  context: APIContext;
  sources: FeedSource[];
  title: string;
  description: string;
  selfPath: string;
  serializer: FeedSerializer;
}): Promise<Response> {
  const site = opts.context.site!;
  const container = await createContainer();
  const items = await buildFeedItems(opts.sources, container, site.origin);
  return opts.serializer({
    context: opts.context,
    title: opts.title,
    description: opts.description,
    selfPath: opts.selfPath,
    items,
  });
}
```

- [ ] **Step 3: Verify**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/lib/feed.ts
git commit -m "feat: export FEED_FORMATS, FEED_SERIALIZERS, and buildFeedFromSources"
```

---

## Task 2: Create per-category feed endpoint

**Files:**

- Create: `src/pages/categories/[category]/[format].ts`

- [ ] **Step 1: Create the file**

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE, WEEKNOTES_LEGACY_CUTOFF } from "../../../consts";
import { filterDrafts, slugify } from "../../../utils";
import {
  type FeedFormat,
  FEED_FORMATS,
  FEED_SERIALIZERS,
  buildFeedFromSources,
} from "../../../lib/feed";

export const prerender = true;

export async function getStaticPaths() {
  const [posts, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const catNames = new Set([...posts, ...weeknotes].flatMap((e) => e.data.categories));

  return [...catNames].flatMap((name) =>
    FEED_FORMATS.map((format) => ({
      params: { category: slugify(name), format },
      props: { categoryName: name },
    })),
  );
}

export async function GET(context: APIContext) {
  const { category, format } = context.params;
  const { categoryName } = context.props as { categoryName: string };
  const serializer = FEED_SERIALIZERS[format as FeedFormat];
  if (!serializer) return new Response("Not Found", { status: 404 });

  const [posts, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const filteredPosts = posts.filter((e) => e.data.categories.map(slugify).includes(category));
  const filteredWeeknotes = weeknotes.filter((e) =>
    e.data.categories.map(slugify).includes(category),
  );

  return buildFeedFromSources({
    context,
    sources: [
      {
        entries: filteredPosts,
        urlBuilder: (entry, origin) => `${origin}/posts/${entry.id}/`,
      },
      {
        entries: filteredWeeknotes,
        urlBuilder: (entry, origin) =>
          entry.data.date < WEEKNOTES_LEGACY_CUTOFF
            ? `${origin}/posts/weeknotes-${entry.id}/`
            : `${origin}/weeknotes/${entry.id}/`,
      },
    ],
    serializer,
    title: `${categoryName} — ${SITE_TITLE}`,
    description: `Posts in the ${categoryName} category`,
    selfPath: `/categories/${category}/${format}`,
  });
}
```

- [ ] **Step 2: Verify**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add "src/pages/categories/[category]/[format].ts"
git commit -m "feat: add per-category feed endpoints"
```

---

## Task 3: Create per-tag feed endpoint

**Files:**

- Create: `src/pages/tags/[tag]/[format].ts`

- [ ] **Step 1: Create the file**

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE, WEEKNOTES_LEGACY_CUTOFF } from "../../../consts";
import { filterDrafts, slugify } from "../../../utils";
import {
  type FeedFormat,
  FEED_FORMATS,
  FEED_SERIALIZERS,
  buildFeedFromSources,
} from "../../../lib/feed";

export const prerender = true;

export async function getStaticPaths() {
  const [posts, notes, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("notes", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const tagNames = new Set([...posts, ...notes, ...weeknotes].flatMap((e) => e.data.tags));

  return [...tagNames].flatMap((name) =>
    FEED_FORMATS.map((format) => ({
      params: { tag: slugify(name), format },
      props: { tagName: name },
    })),
  );
}

export async function GET(context: APIContext) {
  const { tag, format } = context.params;
  const { tagName } = context.props as { tagName: string };
  const serializer = FEED_SERIALIZERS[format as FeedFormat];
  if (!serializer) return new Response("Not Found", { status: 404 });

  const [posts, notes, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("notes", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const filteredPosts = posts.filter((e) => e.data.tags.map(slugify).includes(tag));
  const filteredNotes = notes.filter((e) => e.data.tags.map(slugify).includes(tag));
  const filteredWeeknotes = weeknotes.filter((e) => e.data.tags.map(slugify).includes(tag));

  return buildFeedFromSources({
    context,
    sources: [
      {
        entries: filteredPosts,
        urlBuilder: (entry, origin) => `${origin}/posts/${entry.id}/`,
      },
      {
        entries: filteredNotes,
        urlBuilder: (entry, origin) => `${origin}/notes/${entry.id}/`,
      },
      {
        entries: filteredWeeknotes,
        urlBuilder: (entry, origin) =>
          entry.data.date < WEEKNOTES_LEGACY_CUTOFF
            ? `${origin}/posts/weeknotes-${entry.id}/`
            : `${origin}/weeknotes/${entry.id}/`,
      },
    ],
    serializer,
    title: `${tagName} — ${SITE_TITLE}`,
    description: `Posts tagged ${tagName}`,
    selfPath: `/tags/${tag}/${format}`,
  });
}
```

- [ ] **Step 2: Verify**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add "src/pages/tags/[tag]/[format].ts"
git commit -m "feat: add per-tag feed endpoints"
```

---

## Task 4: Advertise feeds on `[category].astro` and `[tag].astro`

**Files:**

- Modify: `src/pages/categories/[category].astro`
- Modify: `src/pages/tags/[tag].astro`

- [ ] **Step 1: Update `[category].astro`**

`Astro.params.category` is the URL slug. `category` (from props) is the display name.

Find the `<BaseLayout>` opening tag:

```astro
<BaseLayout title={`${category} — Categories`} description={`Posts in ${category}`}>
```

Replace with:

```astro
<BaseLayout
  title={`${category} — Categories`}
  description={`Posts in ${category}`}
  alternateFeeds={[
    { type: 'application/rss+xml',   title: `${category} — RSS`,       href: `/categories/${Astro.params.category}/rss.xml`   },
    { type: 'application/atom+xml',  title: `${category} — Atom`,      href: `/categories/${Astro.params.category}/atom.xml`  },
    { type: 'application/feed+json', title: `${category} — JSON Feed`, href: `/categories/${Astro.params.category}/feed.json` },
  ]}
>
```

- [ ] **Step 2: Update `[tag].astro`**

`Astro.params.tag` is the URL slug. `tag` (from props) is the display name.

Find the `<BaseLayout>` opening tag:

```astro
<BaseLayout title={`${tag} — Tags`} description={`Posts tagged ${tag}`}>
```

Replace with:

```astro
<BaseLayout
  title={`${tag} — Tags`}
  description={`Posts tagged ${tag}`}
  alternateFeeds={[
    { type: 'application/rss+xml',   title: `${tag} — RSS`,       href: `/tags/${Astro.params.tag}/rss.xml`   },
    { type: 'application/atom+xml',  title: `${tag} — Atom`,      href: `/tags/${Astro.params.tag}/atom.xml`  },
    { type: 'application/feed+json', title: `${tag} — JSON Feed`, href: `/tags/${Astro.params.tag}/feed.json` },
  ]}
>
```

- [ ] **Step 3: Verify**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add "src/pages/categories/[category].astro" "src/pages/tags/[tag].astro"
git commit -m "feat: advertise per-category and per-tag feeds on detail pages"
```

---

## Task 5: Build and verify

**Files:** (verification only)

- [ ] **Step 1: Run the build**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && XDG_CONFIG_HOME=/tmp/xdg-config npm run build 2>&1 | tail -15
```

Expected: build succeeds with 0 errors.

- [ ] **Step 2: Confirm category feed files exist**

```bash
ls dist/client/categories/
```

Expected: subdirectory names for each category slug, each containing `rss.xml`, `atom.xml`, `feed.json`.

Pick one slug and verify:

```bash
ls dist/client/categories/$(ls dist/client/categories/ | head -1)/
```

Expected: `rss.xml`, `atom.xml`, `feed.json` (and possibly an `index.html`).

- [ ] **Step 3: Confirm tag feed files exist**

```bash
ls dist/client/tags/ | head -5
```

Pick one slug:

```bash
ls dist/client/tags/$(ls dist/client/tags/ | head -1)/
```

Expected: `rss.xml`, `atom.xml`, `feed.json`.

- [ ] **Step 4: Verify a category detail page has 6 feed links (3 global + 3 category)**

Pick a category slug and check its HTML:

```bash
CATSLUG=$(ls dist/client/categories/ | grep -v '\.xml\|\.json' | head -1) && \
node -e "
const html = require('fs').readFileSync('dist/client/categories/${CATSLUG}/index.html', 'utf8');
const links = [...html.matchAll(/rel=\"alternate\"[^>]+href=\"([^\"]+)\"/g)].map(m => m[1]);
console.log(links.join('\n'));
console.log('Total:', links.length);
"
```

Expected: 6 lines — `/rss.xml`, `/atom.xml`, `/feed.json` (global) plus `/categories/<slug>/rss.xml`, `/categories/<slug>/atom.xml`, `/categories/<slug>/feed.json`.

- [ ] **Step 5: Verify a tag detail page has 6 feed links**

```bash
TAGSLUG=$(ls dist/client/tags/ | grep -v '\.xml\|\.json' | head -1) && \
node -e "
const html = require('fs').readFileSync('dist/client/tags/${TAGSLUG}/index.html', 'utf8');
const links = [...html.matchAll(/rel=\"alternate\"[^>]+href=\"([^\"]+)\"/g)].map(m => m[1]);
console.log(links.join('\n'));
console.log('Total:', links.length);
"
```

Expected: 6 lines — `/rss.xml`, `/atom.xml`, `/feed.json` plus `/tags/<slug>/rss.xml`, `/tags/<slug>/atom.xml`, `/tags/<slug>/feed.json`.

- [ ] **Step 6: Spot-check a category RSS feed is valid**

```bash
CATSLUG=$(ls dist/client/categories/ | grep -v '\.xml\|\.json' | head -1)
grep -c "<item>" dist/client/categories/$CATSLUG/rss.xml
```

Expected: a number ≥ 1.

- [ ] **Step 7: Spot-check a tag JSON feed**

```bash
TAGSLUG=$(ls dist/client/tags/ | grep -v '\.xml\|\.json' | head -1)
node -e "
const f = JSON.parse(require('fs').readFileSync('dist/client/tags/${TAGSLUG}/feed.json', 'utf8'));
console.log(f.feed_url, f.items.length + ' items');
"
```

Expected: URL contains `/tags/` and item count ≥ 1.
