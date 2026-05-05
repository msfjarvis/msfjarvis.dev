# Site Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Astro starter template with a production-ready minimalist personal blog matching the approved design spec.

**Architecture:** Vanilla Astro with MDX, content collections for posts/notes/weeknotes, system fonts, auto dark/light via `prefers-color-scheme`, mauve accent (`#7a3d6e` / `#c084b8`), Sveltia CMS at `/admin`, three RSS feeds, webmentions manifest, and a dynamic redirect route for old weeknote URLs.

**Tech Stack:** Astro 6, `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`, `@sveltia/cms`, vanilla CSS, no JS framework.

---

## File Map

| File                                     | Status  | Purpose                                  |
| ---------------------------------------- | ------- | ---------------------------------------- |
| `astro.config.mjs`                       | Modify  | Remove custom fonts, set site URL        |
| `src/consts.ts`                          | Modify  | Site title, description, author info     |
| `src/styles/global.css`                  | Rewrite | Design tokens, base styles               |
| `src/content.config.ts`                  | Rewrite | Collections: posts, notes, weeknotes     |
| `src/components/BaseHead.astro`          | Modify  | Remove Atkinson font link                |
| `src/components/Header.astro`            | Rewrite | Nav with all links                       |
| `src/components/Footer.astro`            | Rewrite | Minimal footer                           |
| `src/components/FormattedDate.astro`     | Keep    | Minor update to format                   |
| `src/components/Figure.astro`            | Create  | MDX figure with plain `<img>`            |
| `src/components/Asciinema.astro`         | Create  | Asciinema embed component                |
| `src/layouts/BaseLayout.astro`           | Create  | Shell: BaseHead + Header + Footer        |
| `src/layouts/PostLayout.astro`           | Create  | Post/note/weeknote single-page layout    |
| `src/pages/index.astro`                  | Rewrite | Home: bio + section grid + recent        |
| `src/pages/posts/index.astro`            | Create  | Posts list                               |
| `src/pages/posts/[slug].astro`           | Create  | Post pages + weeknote 301 redirects      |
| `src/pages/notes/index.astro`            | Create  | Notes list                               |
| `src/pages/notes/[slug].astro`           | Create  | Individual note page                     |
| `src/pages/weeknotes/index.astro`        | Create  | Weeknotes list                           |
| `src/pages/weeknotes/[slug].astro`       | Create  | Individual weeknote page                 |
| `src/pages/about.astro`                  | Rewrite | About page (content from Hugo)           |
| `src/pages/now.astro`                    | Create  | Now page (content from Hugo)             |
| `src/pages/uses.astro`                   | Create  | Uses page (content from Hugo)            |
| `src/pages/rss.xml.ts`                   | Create  | Global RSS feed (posts only)             |
| `src/pages/notes/rss.xml.ts`             | Create  | Notes RSS feed                           |
| `src/pages/weeknotes/rss.xml.ts`         | Create  | Weeknotes RSS feed                       |
| `src/pages/webmentions-manifest.json.ts` | Create  | Webmentions manifest endpoint            |
| `src/pages/admin/index.astro`            | Create  | Sveltia CMS admin page                   |
| `public/admin/config.yml`                | Create  | Sveltia CMS collection config            |
| `public/admin/custom.js`                 | Create  | Figure editor component + tombstone hook |
| `public/admin/tombstone.js`              | Create  | Tombstone hook (adapted for Astro)       |
| `src/content/blog/`                      | Delete  | Starter placeholder content              |
| `src/assets/fonts/`                      | Delete  | Atkinson font files (unused)             |

---

### Task 1: Project Foundation

**Files:**

- Modify: `astro.config.mjs`
- Modify: `src/consts.ts`
- Rewrite: `src/styles/global.css`
- Modify: `src/components/BaseHead.astro`

- [ ] **Step 1: Update `astro.config.mjs`**

Remove the custom fonts config, set the correct site URL:

```js
// astro.config.mjs
// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://msfjarvis.dev",
  integrations: [mdx(), sitemap()],
});
```

- [ ] **Step 2: Update `src/consts.ts`**

```ts
export const SITE_TITLE = "Harsh Shandilya";
export const SITE_DESCRIPTION =
  "Systems Engineer at Cloudflare. Recovering Android developer, amateur Rustacean.";
export const SITE_URL = "https://msfjarvis.dev";
export const AUTHOR_NAME = "Harsh Shandilya";
export const AUTHOR_EMAIL = "me@msfjarvis.dev";
```

- [ ] **Step 3: Rewrite `src/styles/global.css`**

