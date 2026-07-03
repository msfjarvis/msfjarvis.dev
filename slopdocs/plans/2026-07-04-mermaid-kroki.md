# Mermaid to Kroki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mermaid/JSDOM build-time rendering with Kroki-backed SVG generation while preserving site lightbox UX and producing feed-safe static light-mode SVG.

**Architecture:** Keep `src/remark/remark-mermaid.ts` as the single markdown integration point. Rewrite `src/lib/render-mermaid.ts` to POST Mermaid source to `https://kroki.io/mermaid/svg`, then extend `src/lib/feed.ts` cleanup to flatten Mermaid lightboxes into one static inline SVG with concrete light-theme colors. Remove obsolete Mermaid-specific dependency and config.

**Tech Stack:** Astro, MDX, unified remark plugin, Node `fetch`, Cheerio, pnpm

## Global Constraints

- Preserve fenced `mermaid` code block authoring with no syntax changes.
- Preserve the on-site lightbox UX for Mermaid diagrams.
- Feed output must contain plain static inline SVG for Mermaid diagrams.
- Feed diagrams must render legibly in light mode without JavaScript.
- Kroki base URL is exactly `https://kroki.io`.
- Kroki/network/rendering errors must fail the build hard.
- Remove Mermaid-specific JSDOM/runtime setup from the repo.

---

## File structure

- `src/lib/render-mermaid.ts`
  - Sole responsibility: render Mermaid source to inline SVG via Kroki and validate errors.
- `src/remark/remark-mermaid.ts`
  - Sole responsibility: find Mermaid fences, call renderer, and wrap SVG in the existing lightbox HTML.
- `src/lib/feed.ts`
  - Sole responsibility for this feature: flatten Mermaid lightbox markup to a single static feed-safe SVG during feed HTML cleanup.
- `astro.config.mjs`
  - Remove Mermaid-specific SSR config no longer needed after the renderer swap.
- `package.json`
  - Remove unused Mermaid dependency.
- `pnpm-lock.yaml`
  - Lockfile update after dependency removal.

### Task 1: Replace the Mermaid renderer with a Kroki-backed helper

**Files:**

- Modify: `src/lib/render-mermaid.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `renderMermaidDiagram(source: string): Promise<string>` call sites from `src/remark/remark-mermaid.ts`
- Produces: `export async function renderMermaidDiagram(source: string): Promise<string>` returning validated inline SVG with `class="mermaid-diagram"`

- [ ] **Step 1: Rewrite `src/lib/render-mermaid.ts` to use Kroki**

```ts
const KROKI_BASE_URL = "https://kroki.io";
const KROKI_RENDER_URL = `${KROKI_BASE_URL}/mermaid/svg`;
const REQUEST_TIMEOUT_MS = 15000;

function ensureSvgDocument(svg: string): string {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg") || !trimmed.includes("</svg>")) {
    throw new Error("Kroki returned invalid SVG markup");
  }
  return trimmed.includes('class="')
    ? trimmed.replace(
        /<svg\b([^>]*?)class="([^"]*)"([^>]*)>/,
        '<svg$1class="$2 mermaid-diagram"$3>',
      )
    : trimmed.replace("<svg", '<svg class="mermaid-diagram"');
}

