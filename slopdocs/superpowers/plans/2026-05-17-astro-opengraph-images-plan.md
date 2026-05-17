# Astro OpenGraph Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current collection OG image implementation with `astro-opengraph-images` and a custom renderer that matches the approved framed two-zone design for posts, notes, and weeknotes.

**Architecture:** Add `astro-opengraph-images` as a build-time integration, filter it to collection entry routes, and implement a single custom Satori renderer that reads existing page metadata plus stable DOM hooks for date and collection type. Remove the `astro-og-canvas` route-based generation so the new integration is the only source of collection OG images.

**Tech Stack:** Astro 6, `astro-opengraph-images`, React for renderer authoring, Satori/resvg through the integration, TypeScript, local assets/fonts, pnpm.

---

## File structure

**Create**

- `src/og/renderers/collection-card.tsx` — shared custom renderer for posts/notes/weeknotes
- `src/og/utils.ts` — helpers for extracting collection kind/date/summary from route and DOM
- `src/assets/og/frame.png` or `src/assets/og/frame.svg` — final background/frame asset used by the renderer if needed

**Modify**

- `astro.config.mjs` — remove `astro-og-canvas` assumptions and add `astro-opengraph-images` integration
- `package.json` — swap dependencies: add `astro-opengraph-images` and `react`, remove `astro-og-canvas` and `canvaskit-wasm`
- `pnpm-lock.yaml` — lockfile update for dependency swap
- `src/components/BaseHead.astro` — keep `og:image` behavior aligned with `astro-opengraph-images` `getImagePath()` expectations
- `src/layouts/PostLayout.astro` — add stable DOM hook(s) for date/collection metadata if needed by the renderer
- `src/pages/posts/[slug].astro` — preserve metadata contract and pass collection info if required in DOM
- `src/pages/notes/[slug].astro` — preserve metadata contract and pass collection info if required in DOM
- `src/pages/weeknotes/[slug].astro` — preserve metadata contract and pass collection info if required in DOM
- `src/lib/og-image.ts` — remove if no longer needed after migration
- `src/pages/open-graph/[...route].ts` — delete old route-based implementation

**Reference**

- `src/content.config.ts` — confirms available fields (`title`, `date`, `summary`)
- `docs/superpowers/specs/2026-05-17-og-image-design.md` — approved target design
- `og_base.png` — inspiration only, not direct reuse

---

### Task 1: Swap dependencies and integration entry point

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Update dependencies in `package.json`**

Make these dependency changes:

```json
{
  "dependencies": {
    "astro-opengraph-images": "^0.12.0"
  },
  "devDependencies": {
    "react": "^19.1.1"
  }
}
```

Remove these packages if currently present:

```json
{
  "dependencies": {
    "astro-og-canvas": "REMOVE",
    "canvaskit-wasm": "REMOVE"
  }
}
```

Keep the rest of the manifest unchanged.

- [ ] **Step 2: Install the new packages and remove the old ones**

Run:

```bash
pnpm add astro-opengraph-images react && pnpm remove astro-og-canvas canvaskit-wasm
```

Expected: install/remove completes and `pnpm-lock.yaml` updates.

- [ ] **Step 3: Add the integration scaffold in `astro.config.mjs`**

Update imports and integrations list:

```js
import opengraphImages from "astro-opengraph-images";
```

And include it in `integrations` with a temporary placeholder config:

```js
opengraphImages({
  filter: ({ pathname }) =>
    pathname.startsWith("/posts/") ||
    pathname.startsWith("/notes/") ||
    pathname.startsWith("/weeknotes/"),
  options: {
    verbose: true,
    fonts: [],
  },
  render: async () => null,
});
```

This step is only to establish the integration shape; a later task replaces the placeholder renderer.

- [ ] **Step 4: Verify Astro still loads config**

Run:

```bash
pnpm astro --version
```

Expected: Astro CLI prints a version and exits successfully.

- [ ] **Step 5: Commit the dependency/integration swap scaffold**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs
git commit -m "build: switch OG generation to astro-opengraph-images"
```

---

### Task 2: Add stable page hooks for renderer data extraction

**Files:**

- Modify: `src/layouts/PostLayout.astro`
- Modify: `src/pages/posts/[slug].astro`
- Modify: `src/pages/notes/[slug].astro`
- Modify: `src/pages/weeknotes/[slug].astro`

- [ ] **Step 1: Extend `PostLayout` props with collection kind**

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
  collection?: "posts" | "notes" | "weeknotes";
}

const { title, description, date, lastmod, minutesRead, tags, image, collection } = Astro.props;
```

- [ ] **Step 2: Add stable DOM hooks in the rendered article header**

In `src/layouts/PostLayout.astro`, add non-visual hooks near the header, for example:

