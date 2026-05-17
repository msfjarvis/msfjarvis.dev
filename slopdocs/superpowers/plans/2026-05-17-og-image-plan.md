# OpenGraph Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add build-time OpenGraph image generation for collection entries using `astro-og-canvas`, with a shared framed-card template populated from Astro content collections.

**Architecture:** Add a static OG image route that loads `posts`, `notes`, and `weeknotes` with `getCollection()`, maps them into `astro-og-canvas` pages, and renders a shared two-zone card design. Then thread the generated image path into page metadata via `PostLayout`/`BaseHead` so collection pages publish their own `og:image` and `twitter:image` URLs.

**Tech Stack:** Astro 6, Astro content collections, `astro-og-canvas`, TypeScript, local font/background assets, `pnpm`.

---

## File structure

**Create**

- `src/lib/og-image.ts` — shared OG page-data builder, date formatting, collection labels, fallback summary handling
- `src/pages/open-graph/[...route].ts` — static OG image route using `OGImageRoute`
- `src/assets/og/` — OG-specific assets if needed for copied base/background or fonts

**Modify**

- `package.json` — add `astro-og-canvas` dependency (and `canvaskit-wasm` because this repo uses `pnpm`)
- `src/layouts/PostLayout.astro` — accept/pass a per-page OG image path into `BaseHead`
- `src/components/BaseHead.astro` — no API change if it already accepts `image`; only update if a default-handling tweak is needed
- `src/pages/posts/[slug].astro` — pass OG image path based on collection + slug
- `src/pages/notes/[slug].astro` — pass OG image path based on collection + slug
- `src/pages/weeknotes/[slug].astro` — pass OG image path based on collection + slug
- `.gitignore` — only if new generated temp/asset paths need ignoring

**Reference**

- `src/content.config.ts` — existing schema (`title`, `date`, `summary`)
- `og_base.png` — visual inspiration/background source
- `astro.config.mjs` — confirm no extra integration wiring is required

**Validation approach**

- Prefer temporary runtime-relevant checks over permanent tests for this extension/integration work
- Validate by building the site and inspecting generated OG image endpoints/HTML metadata

---

### Task 1: Install and wire the OG image dependency

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add the new dependencies**

Update `package.json` dependencies to include:

```json
{
  "dependencies": {
    "astro-og-canvas": "^0.5.0",
    "sharp": "^0.34.3"
  },
  "devDependencies": {},
  "optionalDependencies": {},
  "pnpm": {},
  "packageManager": "pnpm"
}
```

Add the direct `pnpm` requirement as well:

```json
{
  "dependencies": {
    "canvaskit-wasm": "^0.39.1"
  }
}
```

Keep exact versions aligned with current latest compatible releases at edit time if they differ.

- [ ] **Step 2: Install and refresh the lockfile**

Run:

```bash
pnpm add astro-og-canvas canvaskit-wasm
```

Expected: install completes successfully and updates `pnpm-lock.yaml`.

- [ ] **Step 3: Sanity-check the package is present**

Run:

```bash
pnpm list astro-og-canvas canvaskit-wasm
```

Expected: both packages appear in dependency output.

- [ ] **Step 4: Commit dependency changes**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add astro-og-canvas dependencies"
```

---

### Task 2: Build shared OG page-data helpers

**Files:**

- Create: `src/lib/og-image.ts`
- Reference: `src/content.config.ts`

- [ ] **Step 1: Create the helper module with explicit types**

Create `src/lib/og-image.ts` with focused helpers like:

```ts
import { getCollection, type CollectionEntry } from "astro:content";
import { filterDrafts } from "../utils";

type CollectionName = "posts" | "notes" | "weeknotes";

type OGPage = {
  title: string;
  summary?: string;
  date: Date;
  collection: CollectionName;
  collectionLabel: string;
  slug: string;
};

export function formatOGDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function getCollectionLabel(collection: CollectionName): string {
  switch (collection) {
    case "posts":
      return "post";
    case "notes":
      return "note";
    case "weeknotes":
      return "weeknote";
  }
}