export async function renderMermaidDiagram(source: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(KROKI_RENDER_URL, {
      method: "POST",
      headers: {
        Accept: "image/svg+xml",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: source,
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(
        `Kroki request failed with ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
      );
    }

    return ensureSvgDocument(body);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Kroki request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: Remove the Mermaid dependency from `package.json`**

```json
{
  "dependencies": {
    "@astrojs/markdown-remark": "^7.2.0",
    "remark-gfm": "^4.0.1",
    "remark-github-blockquote-alert": "^2.1.0"
  }
}
```

Expected: the `mermaid` dependency entry is removed and no new runtime dependency is added for Kroki.

- [ ] **Step 3: Update the lockfile**

Run: `pnpm install`
Expected: `pnpm-lock.yaml` no longer contains the top-level `mermaid` dependency entry.

- [ ] **Step 4: Verify the renderer file typechecks through the build toolchain**

Run: `pnpm run build`
Expected: build may still fail later on feed behavior, but there is no error from JSDOM/Mermaid imports and no unresolved `mermaid` package import.

- [ ] **Step 5: Commit**

```bash
git add src/lib/render-mermaid.ts package.json pnpm-lock.yaml
git commit -m "refactor: render mermaid diagrams with kroki"
```

### Task 2: Keep the remark integration stable while improving render errors

**Files:**

- Modify: `src/remark/remark-mermaid.ts`

**Interfaces:**

- Consumes: `renderMermaidDiagram(source: string): Promise<string>` from `src/lib/render-mermaid.ts`
- Produces: Mermaid code fences replaced by existing lightbox HTML; errors include source file path context

- [ ] **Step 1: Review and minimally update the plugin error handling if needed**

```ts
.catch((error) => {
  const location = file.path ?? file.history.at(0) ?? "unknown file";
  throw new Error(
    `Failed to render Mermaid diagram in ${location}: ${error instanceof Error ? error.message : String(error)}`,
  );
})
```

Expected: the plugin still wraps renderer failures with file path context and no Mermaid fence authoring behavior changes.

- [ ] **Step 2: Verify existing Mermaid wrapper HTML stays unchanged for site UX**

Run: `rg -n "mermaid-modal|mermaid-modal__open-button|data-mermaid-modal-root" src/remark/remark-mermaid.ts`
Expected: existing preview/lightbox structure remains present.

- [ ] **Step 3: Run a build-path check using existing Mermaid content**

Run: `pnpm run build`
Expected: Mermaid-bearing content now renders through Kroki; any failure should mention `Failed to render Mermaid diagram in <path>`.

- [ ] **Step 4: Commit**

```bash
git add src/remark/remark-mermaid.ts
git commit -m "chore: preserve mermaid remark integration"
```

### Task 3: Flatten Mermaid lightboxes into feed-safe static SVG

**Files:**

- Modify: `src/lib/feed.ts`

**Interfaces:**

- Consumes: rendered HTML containing `.mermaid-modal` wrappers and inline SVG from `src/remark/remark-mermaid.ts`
- Produces: `renderEntryHtml(...): Promise<string>` where feed HTML contains one inline Mermaid SVG, no Mermaid button/modal/script markup, and no CSS variable dependency for diagram legibility

- [ ] **Step 1: Add a helper that rewrites Mermaid lightboxes for feeds**

```ts
function concretizeMermaidSvgForFeeds(svgHtml: string): string {
  return svgHtml
    .replaceAll("var(--bg)", "#ffffff")
    .replaceAll("var(--bg-subtle)", "#f7f7f7")
    .replaceAll("var(--border)", "#e8e8e8")
    .replaceAll("var(--text)", "#111111")
    .replaceAll("var(--text-2)", "#444444")
    .replaceAll("var(--accent)", "#7a3d6e")
    .replaceAll("var(--accent-subtle)", "#e0c8db");
}

function flattenMermaidLightboxes(html: string): string {
  const $ = load(html);
  $("[data-mermaid-modal-root]").each((_, root) => {
    const $root = $(root);
    const svgHtml = $root.find(".mermaid-modal__preview svg").first().prop("outerHTML");
    if (!svgHtml) {
      throw Error("Failed to extract Mermaid SVG for feeds, has the layout changed?");
    }
    $root.replaceWith(concretizeMermaidSvgForFeeds(svgHtml));
  });
  $("script").remove();
  return $.html();
}
```

- [ ] **Step 2: Call the Mermaid cleanup from `renderEntryHtml()` after lightbox cleanup**

```ts
let html = await container.renderToString(Content);
html = removeLightboxDuplicates(html);
html = flattenMermaidLightboxes(html);
const $doc = load(html);
html = $doc("body").html() ?? html;
return absolutizeUrls(html, origin);
```

- [ ] **Step 3: Verify feed cleanup behavior directly**

Run: `pnpm run build`
Expected: build succeeds and generated feed content has no `data-mermaid-modal-root`, no `mermaid-modal__open-button`, and no inline Mermaid lightbox script.

- [ ] **Step 4: Inspect the generated feed output for the existing Mermaid post**

Run: `rg -n "mermaid-modal|data-mermaid-modal-root|var\(--|<svg class=\"mermaid-diagram\"" dist src | head -n 40`
Expected:

- site HTML may still contain Mermaid modal markup
- feed output contains `<svg class="mermaid-diagram"`
- feed output does not contain `mermaid-modal` markup
- feed output does not contain `var(--` inside preserved Mermaid SVG markup

- [ ] **Step 5: Commit**

```bash
git add src/lib/feed.ts
git commit -m "feat: flatten mermaid diagrams for feeds"
```

### Task 4: Remove obsolete Mermaid-specific Astro/Vite config and run end-to-end verification

**Files:**

- Modify: `astro.config.mjs`

**Interfaces:**

- Consumes: existing Astro config
- Produces: config without Mermaid-specific SSR externals while preserving global `remarkMermaid` registration

- [ ] **Step 1: Remove obsolete Mermaid SSR externals from `astro.config.mjs`**

```js
ssr: {
  external: ["@resvg/resvg-js"],
},
```

Expected: `"mermaid"` is removed from `vite.ssr.external` and markdown processor registration remains unchanged.

- [ ] **Step 2: Run the full verification build**

Run: `pnpm run build`
Expected: successful build with no Mermaid import/runtime errors and Mermaid-bearing pages rendered through Kroki.

- [ ] **Step 3: Verify the site output still has lightbox UX hooks**

Run: `rg -n "data-mermaid-modal-root|mermaid-modal__open-button" dist`
Expected: page HTML still includes Mermaid lightbox hooks.

- [ ] **Step 4: Verify feed output has static light-mode SVG only**

Run: `rg -n "content:encoded|<svg class=\"mermaid-diagram\"|data-mermaid-modal-root|mermaid-modal__open-button|var\(--" dist`
Expected: at least one feed item includes Mermaid SVG; feed output has no Mermaid modal hooks and no CSS-variable-based Mermaid theming.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs
git commit -m "chore: remove obsolete mermaid build config"
```

## Self-review

- **Spec coverage:**
  - Kroki-backed renderer: Task 1
  - Preserve existing remark integration and file-contextual errors: Task 2
  - Feed-safe static light-mode SVG: Task 3
  - Remove obsolete config and verify end-to-end behavior: Task 4
  - Hard-fail build behavior is covered in Tasks 1, 2, and 4 verification steps
- **Placeholder scan:** No TBD/TODO markers or deferred “implement later” steps remain.
- **Type consistency:** The plan consistently uses `renderMermaidDiagram(source: string): Promise<string>` and `renderEntryHtml(...): Promise<string>`.