```astro
<meta itemprop="datePublished" content={date.toISOString()} />
{collection && <meta name="x-og-collection" content={collection} />}
```

And/or hidden elements:

```astro
<span hidden data-og-date={date.toISOString()}></span>
{collection && <span hidden data-og-collection={collection}></span>}
```

Keep these stable and easy for the custom renderer to query from built HTML.

- [ ] **Step 3: Pass collection kind from posts**

Update `src/pages/posts/[slug].astro`:

```astro
<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  lastmod={entry.data.lastmod}
  tags={entry.data.tags}
  collection="posts"
>
```

- [ ] **Step 4: Pass collection kind from notes**

Update `src/pages/notes/[slug].astro`:

```astro
<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  tags={entry.data.tags}
  collection="notes"
>
```

- [ ] **Step 5: Pass collection kind from weeknotes**

Update `src/pages/weeknotes/[slug].astro`:

```astro
<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  lastmod={entry.data.lastmod}
  tags={entry.data.tags}
  collection="weeknotes"
>
```

- [ ] **Step 6: Verify built HTML contains the hooks**

Run:

```bash
pnpm build && grep -R "x-og-collection\|data-og-collection\|datePublished\|data-og-date" dist/client/posts dist/client/notes dist/client/weeknotes | head -20
```

Expected: representative built collection pages include the added hooks.

- [ ] **Step 7: Commit the page hook changes**

```bash
git add src/layouts/PostLayout.astro src/pages/posts/[slug].astro src/pages/notes/[slug].astro src/pages/weeknotes/[slug].astro
git commit -m "feat: add stable OG renderer hooks to collection pages"
```

---

### Task 3: Implement renderer utilities

**Files:**

- Create: `src/og/utils.ts`

- [ ] **Step 1: Create path and metadata helpers**

Create `src/og/utils.ts` with focused helpers like:

```ts
export type CollectionKind = "posts" | "notes" | "weeknotes";

export function getCollectionKindFromPath(pathname: string): CollectionKind | null {
  if (pathname.startsWith("/posts/")) return "posts";
  if (pathname.startsWith("/notes/")) return "notes";
  if (pathname.startsWith("/weeknotes/")) return "weeknotes";
  return null;
}

export function getCollectionLabel(kind: CollectionKind): string {
  switch (kind) {
    case "posts":
      return "post";
    case "notes":
      return "note";
    case "weeknotes":
      return "weeknote";
  }
}

export function formatOGDate(input: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(input));
}
```

- [ ] **Step 2: Add DOM extraction helpers**

Extend `src/og/utils.ts` with helpers that accept the parsed DOM from the renderer input:

```ts
export function readMetaContent(document: Document, selector: string): string | undefined {
  const value = document.querySelector(selector)?.getAttribute("content");
  return value?.trim() || undefined;
}

export function readDate(document: Document): string | undefined {
  return (
    readMetaContent(document, 'meta[itemprop="datePublished"]') ??
    document.querySelector("[data-og-date]")?.getAttribute("data-og-date") ??
    undefined
  );
}

export function readCollection(document: Document): CollectionKind | undefined {
  const value =
    readMetaContent(document, 'meta[name="x-og-collection"]') ??
    document.querySelector("[data-og-collection]")?.getAttribute("data-og-collection") ??
    undefined;

  return value === "posts" || value === "notes" || value === "weeknotes" ? value : undefined;
}
```

- [ ] **Step 3: Verify the utility module is syntax-valid**

Run:

```bash
pnpm build
```

Expected: build proceeds past config loading and utility file imports without new failures.

- [ ] **Step 4: Commit the utility module**

```bash
git add src/og/utils.ts
git commit -m "feat: add OG renderer utility helpers"
```

---

### Task 4: Implement the custom collection renderer

**Files:**

- Create: `src/og/renderers/collection-card.tsx`
- Create or Modify: `src/assets/og/frame.svg` or `src/assets/og/frame.png`
- Reference: `og_base.png`
- Reference: `src/og/utils.ts`

- [ ] **Step 1: Create the renderer file scaffold**

Create `src/og/renderers/collection-card.tsx`:

```tsx
import type { RenderFunctionInput } from "astro-opengraph-images";
import {
  getCollectionKindFromPath,
  getCollectionLabel,
  formatOGDate,
  readCollection,
  readDate,
  readMetaContent,
} from "../utils";

export async function renderCollectionCard({
  pathname,
  document,
  title,
  description,
}: RenderFunctionInput): Promise<React.ReactNode> {
  const kind = readCollection(document) ?? getCollectionKindFromPath(pathname);
  const date = readDate(document);

  if (!title) {
    throw new Error(`Missing og:title for ${pathname}`);
  }

  return (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <p>{date ? formatOGDate(date) : ""}</p>
      <p>{kind ? getCollectionLabel(kind) : ""}</p>
    </div>
  );
}
```