export function toOGPage(
  collection: CollectionName,
  entry: CollectionEntry<CollectionName>,
): OGPage {
  return {
    title: entry.data.title,
    summary: entry.data.summary?.trim() || undefined,
    date: entry.data.date,
    collection,
    collectionLabel: getCollectionLabel(collection),
    slug: entry.id,
  };
}
```

- [ ] **Step 2: Add collection loaders and route helpers**

Extend `src/lib/og-image.ts` with:

```ts
export async function loadOGPages(): Promise<Record<string, OGPage>> {
  const [posts, notes, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("notes", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  return Object.fromEntries([
    ...posts.map((entry) => [`posts/${entry.id}`, toOGPage("posts", entry)]),
    ...notes.map((entry) => [`notes/${entry.id}`, toOGPage("notes", entry)]),
    ...weeknotes.map((entry) => [`weeknotes/${entry.id}`, toOGPage("weeknotes", entry)]),
  ]);
}

export function getOGImagePath(collection: CollectionName, slug: string): string {
  return `/open-graph/${collection}/${slug}.png`;
}
```

- [ ] **Step 3: Add fallback summary copy rules inline**

If you want a fallback summary rather than blank lower copy, add:

```ts
export function getOGSummary(page: OGPage): string | undefined {
  return page.summary ?? `msfjarvis.dev ${page.collectionLabel}`;
}
```

If blank lower copy is preferred, omit this helper and let `undefined` flow through.

- [ ] **Step 4: Type-check the helper module**

Run:

```bash
pnpm astro check
```

Expected: no TypeScript errors from `src/lib/og-image.ts`.

- [ ] **Step 5: Commit the helper module**

```bash
git add src/lib/og-image.ts
git commit -m "feat: add OG image page helpers"
```

---

### Task 3: Implement the `astro-og-canvas` route with the chosen template

**Files:**

- Create: `src/pages/open-graph/[...route].ts`
- Reference: `src/lib/og-image.ts`
- Reference: `og_base.png`

- [ ] **Step 1: Create the route scaffold**

Create `src/pages/open-graph/[...route].ts`:

```ts
import { OGImageRoute } from "astro-og-canvas";
import { formatOGDate, getOGSummary, loadOGPages } from "../../lib/og-image";

const pages = await loadOGPages();

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: getOGSummary(page),
  }),
});
```

Start with the minimal route first; do not jump straight to full styling until this compiles.

- [ ] **Step 2: Verify the route compiles before styling**

Run:

```bash
pnpm astro check
```

Expected: route types resolve and `OGImageRoute` compiles.

- [ ] **Step 3: Add the framed Option 3 layout styling**

Expand `getImageOptions()` toward the approved design, for example:

```ts
getImageOptions: (_path, page) => ({
  title: page.title,
  description: getOGSummary(page),
  bgImage: {
    path: "./og_base.png",
    fit: "cover",
    position: "center",
  },
  padding: 48,
  border: {
    width: 0,
  },
  logo: undefined,
  bgGradient: [
    [16, 19, 23],
    [25, 31, 43],
  ],
  font: {
    title: {
      color: [240, 241, 243],
      size: 42,
      lineHeight: 1.08,
      weight: "SemiBold",
      families: ["JetBrains Mono"],
    },
    description: {
      color: [192, 198, 208],
      size: 19,
      lineHeight: 1.4,
    },
  },
  fonts: ["./public/fonts/JetBrainsMonoNerdFontMono-Medium.ttf"],
  cacheDir: "./node_modules/.astro-og-canvas",
});
```

Then add whatever custom drawing/layout hooks `astro-og-canvas` supports to represent:

- left accent stripe
- framed inner container
- top site/date header
- title zone with capped height
- bottom summary zone with separator

If the library cannot express the full frame composition directly, reduce to the closest viable approximation while preserving the two-zone spacing guarantees.

- [ ] **Step 4: Build the site and inspect generated images**

Run:

```bash
pnpm build
```

Expected: build succeeds and the OG route emits images under `dist/open-graph/` or the equivalent build output for this Astro configuration.

- [ ] **Step 5: Check a few generated outputs manually**

Run:

```bash
find dist -path '*open-graph*' | head -20
```

Expected: PNG outputs exist for at least one post, one note, and one weeknote.

- [ ] **Step 6: Commit the OG route**

```bash
git add src/pages/open-graph/[...route].ts
git commit -m "feat: add build-time OG image route"
```

---

### Task 4: Thread OG image URLs into collection pages

**Files:**

- Modify: `src/layouts/PostLayout.astro`
- Modify: `src/pages/posts/[slug].astro`
- Modify: `src/pages/notes/[slug].astro`
- Modify: `src/pages/weeknotes/[slug].astro`
- Reference: `src/components/BaseHead.astro`
- Reference: `src/lib/og-image.ts`

- [ ] **Step 1: Extend `PostLayout` props**

Update `src/layouts/PostLayout.astro`:

```ts
interface Props {
  title: string;
  description?: string;
  date: Date;
  lastmod?: Date;
  minutesRead?: number;
  tags?: string[];
  image?: string;
}