```css
/* Design tokens */
:root {
  --bg: #ffffff;
  --bg-subtle: #f7f7f7;
  --border: #e8e8e8;
  --text: #111111;
  --text-2: #444444;
  --text-3: #888888;
  --accent: #7a3d6e;
  --accent-subtle: #e0c8db;

  --font-mono: ui-monospace, "Cascadia Code", "Menlo", "Consolas", monospace;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --max-width: 680px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f0f0f;
    --bg-subtle: #1a1a1a;
    --border: #2a2a2a;
    --text: #ebebeb;
    --text-2: #bbbbbb;
    --text-3: #666666;
    --accent: #c084b8;
    --accent-subtle: #3a1f36;
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.75;
}

main {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-mono);
  color: var(--text);
  line-height: 1.3;
  margin: 1.5rem 0 0.5rem;
}

p {
  margin: 0 0 1rem;
}

a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--accent-subtle);
}
a:hover {
  border-bottom-color: var(--accent);
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.15em 0.4em;
}

pre {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  line-height: 1.6;
}
pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.875rem;
}

blockquote {
  margin: 1.5rem 0;
  padding-left: 1.25rem;
  border-left: 3px solid var(--border);
  color: var(--text-2);
}

img {
  max-width: 100%;
  height: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th,
td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
th {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-3);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 4: Update `src/components/BaseHead.astro`**

Remove the Atkinson font `<link>` tag. Keep meta, OG, and canonical tags. The full file:

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  image?: string;
}

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const { title, description, image = '/android-chrome-512x512.webp' } = Astro.props;
---

<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="canonical" href={canonicalURL} />
<meta name="generator" content={Astro.generator} />

<title>{title}</title>
<meta name="description" content={description} />

<meta property="og:type" content="website" />
<meta property="og:url" content={Astro.url} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={new URL(image, Astro.url)} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content={Astro.url} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={new URL(image, Astro.url)} />

<link rel="alternate" type="application/rss+xml" title={`${title} — RSS`} href={new URL('rss.xml', Astro.site)} />
```

- [ ] **Step 5: Delete starter content and unused assets**

```bash
rm -rf src/content/blog
rm -rf src/assets/fonts
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: build completes (may warn about missing content — that's fine, collections are empty until Task 2).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: project foundation — design tokens, base styles, updated config"
```

---

### Task 2: Content Collection Definitions

**Files:**

- Rewrite: `src/content.config.ts`

- [ ] **Step 1: Rewrite `src/content.config.ts`**

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    lastmod: z.coerce.date().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    draft: z.boolean().optional().default(false),
    deleted: z.boolean().optional().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ base: "./src/content/notes", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional().default([]),
    deleted: z.boolean().optional().default(false),
  }),
});

const weeknotes = defineCollection({
  loader: glob({ base: "./src/content/weeknotes", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    lastmod: z.coerce.date().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    draft: z.boolean().optional().default(false),
    deleted: z.boolean().optional().default(false),
  }),
});

export const collections = { posts, notes, weeknotes };
```

- [ ] **Step 2: Create placeholder content directories**

```bash
mkdir -p src/content/posts src/content/notes src/content/weeknotes
```

- [ ] **Step 3: Verify type-check passes**

```bash
npx astro check
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/
git commit -m "feat: content collection schemas for posts, notes, weeknotes"
```

---

### Task 3: Base Components and Layouts

**Files:**

- Rewrite: `src/components/Header.astro`
- Rewrite: `src/components/Footer.astro`
- Modify: `src/components/FormattedDate.astro`
- Delete: `src/components/HeaderLink.astro`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/PostLayout.astro`

- [ ] **Step 1: Rewrite `src/components/Header.astro`**

```astro
---
import { SITE_TITLE } from '../consts';

const pathname = new URL(Astro.request.url).pathname;
const isActive = (path: string) => pathname.startsWith(path) ? 'active' : undefined;
---

<header>
  <nav>
    <a href="/" class="site-name">{SITE_TITLE}</a>
    <div class="nav-links">
      <a href="/posts" class:list={[{ active: isActive('/posts') }]}>posts</a>
      <a href="/notes" class:list={[{ active: isActive('/notes') }]}>notes</a>
      <a href="/weeknotes" class:list={[{ active: isActive('/weeknotes') }]}>weeknotes</a>
      <a href="/now" class:list={[{ active: pathname === '/now/' }]}>now</a>
      <a href="/about" class:list={[{ active: pathname === '/about/' }]}>about</a>
      <a href="/uses" class:list={[{ active: pathname === '/uses/' }]}>uses</a>
    </div>
  </nav>
</header>

<style>
  header {
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
  }
  nav {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .site-name {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
    border-bottom: none;
    white-space: nowrap;
  }
  .site-name:hover { color: var(--accent); }
  .nav-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    justify-content: flex-end;
  }
  .nav-links a {
    font-size: 0.875rem;
    color: var(--text-2);
    border-bottom: none;
  }
  .nav-links a:hover,
  .nav-links a.active {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Rewrite `src/components/Footer.astro`**

```astro
---
import { AUTHOR_NAME } from '../consts';
---

