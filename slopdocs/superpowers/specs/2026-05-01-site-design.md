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

Redirects are handled via a `public/_redirects` file (Cloudflare Pages native format, identical to Netlify's):

```
/posts/weeknotes-week-1-2026   /weeknotes/week-1-2026   301
/posts/weeknotes-week-2-2026   /weeknotes/week-2-2026   301
# … one line per entry
```

These will be generated at build time from the weeknotes content collection rather than maintained by hand.

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

**Figure component:** The Hugo shortcode `{{< figure src="..." alt="..." >}}` is replaced by an MDX `<Figure>` component. The Sveltia editor component is rewritten to emit `<Figure src="./image.jpg" alt="..." title="..." />` syntax.

Images are stored in the post bundle alongside `index.mdx` (e.g. `src/content/posts/my-post/image.jpg`). Astro's `<Image>` optimization pipeline must **not** be used for these — it rewrites filenames to pseudorandom hashes, breaking stable URLs. The `<Figure>` component renders a plain `<img>` tag directly, bypassing the pipeline. Image filenames remain exactly as uploaded via the CMS.

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

## Deployment

- **Host:** Cloudflare Pages
- **Redirects:** `public/_redirects` (Cloudflare Pages format)
- **Build command:** `astro build`
- **Output directory:** `dist/`
- **RSS feed:** `/rss.xml` (Astro's built-in RSS support)