Start minimal so the integration can compile before the full layout is introduced.

- [ ] **Step 2: Replace the minimal JSX with the approved framed layout**

Rework the renderer into the actual Option 3-inspired composition:

```tsx
return (
  <div
    style={{
      width: "1200px",
      height: "630px",
      display: "flex",
      position: "relative",
      background: "#14171D",
      color: "#F0F1F3",
      fontFamily: "Inter",
    }}
  >
    <img
      src={frameImageBase64}
      width="1200"
      height="630"
      style={{ position: "absolute", inset: 0 }}
    />

    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "74px",
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ color: "#9DE0D6", fontFamily: "JetBrains Mono", fontSize: 28 }}>
            msfjarvis.dev
          </div>
          <div style={{ color: "#C0C6D0", fontSize: 22 }}>{date ? formatOGDate(date) : ""}</div>
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 52,
            lineHeight: 1.05,
            maxHeight: "230px",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ width: "100%", height: 1, background: "#3B4252" }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "24px",
          }}
        >
          <div style={{ color: "#C0C6D0", fontSize: 22, maxWidth: "78%", lineHeight: 1.35 }}>
            {description ?? ""}
          </div>
          <div style={{ color: "#8F96A3", fontSize: 20, textTransform: "lowercase" }}>
            {kind ? getCollectionLabel(kind) : ""}
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

This is illustrative; ensure the final implementation uses valid Satori-supported CSS only.

- [ ] **Step 3: Load local frame/background assets correctly**

If using a local frame/background image, load it as base64 per the integration docs.

For example:

```tsx
import fs from "node:fs";
import path from "node:path";