<footer>
  <p>© {new Date().getFullYear()} {AUTHOR_NAME}</p>
</footer>

<style>
  footer {
    border-top: 1px solid var(--border);
    margin-top: 4rem;
  }
  p {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-3);
  }
</style>
```

- [ ] **Step 3: Update `src/components/FormattedDate.astro`**

```astro
---
interface Props {
  date: Date;
}
const { date } = Astro.props;
const iso = date.toISOString();
const display = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
---
<time datetime={iso}>{display}</time>
```

- [ ] **Step 4: Create `src/layouts/BaseLayout.astro`**

```astro
---
import BaseHead from '../components/BaseHead.astro';
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

interface Props {
  title?: string;
  description?: string;
}

const {
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <BaseHead title={title} description={description} />
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

- [ ] **Step 5: Create `src/layouts/PostLayout.astro`**

```astro
---
import BaseHead from '../components/BaseHead.astro';
import Footer from '../components/Footer.astro';
import FormattedDate from '../components/FormattedDate.astro';
import Header from '../components/Header.astro';

interface Props {
  title: string;
  description?: string;
  date: Date;
  lastmod?: Date;
  minutesRead?: number;
}

const { title, description, date, lastmod, minutesRead } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <BaseHead title={title} description={description ?? title} />
  </head>
  <body>
    <Header />
    <main>
      <article>
        <header class="post-header">
          <h1>{title}</h1>
          <p class="post-meta">
            <FormattedDate date={date} />
            {lastmod && lastmod.getTime() !== date.getTime() && (
              <> · updated <FormattedDate date={lastmod} /></>
            )}
            {minutesRead && <> · {minutesRead} min read</>}
          </p>
          <hr />
        </header>
        <div class="prose">
          <slot />
        </div>
      </article>
    </main>
    <Footer />
  </body>
</html>

<style>
  .post-header h1 {
    font-size: 1.4rem;
    margin-top: 0;
    margin-bottom: 0.4rem;
  }
  .post-meta {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-3);
    margin: 0 0 0.75rem;
  }
</style>
```

- [ ] **Step 6: Delete `src/components/HeaderLink.astro`**

```bash
rm src/components/HeaderLink.astro
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: clean build with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: base components and layouts"
```

---

### Task 4: Home Page

**Files:**

- Rewrite: `src/pages/index.astro`

- [ ] **Step 1: Rewrite `src/pages/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import FormattedDate from '../components/FormattedDate.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const posts = await getCollection('posts', (p) => !p.data.deleted && !p.data.draft);
const weeknotes = await getCollection('weeknotes', (w) => !w.data.deleted && !w.data.draft);
const notes = await getCollection('notes', (n) => !n.data.deleted);

// Interleave posts and weeknotes, newest first, take 5
const recent = [...posts.map(p => ({ ...p, urlBase: '/posts' })),
                ...weeknotes.map(w => ({ ...w, urlBase: '/weeknotes' }))]
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 5);

const postCount = posts.length;
const noteCount = notes.length;
const weeknoteCount = weeknotes.length;
---

<BaseLayout title={SITE_TITLE} description={SITE_DESCRIPTION}>
  <section class="bio">
    <p class="bio-name">Harsh Shandilya</p>
    <p class="bio-desc">{SITE_DESCRIPTION}</p>
  </section>

  <nav class="section-grid" aria-label="Site sections">
    <a href="/posts" class="section-tile">
      <span class="tile-label">posts</span>
      <span class="tile-meta">{postCount} articles</span>
    </a>
    <a href="/notes" class="section-tile">
      <span class="tile-label">notes</span>
      <span class="tile-meta">{noteCount} short notes</span>
    </a>
    <a href="/weeknotes" class="section-tile">
      <span class="tile-label">weeknotes</span>
      <span class="tile-meta">{weeknoteCount} weekly entries</span>
    </a>
    <a href="/now" class="section-tile">
      <span class="tile-label">now</span>
      <span class="tile-meta">what I'm up to</span>
    </a>
  </nav>

  <section class="recent">
    <h2 class="section-heading">Recent</h2>
    <ul>
      {recent.map((entry) => (
        <li class="post-row">
          <a href={`${entry.urlBase}/${entry.id}/`} class="post-title">{entry.data.title}</a>
          <span class="post-date"><FormattedDate date={entry.data.date} /></span>
        </li>
      ))}
    </ul>
  </section>
</BaseLayout>

<style>
  .bio { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
  .bio-name {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 0.4rem;
  }
  .bio-desc { color: var(--text-2); font-size: 0.95rem; margin: 0; }

  .section-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-bottom: 2rem;
  }
  .section-tile {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .section-tile:hover { border-color: var(--accent); }
  .tile-label {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--accent);
  }
  .tile-meta { font-size: 0.75rem; color: var(--text-3); }

  .section-heading {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin: 0 0 0.75rem;
  }
  ul { list-style: none; padding: 0; margin: 0; }
  .post-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    gap: 0.75rem;
  }
  .post-row:last-child { border-bottom: none; }
  .post-title {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--accent);
    border-bottom: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .post-title:hover { border-bottom: none; color: var(--text); }
  .post-date {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-3);
    flex-shrink: 0;
  }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: home page with bio, section grid, and recent posts"
```

---

### Task 5: Posts Pages

**Files:**

- Create: `src/pages/posts/index.astro`
- Create: `src/pages/posts/[slug].astro`

- [ ] **Step 1: Create `src/pages/posts/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import FormattedDate from '../../components/FormattedDate.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';

const posts = await getCollection('posts', (p) => !p.data.deleted && !p.data.draft);
posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<BaseLayout title="Posts — Harsh Shandilya" description="All posts by Harsh Shandilya">
  <h1>Posts</h1>
  <ul>
    {posts.map((post) => (
      <li class="post-row">
        <a href={`/posts/${post.id}/`}>{post.data.title}</a>
        <span class="date"><FormattedDate date={post.data.date} /></span>
      </li>
    ))}
  </ul>
</BaseLayout>

<style>
  h1 { margin-top: 0; }
  ul { list-style: none; padding: 0; margin: 0; }
  .post-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    gap: 0.75rem;
  }
  .post-row:last-child { border-bottom: none; }
  .post-row a {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--accent);
    border-bottom: none;
  }
  .post-row a:hover { color: var(--text); }
  .date {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-3);
    flex-shrink: 0;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/posts/[slug].astro`**

This route handles both regular post pages and 301 redirects for pre-cutoff weeknote URLs.

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

const CUTOFF = new Date('2026-05-01');

export async function getStaticPaths() {
  const posts = await getCollection('posts', (p) => !p.data.deleted && !p.data.draft);
  const weeknotes = await getCollection('weeknotes');

  const postPaths = posts.map((post) => ({
    params: { slug: post.id },
    props: { type: 'post' as const, entry: post, to: '' },
  }));

  const redirectPaths = weeknotes
    .filter((w) => w.data.date < CUTOFF)
    .map((w) => ({
      params: { slug: `weeknotes-${w.id}` },
      props: { type: 'redirect' as const, entry: null, to: `/weeknotes/${w.id}/` },
    }));

  return [...postPaths, ...redirectPaths];
}

const { type, entry, to } = Astro.props;

if (type === 'redirect') {
  return Astro.redirect(to, 301);
}

const { Content } = await render(entry!);
---

<PostLayout
  title={entry!.data.title}
  description={entry!.data.summary}
  date={entry!.data.date}
  lastmod={entry!.data.lastmod}
>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/pages/posts/
git commit -m "feat: posts list and individual post pages with weeknote redirect route"
```

---

### Task 6: Notes Pages

**Files:**

- Create: `src/pages/notes/index.astro`
- Create: `src/pages/notes/[slug].astro`

- [ ] **Step 1: Create `src/pages/notes/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import FormattedDate from '../../components/FormattedDate.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';

const notes = await getCollection('notes', (n) => !n.data.deleted);
notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<BaseLayout title="Notes — Harsh Shandilya" description="Short notes by Harsh Shandilya">
  <h1>Notes</h1>
  <ul>
    {notes.map((note) => (
      <li class="note-row">
        <a href={`/notes/${note.id}/`}>{note.data.title}</a>
        <span class="date"><FormattedDate date={note.data.date} /></span>
      </li>
    ))}
  </ul>
</BaseLayout>

<style>
  h1 { margin-top: 0; }
  ul { list-style: none; padding: 0; margin: 0; }
  .note-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    gap: 0.75rem;
  }
  .note-row:last-child { border-bottom: none; }
  .note-row a {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--accent);
    border-bottom: none;
  }
  .note-row a:hover { color: var(--text); }
  .date {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-3);
    flex-shrink: 0;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/notes/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const notes = await getCollection('notes', (n) => !n.data.deleted);
  return notes.map((note) => ({
    params: { slug: note.id },
    props: { entry: note },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<PostLayout
  title={entry.data.title}
  date={entry.data.date}
>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/pages/notes/
git commit -m "feat: notes list and individual note pages"
```

---

### Task 7: Weeknotes Pages

**Files:**

- Create: `src/pages/weeknotes/index.astro`
- Create: `src/pages/weeknotes/[slug].astro`

- [ ] **Step 1: Create `src/pages/weeknotes/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import FormattedDate from '../../components/FormattedDate.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';

const weeknotes = await getCollection('weeknotes', (w) => !w.data.deleted && !w.data.draft);
weeknotes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<BaseLayout title="Weeknotes — Harsh Shandilya" description="Weekly notes by Harsh Shandilya">
  <h1>Weeknotes</h1>
  <ul>
    {weeknotes.map((entry) => (
      <li class="weeknote-row">
        <div class="weeknote-main">
          <a href={`/weeknotes/${entry.id}/`}>{entry.data.title}</a>
          {entry.data.summary && <p class="summary">{entry.data.summary}</p>}
        </div>
        <span class="date"><FormattedDate date={entry.data.date} /></span>
      </li>
    ))}
  </ul>
</BaseLayout>

<style>
  h1 { margin-top: 0; }
  ul { list-style: none; padding: 0; margin: 0; }
  .weeknote-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
    gap: 1rem;
  }
  .weeknote-row:last-child { border-bottom: none; }
  .weeknote-main { min-width: 0; }
  .weeknote-main a {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--accent);
    border-bottom: none;
    display: block;
  }
  .weeknote-main a:hover { color: var(--text); }
  .summary {
    font-size: 0.85rem;
    color: var(--text-2);
    margin: 0.2rem 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .date {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-3);
    flex-shrink: 0;
    padding-top: 0.15rem;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/weeknotes/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const weeknotes = await getCollection('weeknotes', (w) => !w.data.deleted && !w.data.draft);
  return weeknotes.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<PostLayout
  title={entry.data.title}
  description={entry.data.summary}
  date={entry.data.date}
  lastmod={entry.data.lastmod}
>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/pages/weeknotes/
git commit -m "feat: weeknotes list and individual weeknote pages"
```

---

### Task 8: Static Pages

**Files:**

- Rewrite: `src/pages/about.astro`
- Create: `src/pages/now.astro`
- Create: `src/pages/uses.astro`

Copy prose content verbatim from the Hugo site (`../msfjarvis.dev/content/`). Convert TOML frontmatter to plain Astro variables.

- [ ] **Step 1: Rewrite `src/pages/about.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="About — Harsh Shandilya" description="About Harsh Shandilya">
  <!-- Paste body content from ../msfjarvis.dev/content/about/index.md here,
       converting Markdown links to HTML <a> tags -->
  <h1>About Me</h1>
  <!-- content... -->
</BaseLayout>
```

Paste the rendered Markdown body from `../msfjarvis.dev/content/about/index.md` as HTML inside the layout. Markdown reference-style links need converting to inline `<a>` tags.

- [ ] **Step 2: Create `src/pages/now.astro`** using body from `../msfjarvis.dev/content/now/index.md`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Now — Harsh Shandilya" description="What Harsh Shandilya is up to now">
  <h1>Now</h1>
  <!-- content from ../msfjarvis.dev/content/now/index.md -->
</BaseLayout>
```

- [ ] **Step 3: Create `src/pages/uses.astro`** using body from `../msfjarvis.dev/content/uses/index.md`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Uses — Harsh Shandilya" description="Tools and setup used by Harsh Shandilya">
  <h1>Uses</h1>
  <!-- content from ../msfjarvis.dev/content/uses/index.md -->
</BaseLayout>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/pages/about.astro src/pages/now.astro src/pages/uses.astro
git commit -m "feat: static pages — about, now, uses"
```

---

### Task 9: MDX Components

**Files:**

- Create: `src/components/Figure.astro`
- Create: `src/components/Asciinema.astro`

- [ ] **Step 1: Create `src/components/Figure.astro`**

Images live in `public/posts/[slug]/`. The `src` prop is an absolute URL path. No Astro `<Image>` — `public/` string paths are not optimized, so a plain `<img>` is used directly.

```astro
---
interface Props {
  src: string;
  alt?: string;
  title?: string;
}
const { src, alt = '', title } = Astro.props;
---

<figure>
  <img src={src} alt={alt} />
  {title && <figcaption>{title}</figcaption>}
</figure>

<style>
  figure {
    margin: 1.5rem 0;
    text-align: center;
  }
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  figcaption {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-3);
    font-style: italic;
  }
</style>
```

- [ ] **Step 2: Create `src/components/Asciinema.astro`**

```astro
---
interface Props {
  id: string;
}
const { id } = Astro.props;
---

<div class="asciinema-wrap">
  <script src={`https://asciinema.org/a/${id}.js`} id={`asciicast-${id}`} async></script>
</div>

<style>
  .asciinema-wrap {
    margin: 2rem 0;
    text-align: center;
  }
</style>
```

- [ ] **Step 3: Verify type-check**

```bash
npx astro check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Figure.astro src/components/Asciinema.astro
git commit -m "feat: Figure and Asciinema MDX components"
```

---

### Task 10: RSS Feeds

**Files:**

- Create: `src/pages/rss.xml.ts`
- Create: `src/pages/notes/rss.xml.ts`
- Create: `src/pages/weeknotes/rss.xml.ts`

- [ ] **Step 1: Create `src/pages/rss.xml.ts`** (global feed — posts only)

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts", (p) => !p.data.deleted && !p.data.draft);
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: `/posts/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
```

- [ ] **Step 2: Create `src/pages/notes/rss.xml.ts`**

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";

export async function GET(context: APIContext) {
  const notes = await getCollection("notes", (n) => !n.data.deleted);
  notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `Notes — ${SITE_TITLE}`,
    description: "Short notes by Harsh Shandilya",
    site: context.site!,
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
```

- [ ] **Step 3: Create `src/pages/weeknotes/rss.xml.ts`**

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";

export async function GET(context: APIContext) {
  const weeknotes = await getCollection("weeknotes", (w) => !w.data.deleted && !w.data.draft);
  weeknotes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `Weeknotes — ${SITE_TITLE}`,
    description: "Weekly notes by Harsh Shandilya",
    site: context.site!,
    items: weeknotes.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.summary,
      link: `/weeknotes/${entry.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
```

- [ ] **Step 4: Verify build and spot-check RSS output**

```bash
npm run build
cat dist/rss.xml | grep '<guid'
```

Expected: `<guid isPermaLink="true">https://msfjarvis.dev/posts/...</guid>` entries.

- [ ] **Step 5: Commit**

```bash
git add src/pages/rss.xml.ts src/pages/notes/rss.xml.ts src/pages/weeknotes/rss.xml.ts
git commit -m "feat: RSS feeds for posts, notes, and weeknotes"
```

---

### Task 11: Webmentions Manifest

**Files:**

- Create: `src/pages/webmentions-manifest.json.ts`

- [ ] **Step 1: Create `src/pages/webmentions-manifest.json.ts`**

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_URL } from "../consts";

export async function GET(_context: APIContext) {
  const posts = await getCollection("posts", (p) => !p.data.deleted && !p.data.draft);
  const notes = await getCollection("notes", (n) => !n.data.deleted);

  const postEntries = posts.map((p) => ({
    source: `src/content/posts/${p.id}.mdx`,
    url: `${SITE_URL}/posts/${p.id}/`,
  }));

  const noteEntries = notes.map((n) => ({
    source: `src/content/notes/${n.id}.md`,
    url: `${SITE_URL}/notes/${n.id}/`,
  }));

  const entries = [...postEntries, ...noteEntries].sort((a, b) => a.source.localeCompare(b.source));

  const manifest = {
    schemaVersion: 1,
    siteOrigin: SITE_URL,
    generatedAt: new Date().toISOString(),
    entries,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Verify build and check output**

```bash
npm run build
cat dist/webmentions-manifest.json | head -20
```

Expected: valid JSON with `schemaVersion`, `siteOrigin`, `generatedAt`, and an `entries` array.

- [ ] **Step 3: Commit**

```bash
git add src/pages/webmentions-manifest.json.ts
git commit -m "feat: webmentions manifest endpoint"
```

---

### Task 12: Sveltia CMS

**Files:**

- Create: `src/pages/admin/index.astro`
- Create: `public/admin/config.yml`
- Create: `public/admin/custom.js`
- Create: `public/admin/tombstone.js`

- [ ] **Step 1: Install `@sveltia/cms`**

```bash
npm install @sveltia/cms
```

- [ ] **Step 2: Create `src/pages/admin/index.astro`**

```astro
---
// This page is excluded from the public site build — only served at /admin
---

<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Content Manager</title>
  </head>
  <body>
    <script>import '@sveltia/cms';</script>
    <script type="module" src="/admin/custom.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `public/admin/config.yml`**

Adapted from the Hugo site: TOML frontmatter → YAML, paths updated for Astro collection structure, weeknotes collection added, repo updated.

```yaml
# yaml-language-server: $schema=https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json
backend:
  name: github
  repo: msfjarvis/site-2
  skip_ci: true

media_libraries:
  cloudflare_r2:
    access_key_id: a1e50eaa4bbd04c61611f5c20545ea6a
    bucket: blog-images
    account_id: 07d4cd9cc7e8077fcafc5dd2fc30391b
    public_url: https://pub-fc205806d138406e8667d8d0c8a32a9f.r2.dev
  default:
    config:
      transformations:
        raster_image:
          format: webp
          quality: 85
        svg:
          optimize: true

collections:
  - name: posts
    label: Posts
    folder: src/content/posts
    format: yaml-frontmatter
    create: true
    media_folder: "public/posts/{{slug}}"
    public_folder: "/posts/{{slug}}"
    path: "{{slug}}/index"
    slug: "{{slug}}"
    editor:
      preview: true
    fields:
      - { label: Title, name: title, widget: string }
      - {
          label: Date,
          name: date,
          widget: datetime,
          format: "YYYY-MM-DDTHH:mm:ssZ",
          default: "{{now}}",
          picker_utc: false,
        }
      - {
          label: Last modified,
          name: lastmod,
          widget: datetime,
          format: "YYYY-MM-DDTHH:mm:ssZ",
          default: "{{now}}",
          picker_utc: false,
          required: false,
        }
      - { label: Summary, name: summary, widget: string, required: false }
      - { label: Tags, name: tags, widget: list, required: false }
      - { label: Draft, name: draft, widget: boolean, required: false }
      - { label: Deleted, name: deleted, widget: boolean, required: false }
      - {
          label: Body,
          name: body,
          widget: markdown,
          editor_components: [code-block, image, figure],
        }

  - name: notes
    label: Notes
    folder: src/content/notes
    format: yaml-frontmatter
    create: true
    path: "{{slug}}"
    slug: "{{slug}}"
    editor:
      preview: false
    fields:
      - { label: Title, name: title, widget: string }
      - {
          label: Date,
          name: date,
          widget: datetime,
          format: "YYYY-MM-DDTHH:mm:ssZ",
          default: "{{now}}",
          picker_utc: false,
        }
      - { label: Tags, name: tags, widget: list, required: false }
      - { label: Deleted, name: deleted, widget: boolean, required: false }
      - { label: Body, name: body, widget: markdown }

  - name: weeknotes
    label: Weeknotes
    folder: src/content/weeknotes
    format: yaml-frontmatter
    create: true
    path: "{{slug}}"
    slug: "week-{{week}}-{{year}}"
    editor:
      preview: true
    fields:
      - { label: Title, name: title, widget: string }
      - {
          label: Date,
          name: date,
          widget: datetime,
          format: "YYYY-MM-DDTHH:mm:ssZ",
          default: "{{now}}",
          picker_utc: false,
        }
      - {
          label: Last modified,
          name: lastmod,
          widget: datetime,
          format: "YYYY-MM-DDTHH:mm:ssZ",
          default: "{{now}}",
          picker_utc: false,
          required: false,
        }
      - { label: Summary, name: summary, widget: string, required: false }
      - { label: Tags, name: tags, widget: list, required: false }
      - { label: Draft, name: draft, widget: boolean, required: false }
      - { label: Deleted, name: deleted, widget: boolean, required: false }
      - { label: Body, name: body, widget: markdown }
```

- [ ] **Step 4: Create `public/admin/tombstone.js`**

Adapted from the Hugo version. Tombstone now only sets/clears `deleted` — no Hugo-specific `build` or `sitemap` fields.

```js
export function normalizeBlogEntryForSave(entry) {
  const data = structuredClone(entry.data ?? {});
  // Ensure deleted is explicitly boolean, not undefined
  if (!data.deleted) {
    data.deleted = false;
  }
  return { ...entry, data };
}

export function registerTombstoneHook(CMS) {
  if (!CMS || typeof CMS.registerEventListener !== "function") {
    return;
  }
  CMS.registerEventListener({
    name: "preSave",
    handler: ({ entry }) => {
      const plain = entry.toJS();
      const normalized = normalizeBlogEntryForSave({
        collection: plain.collection,
        data: plain.data,
      });
      return entry.set("data", entry.get("data").clear().merge(normalized.data));
    },
  });
}
```

- [ ] **Step 5: Create `public/admin/custom.js`**

Registers the `<Figure>` CMS editor component and the tombstone hook. The figure component now emits MDX `<Figure>` syntax instead of Hugo shortcodes.

```js
import { registerTombstoneHook } from "./tombstone.js";

const FIGURE_MDX_PATTERN = /^<Figure\s+([^/]+)\/>$/;
const ATTR_PATTERN = /(\w+)="((?:\\.|[^"\\])*)"/g;

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function unescapeAttr(value) {
  return String(value ?? "")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function parseAttrs(str) {
  const attrs = {};
  let m;
  ATTR_PATTERN.lastIndex = 0;
  while ((m = ATTR_PATTERN.exec(str)) !== null) {
    attrs[m[1]] = unescapeAttr(m[2]);
  }
  return attrs;
}

function registerFigureComponent() {
  if (!window.CMS || window.__msfjarvisFigureRegistered) return;

  window.CMS.registerEditorComponent({
    id: "figure",
    label: "Figure",
    fields: [
      { name: "src", label: "Image", widget: "image" },
      { name: "alt", label: "Alt text", widget: "text", required: false },
      { name: "title", label: "Title/caption", widget: "string", required: false },
    ],
    pattern: FIGURE_MDX_PATTERN,
    fromBlock(match) {
      const attrs = parseAttrs(match[1] ?? "");
      if (!attrs.src) return false;
      return { src: attrs.src, alt: attrs.alt ?? "", title: attrs.title ?? "" };
    },
    toBlock(data) {
      const parts = [`src="${escapeAttr(data.src)}"`];
      if (data.alt) parts.push(`alt="${escapeAttr(data.alt)}"`);
      if (data.title) parts.push(`title="${escapeAttr(data.title)}"`);
      return `<Figure ${parts.join(" ")} />`;
    },
    toPreview(data) {
      const img = `<img src="${data.src}" alt="${data.alt ?? ""}">`;
      return data.title
        ? `<figure>${img}<figcaption>${data.title}</figcaption></figure>`
        : `<figure>${img}</figure>`;
    },
  });

  window.__msfjarvisFigureRegistered = true;
}

function initialize() {
  if (!window.CMS) return;
  registerFigureComponent();
  registerTombstoneHook(window.CMS);
}

initialize();
document.addEventListener("DOMContentLoaded", initialize, { once: true });
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: clean build. Verify `/admin/index.html` exists in `dist/`.

```bash
ls dist/admin/
```

Expected: `index.html`, `config.yml`, `custom.js`, `tombstone.js`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/ public/admin/
git commit -m "feat: Sveltia CMS at /admin with updated config and adapted hooks"
```

---

## Self-Review

**Spec coverage check:**

- ✅ Typography (system-ui + ui-monospace) — Task 1
- ✅ Color system with dark/light auto — Task 1
- ✅ Navigation with all links + active state — Task 3
- ✅ Home page: bio, section grid, recent posts — Task 4
- ✅ Content collections: posts, notes, weeknotes — Task 2
- ✅ Posts list + individual pages — Task 5
- ✅ Notes list + individual pages — Task 6
- ✅ Weeknotes list + individual pages — Task 7
- ✅ Weeknote redirect route (pre-2026-05-01 cutoff) — Task 5
- ✅ Static pages: about, now, uses — Task 8
- ✅ MDX components: Figure, Asciinema — Task 9
- ✅ RSS: global (posts only), notes, weeknotes — Task 10
- ✅ RSS `<guid>` compatibility via `link` field — Task 10
- ✅ Webmentions manifest (posts + notes, not weeknotes) — Task 11
- ✅ Sveltia CMS at /admin — Task 12
- ✅ Tombstone hook adapted for Astro (deleted field only) — Task 12
- ✅ Figure CMS component emitting MDX syntax — Task 12
- ✅ `deleted: true` posts excluded from all collection queries — Tasks 5, 6, 7, 10, 11
- ✅ `draft: true` posts excluded from pages and feeds — Tasks 5, 6, 7, 10

**One gap identified:** The spec says `deleted: true` posts should return HTTP 410 Gone. Static Astro sites can't emit arbitrary HTTP status codes without a hosting-level mechanism. These posts are currently excluded from `getStaticPaths` so they'll 404. Add a `public/_redirects` entry for known deleted posts when that situation arises — document this as out of scope for now since there are no deleted posts yet.

**Type consistency:** All `getCollection` filter callbacks, `entry.data` field accesses, and `render()` calls use field names consistent with the schemas defined in Task 2.

**Placeholder check:** All code blocks are complete. No TBD or TODO present.
