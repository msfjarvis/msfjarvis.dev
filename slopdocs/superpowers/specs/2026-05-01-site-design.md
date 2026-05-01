# Site Design Spec — msfjarvis.dev (Astro)

**Date:** 2026-05-01  
**Status:** Approved  
**Replaces:** Hugo + PaperMod at `../msfjarvis.dev`

---

## Overview

A minimalist personal blog and notes site for Harsh Shandilya, ported from Hugo to Astro. Design philosophy: reading-first, zero visual noise, no JS framework, no custom fonts. Aesthetic reference: [oat.ink](https://oat.ink/).

---

## Typography

All system fonts — zero font loading, zero flash, instant render.

| Role | Stack |
|---|---|
| Headings, post titles, dates, nav labels, section labels | `ui-monospace, 'Cascadia Code', 'Menlo', 'Consolas', monospace` |
| Body text, descriptions, prose | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Code blocks | Same as heading stack |

---

## Color System

Theme follows `prefers-color-scheme` automatically. No manual toggle.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#ffffff` | `#0f0f0f` |
| `--bg-subtle` | `#f7f7f7` | `#1a1a1a` |
| `--border` | `#e8e8e8` | `#2a2a2a` |
| `--text` | `#111111` | `#ebebeb` |
| `--text-2` | `#444444` | `#bbbbbb` |
| `--text-3` | `#888888` | `#666666` |
| `--accent` | `#7a3d6e` | `#c084b8` |
| `--accent-subtle` | `#e0c8db` | `#3a1f36` |

Dark mode uses a lighter mauve (`#c084b8`) so the accent holds contrast against the near-black background.

---

## Layout

- Max content width: `680px`, centered, `margin: 0 auto`
- Single-column throughout — no sidebars, no hero images
- Horizontal padding: `1rem` on mobile, `0` on wider viewports

---

## Navigation

```
msfjarvis.dev          posts · notes · weeknotes · now · about · uses
```

- Site name: monospace, bold, left-aligned, links to `/`
- Nav links: system-ui, right-aligned, `--text-2` colour
- Active link: `--accent` colour
- No hamburger menu — all links visible at all sizes (short enough to fit)

---

## Home Page

Sections in order:

1. **Nav bar** (see above)
2. **Bio block**
   - Name: monospace, `1rem`, bold, `--text`
   - Description: system-ui, `0.9rem`, `--text-2`, one line
3. **Section grid** — 2×2 CSS grid
   - Tiles: `posts`, `notes`, `weeknotes`, `now`
   - Each tile shows: label (monospace, bold, `--accent`) + descriptor (`--text-3`, e.g. "89 articles")
   - `uses` is intentionally excluded from the grid — it is a static page, not a content stream, reachable via nav only
4. **Recent posts** — labelled "Recent" (monospace, uppercase, muted)
   - Flat list of ~5 entries
   - Each row: post title (monospace, `--accent`, truncated) + date (monospace, `--text-3`)
   - Includes posts and weeknotes interleaved by date, excludes notes (notes have their own stream)

---

## Content Types & URLs

| Type | URL pattern | Astro collection | Notes |
|---|---|---|---|
| Long-form posts | `/posts/[slug]/` | `src/content/posts/` | |
| Short notes | `/notes/[slug]/` | `src/content/notes/` | |
| Weekly notes | `/weeknotes/week-[N]-[YYYY]/` | `src/content/weeknotes/` | New canonical — see migration below |
| Now page | `/now/` | `src/pages/now.astro` | Static Astro page, edited manually |
| About | `/about/` | `src/pages/about.astro` | Static Astro page |
| Uses | `/uses/` | `src/pages/uses.astro` | Static Astro page |

---

## Weeknotes URL Migration

Existing weeknotes in the Hugo site live at `/posts/weeknotes-week-N-YYYY/`. The new canonical URL scheme drops the redundant `weeknotes-` prefix from the slug.

**Old:** `/posts/weeknotes-week-1-2026`  
**New:** `/weeknotes/week-1-2026`

Redirects are handled by a dynamic Astro route at `src/pages/posts/[slug].astro`. At build time, `getStaticPaths()` queries the `weeknotes` collection and returns one path per entry, each emitting an HTTP 301 redirect response to the new canonical URL.

```ts
// src/pages/posts/[slug].astro
export async function getStaticPaths() {
  const weeknotes = await getCollection('weeknotes');
  return weeknotes.map((entry) => ({
    params: { slug: `weeknotes-${entry.id}` },  // e.g. weeknotes-week-1-2026
    props: { redirect: `/weeknotes/${entry.id}/` },
  }));
}
```

This is preferred over a `public/_redirects` file because:
- It stays in sync with the content collection automatically — no manual maintenance as new weeknotes are published
- Redirect logic lives in the codebase, not a separate config file
- Cloudflare Pages serves Astro's statically-generated redirect pages correctly

The old RSS items for weeknotes (previously at `/posts/weeknotes-week-N-YYYY/`) pointed to those URLs as `<guid>`. Feed readers that cached these entries will follow the 301 and update. New entries in `/weeknotes/rss.xml` will have the new `/weeknotes/week-N-YYYY/` GUIDs.

---

## Post / Note Page

- **Title:** monospace, large (`1.4rem`), `--text`, tight line-height
- **Meta line:** monospace, `0.75rem`, `--text-3` — date + reading time
- Thin `<hr>` divider
- **Prose body:** system-ui, `1rem`, `1.75` line-height, `--text-2`
- **Inline links:** `--accent`, no underline by default, `1px solid --accent-subtle` border-bottom
- **Code blocks:** monospace, `--bg-subtle` background, `1px solid --border`, `4px` radius, `--text-2`
- **Headings in prose:** monospace, bold, `--text`

---

## Weeknotes List Page (`/weeknotes/`)

Reverse-chronological list. Each entry shows:
- Title (monospace, `--accent`)
- Date (monospace, `--text-3`)
- Summary/first sentence (system-ui, `--text-2`)

---

## Sveltia CMS

Available at `/admin`. Serves as a GUI for editing content backed by GitHub.

**Implementation in Astro:**
- `src/pages/admin/index.astro` — imports `@sveltia/cms` from the NPM package
- `public/admin/config.yml` — CMS collection config (adapted from Hugo version)
- `src/pages/admin/custom.js` — custom editor components + tombstone hook (adapted from Hugo site)

The `index.astro` replaces the CDN `<script src="https://unpkg.com/…">` with a bundled NPM import so Astro handles versioning.

**Adaptations required from the Hugo version:**

**Figure component:** The Hugo shortcode `{{< figure src="..." alt="..." >}}` is replaced by an MDX `<Figure>` component. The Sveltia editor component is rewritten to emit `<Figure src="/posts/[slug]/image.jpg" alt="..." title="..." />` syntax.

Images are stored in `public/posts/[slug]/` (and equivalently `public/notes/[slug]/`, `public/weeknotes/[slug]/`), not in the content bundle. This gives every image two simultaneous URLs:
- **Stable public URL** — e.g. `/posts/my-post/image.jpg` — the file served directly from `public/`, used by the CMS for preview
- **Optimized URL** — `/_astro/image.<hash>.webp` — what Astro's `<Image>` component emits in the rendered HTML

Astro's `<Image>` accepts a public path string and runs it through the optimization pipeline while leaving the original file in `public/` untouched. The `<Figure>` component uses `<Image>` internally.

The Sveltia CMS config is updated accordingly:
```yaml
media_folder: "public/posts/{{slug}}"
public_folder: "/posts/{{slug}}"
```
(mirrored for notes and weeknotes collections)

**Tombstone hook:** The `deleted` frontmatter field is preserved with the same semantics — it marks a post as intentionally removed, which signals the WebMentions service. The Hugo-specific side effects (`build.render = 'never'`, `sitemap.disable = true`) are replaced with Astro equivalents: a `deleted: true` post is excluded from all collection queries, excluded from the sitemap, and its route returns HTTP 410 Gone. The `normalizeBlogEntryForSave` function is rewritten to set/clear only the `deleted` field.

**Collections to define in `config.yml`:**

| Collection | Folder | Slug pattern |
|---|---|---|
| Blog | `src/content/posts` | `{{slug}}` |
| Notes | `src/content/notes` | `{{slug}}` |
| Weeknotes | `src/content/weeknotes` | `week-{{week}}-{{year}}` |
| Pages | `src/content/pages` | `{{slug}}` |

Frontmatter format: YAML (Astro default, replacing TOML used in Hugo).

GitHub backend, repo: `msfjarvis/site-2` (to be confirmed when repo is renamed/created).

R2 media library config carries over unchanged from the Hugo site.

---

## CSS Architecture

- Single `src/styles/global.css` — defines all CSS custom properties and base styles
- Component-scoped `<style>` blocks in Astro files for layout-specific rules
- No Tailwind, no CSS-in-JS, no utility framework
- Vanilla CSS only — Grid and Flexbox for layout

---

## JavaScript

No JS framework. No client-side JS at all on the public-facing site unless a specific need arises. The only JS is:
- Sveltia CMS (admin only, not shipped to readers)
- `custom.js` / `tombstone.js` (admin only)

---

## MDX Components

The following Hugo shortcodes need Astro equivalents. All files that use them will become `.mdx` instead of `.md`.

### `<Figure>` (active — 1 post, 4 usages)

Replaces Hugo's built-in `{{< figure src="..." title="..." >}}`.

```astro
<!-- src/components/Figure.astro -->
<figure>
  <img src={src} alt={alt ?? ''} />
  {title && <figcaption>{title}</figcaption>}
</figure>
```

Images stored in `public/posts/[slug]/`. The `src` prop is an absolute path (`/posts/[slug]/image.jpg`). No Astro optimization pipeline — `public/` files are copied as-is per the Astro docs: *"always served or copied as-is, without transform or bundling"*. Passing a string path to `<Image>` produces an unoptimized plain `<img>`, so a plain `<figure>/<img>` is used directly.

The Sveltia CMS editor component is rewritten to emit `<Figure src="/posts/[slug]/image.jpg" alt="..." title="..." />` syntax instead of the Hugo shortcode.

### `<Asciinema>` (active — 3 posts, 7 usages)

Replaces `{{< asciinema ID >}}`.

```astro
<!-- src/components/Asciinema.astro -->
<div style="margin-top: 2em; margin-bottom: 2em; text-align: center">
  <script src={`https://asciinema.org/a/${id}.js`} id={`asciicast-${id}`} async />
</div>
```

Takes a single `id` prop (the asciinema cast ID string).

### Trivial shortcodes — no component needed

| Hugo shortcode | MDX replacement | Posts affected |
|---|---|---|
| `{{< horizontal_line >}}` | Native `<hr>` or `---` | 3 posts |
| `{{< sub "text" >}}` | Native `<sub>text</sub>` | 1 post |
| `{{< gfycat ID >}}` | Delete — 0 usages, service is defunct | 0 posts |

These are handled as a find-and-replace during content migration, not as reusable components.

---

## Webmentions Manifest

The Hugo site generates `/webmentions-manifest.json` via `layouts/index.webmentions-manifest.json.json`. An external tool parses this file to manage webmentions. It must be ported as an Astro API endpoint.

**Output format:**
```json
{
  "schemaVersion": 1,
  "siteOrigin": "https://msfjarvis.dev",
  "generatedAt": "2026-05-01T12:00:00Z",
  "entries": [
    { "source": "content/posts/my-post/index.md", "url": "https://msfjarvis.dev/posts/my-post/" }
  ]
}
```

**Implementation:** `src/pages/webmentions-manifest.json.ts` as a static Astro endpoint.

- Queries the `posts` and `notes` collections (matching the Hugo template's `if in (slice "posts" "notes") .Section` filter — weeknotes are excluded)
- `source` field: file path relative to repo root, e.g. `src/content/posts/my-post/index.mdx`
- `url` field: full permalink constructed from `SITE_URL + /posts/[slug]/`
- `generatedAt`: `new Date().toISOString()` at build time

---

## Deployment

- **Host:** Cloudflare Pages
- **Redirects:** `public/_redirects` (Cloudflare Pages format)
- **Build command:** `astro build`
- **Output directory:** `dist/`
- **RSS feed:** `/rss.xml` via `@astrojs/rss`

### RSS `<guid>` compatibility

Hugo emits `<guid>{{ .Permalink }}</guid>` — the full canonical URL. `@astrojs/rss` derives `<guid isPermaLink="true">` from the item's `link` field, resolved to a full canonical URL. These are equivalent; existing feed subscribers will not see old posts re-appear as long as the `link` field maps to the same URL structure (`/posts/[slug]/`, `/weeknotes/week-[N]-[YYYY]/`).

### RSS feed filtering

The global `/rss.xml` feed includes only the `posts` collection. Exclusion rules:
- `deleted: true` entries are excluded
- Notes are excluded — they have their own `/notes/rss.xml`
- Weeknotes are excluded — they have their own `/weeknotes/rss.xml`

This is a deliberate change from Hugo, where weeknotes lived in the `posts` section and appeared in the global feed. Moving them to their own collection removes them from the global feed cleanly.

**Per-collection feeds:**
| Feed | URL | Collections included |
|---|---|---|
| Global | `/rss.xml` | `posts` only |
| Notes | `/notes/rss.xml` | `notes` only |
| Weeknotes | `/weeknotes/rss.xml` | `weeknotes` only |