const framePath = path.join(process.cwd(), "src", "assets", "og", "frame.png");
const frameImageBase64 = `data:image/png;base64,${fs.readFileSync(framePath).toString("base64")}`;
```

If using SVG, use the correct MIME type.

- [ ] **Step 4: Add graceful summary/date handling**

In the final renderer:

- omit summary text if not present
- keep lower zone visually stable when summary is missing
- omit date if extraction fails
- do not throw for missing date/summary

- [ ] **Step 5: Commit the renderer and asset work**

```bash
git add src/og/renderers/collection-card.tsx src/assets/og
git commit -m "feat: add collection OG card renderer"
```

---

### Task 5: Wire the renderer into Astro config and remove the old implementation

**Files:**

- Modify: `astro.config.mjs`
- Delete: `src/pages/open-graph/[...route].ts`
- Delete or Modify: `src/lib/og-image.ts`

- [ ] **Step 1: Import the renderer into `astro.config.mjs`**

Add:

```js
import opengraphImages from "astro-opengraph-images";
import { renderCollectionCard } from "./src/og/renderers/collection-card.tsx";
```

- [ ] **Step 2: Replace the placeholder config with the real integration config**

Configure it like:

```js
opengraphImages({
  filter: ({ pathname }) =>
    pathname.startsWith("/posts/") ||
    pathname.startsWith("/notes/") ||
    pathname.startsWith("/weeknotes/"),
  options: {
    verbose: true,
    fonts: [
      {
        name: "JetBrains Mono",
        weight: 600,
        style: "normal",
        data: fs.readFileSync(
          "node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff",
        ),
      },
      {
        name: "Inter",
        weight: 400,
        style: "normal",
        data: fs.readFileSync("node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"),
      },
    ],
  },
  render: renderCollectionCard,
});
```

Add `fs` import as required.

- [ ] **Step 3: Remove the old route-based implementation**

Delete:

```text
src/pages/open-graph/[...route].ts
```

If `src/lib/og-image.ts` is no longer used after migration, delete it too.

- [ ] **Step 4: Verify there are no stale imports**

Run:

```bash
grep -R "astro-og-canvas\|getOGImagePath\|loadOGPages\|renderCollectionCard" src astro.config.mjs
```

Expected: `astro-og-canvas` no longer appears; only the new renderer references remain.

- [ ] **Step 5: Commit the wiring and cleanup**

```bash
git add astro.config.mjs src/og/renderers/collection-card.tsx src/og/utils.ts src/layouts/PostLayout.astro src/pages/posts/[slug].astro src/pages/notes/[slug].astro src/pages/weeknotes/[slug].astro src/assets/og
git rm src/pages/open-graph/[...route].ts src/lib/og-image.ts || true
git commit -m "feat: generate collection OG images with astro-opengraph-images"
```

---

### Task 6: Align `og:image` metadata with the new integration

**Files:**

- Modify: `src/components/BaseHead.astro`
- Modify: `src/layouts/PostLayout.astro` if needed

- [ ] **Step 1: Check whether `BaseHead` still needs manual per-page image overrides**

Read the integration docs behavior and the generated output. If `astro-opengraph-images` expects `og:image` to come from its own `getImagePath()` convention, simplify `BaseHead` so collection pages do not manually pass route-based image overrides anymore.

Target shape if simplification is appropriate:

```astro
<meta property="og:image" content={new URL(image ?? '/default-og.png', Astro.url)} />
```

or, if using the package helper is required:

```astro
import { getImagePath } from 'astro-opengraph-images';
const openGraphImageUrl = image ?? getImagePath({ url: Astro.url, site: Astro.site });
```

Use the package’s real API requirements rather than guessing.

- [ ] **Step 2: Remove obsolete manual image wiring from collection pages if no longer needed**

If the integration automatically computes the path from page URL, remove the per-page `image={...}` props from:

- `src/pages/posts/[slug].astro`
- `src/pages/notes/[slug].astro`
- `src/pages/weeknotes/[slug].astro`

If manual image props are still needed, keep them but ensure they match the integration’s emitted file paths.

- [ ] **Step 3: Verify built HTML points to actual generated files**

Run:

```bash
pnpm build && grep -R "og:image\|twitter:image" dist/client/posts dist/client/notes dist/client/weeknotes | head -20
```

Expected: collection pages reference generated PNGs that exist in the build output.

- [ ] **Step 4: Commit metadata alignment**

```bash
git add src/components/BaseHead.astro src/layouts/PostLayout.astro src/pages/posts/[slug].astro src/pages/notes/[slug].astro src/pages/weeknotes/[slug].astro
git commit -m "fix: align collection metadata with generated OG image paths"
```

---

### Task 7: Validate the approved layout with real content extremes

**Files:**

- Reference: `dist/client/open-graph/**/*.png`
- Temporary only if needed: throwaway content fixtures removed after validation

- [ ] **Step 1: Build and inspect representative outputs**

Run:

```bash
pnpm build
```

Inspect at least:

- one long-title post
- one note with little or no summary
- one weeknote with a short summary

Examples already in the repo:

- `dist/client/open-graph/posts/coming-around-on-the-utility-of-llms.png`
- `dist/client/open-graph/notes/welcome-to-notes.png`
- `dist/client/open-graph/weeknotes/week-20-2026.png`

- [ ] **Step 2: Verify title and summary zones**

Confirm visually:

- title does not overlap the summary zone
- date stays in the top metadata area
- summary sits below the separator rule
- collection label is visible and unobtrusive

- [ ] **Step 3: Use a temporary stress-test entry only if existing content is insufficient**

If needed, create a temporary collection entry with an extreme title and summary, build once, inspect the resulting image, then delete the temporary content file immediately.

Expected: no permanent test fixtures remain after validation.

- [ ] **Step 4: Rebuild after removing temporary fixtures**

Run:

```bash
pnpm build
```

Expected: clean successful build with only real content.

- [ ] **Step 5: Commit final visual adjustments**

```bash
git add astro.config.mjs src/og/renderers/collection-card.tsx src/og/utils.ts src/assets/og src/layouts/PostLayout.astro src/components/BaseHead.astro src/pages/posts/[slug].astro src/pages/notes/[slug].astro src/pages/weeknotes/[slug].astro
git commit -m "fix: refine collection OG card layout"
```

---

### Task 8: Final verification

**Files:**

- Modify: any touched files if last fixes are required

- [ ] **Step 1: Run the full build verification**

Run:

```bash
pnpm build
```

Expected: successful build with generated collection OG images.

- [ ] **Step 2: Verify generated image files exist for all three collection types**

Run:

```bash
find dist/client/open-graph -type f | sed -n '1,20p'
```

Expected: files exist under `posts`, `notes`, and `weeknotes`.

- [ ] **Step 3: Verify collection HTML references those images**

Run:

```bash
grep -R "https://msfjarvis.dev/open-graph/" dist/client/posts dist/client/notes dist/client/weeknotes | head -20
```

Expected: built pages reference absolute OG image URLs for generated files.

- [ ] **Step 4: Review changed files**

Run:

```bash
git diff --stat
```

Expected: diff is limited to dependency swap, config, renderer, utilities, page hooks, and metadata alignment.

- [ ] **Step 5: Commit any final verification fixes**

```bash
git add -A
git commit -m "chore: finalize astro-opengraph-images migration"
```

---

## Self-review

- Spec coverage: plan covers replacing `astro-og-canvas`, adding `astro-opengraph-images`, filtering to collection routes, implementing the approved framed two-zone layout, preserving extensibility, and validating long-title/missing-summary cases.
- Placeholder scan: tasks contain explicit files, commands, and code sketches rather than generic “implement later” instructions.
- Type consistency: plan consistently uses `posts`, `notes`, `weeknotes`, `collection`, `summary`, `date`, and a single custom `renderCollectionCard` entry point.