const { title, description, date, lastmod, minutesRead, tags, image } = Astro.props;
```

And pass it through:

```astro
<BaseHead title={title} description={description ?? title} image={image} />
```

- [ ] **Step 2: Pass image paths from post pages**

Update `src/pages/posts/[slug].astro`:

```ts
import { getOGImagePath } from "../../lib/og-image";
```

And in the layout call:

```astro
<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  lastmod={entry.data.lastmod}
  tags={entry.data.tags}
  image={getOGImagePath('posts', entry.id)}
>
```

- [ ] **Step 3: Pass image paths from note pages**

Update `src/pages/notes/[slug].astro`:

```ts
import { getOGImagePath } from "../../lib/og-image";
```

And in the layout call:

```astro
<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  tags={entry.data.tags}
  image={getOGImagePath('notes', entry.id)}
>
```

- [ ] **Step 4: Pass image paths from weeknote pages**

Update `src/pages/weeknotes/[slug].astro`:

```ts
import { getOGImagePath } from "../../lib/og-image";
```

And in the layout call:

```astro
<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  lastmod={entry.data.lastmod}
  tags={entry.data.tags}
  image={getOGImagePath('weeknotes', entry.id)}
>
```

- [ ] **Step 5: Verify generated HTML points at the OG route**

Run:

```bash
pnpm build && grep -R "og:image" dist/posts dist/notes dist/weeknotes | head -20
```

Expected: rendered pages contain `/open-graph/posts/...png`, `/open-graph/notes/...png`, and `/open-graph/weeknotes/...png` URLs.

- [ ] **Step 6: Commit the page wiring**

```bash
git add src/layouts/PostLayout.astro src/pages/posts/[slug].astro src/pages/notes/[slug].astro src/pages/weeknotes/[slug].astro
git commit -m "feat: publish OG image URLs for collection pages"
```

---

### Task 5: Validate spacing behavior with real content extremes

**Files:**

- Reference: `src/content/posts/**/index.mdx`
- Reference: `src/content/notes/**/index.mdx`
- Reference: `src/content/weeknotes/**/index.mdx`
- Temporary only if needed: throwaway content files removed after validation

- [ ] **Step 1: Pick real sample entries covering edge cases**

Use existing content to validate:

- one long-title post
- one note with no summary or short summary
- one weeknote with typical summary length

Example candidates visible in the repo today:

```text
src/content/posts/coming-around-on-the-utility-of-llms/index.mdx
src/content/weeknotes/week-20-2026/index.mdx
```

Pick an actual note file that lacks summary or has concise copy.

- [ ] **Step 2: Build and inspect the generated PNGs**

Run:

```bash
pnpm build
```

Then inspect the generated PNGs using the local file viewer or by opening paths from `dist/open-graph/...`.

Expected:

- title stays within its reserved zone
- summary stays below the separator
- date/site metadata remain readable
- no overlap between title and summary

- [ ] **Step 3: If needed, use a temporary stress-test entry**

If existing content does not cover the worst case, create a temporary content entry with an intentionally long title and summary, build once, inspect output, then remove it immediately.

Expected: no permanent test fixtures remain in the repo after validation.

- [ ] **Step 4: Rebuild after removing temporary fixtures**

Run:

```bash
pnpm build
```

Expected: clean successful build with only real site content.

- [ ] **Step 5: Commit final spacing adjustments**

```bash
git add src/lib/og-image.ts src/pages/open-graph/[...route].ts
git commit -m "fix: tune OG card spacing for real content"
```

---

### Task 6: Final verification

**Files:**

- Modify: any files touched above if final fixes are needed

- [ ] **Step 1: Run project checks**

Run:

```bash
pnpm astro check && pnpm build
```

Expected: both commands pass.

- [ ] **Step 2: Verify representative metadata output**

Run:

```bash
grep -R "twitter:image\|og:image" dist/posts dist/notes dist/weeknotes | head -20
```

Expected: both Open Graph and Twitter image tags point at generated OG images for collection pages.

- [ ] **Step 3: Review changed files**

Run:

```bash
git diff --stat HEAD~6..HEAD
```

Expected: diff only covers dependency updates, OG helpers, OG route, and page metadata wiring.

- [ ] **Step 4: Commit any last verification fixes**

```bash
git add package.json pnpm-lock.yaml src/lib/og-image.ts src/pages/open-graph/[...route].ts src/layouts/PostLayout.astro src/pages/posts/[slug].astro src/pages/notes/[slug].astro src/pages/weeknotes/[slug].astro
git commit -m "chore: finalize OG image generation"
```

---

## Self-review

- Spec coverage: covered build-time generation, collection-backed metadata, Option 3 spacing model, optional summary handling, and page metadata wiring.
- Placeholder scan: removed generic “test later” language; each task has concrete files and commands.
- Type consistency: plan consistently uses `title`, `date`, `summary`, `collection`, `collectionLabel`, and `getOGImagePath()`.
