# Redirects

All redirect rules live in `public/_redirects`, generated automatically before every build by `scripts/generate-redirects.mjs`.

Two sources of redirects:

1. **Weeknote URL migration** — old `/posts/weeknotes-week-N-YYYY/` URLs redirect to the new `/weeknotes/week-N-YYYY/` canonical form. Only entries published before 2026-05-01 get a redirect; entries from that date forward only ever existed at the new URL.

2. **Content aliases** — any `aliases` array in a content file's frontmatter produces a redirect from each listed path to that entry's canonical URL. Add an alias to a post's frontmatter and it appears in `_redirects` on the next build.

## Adding a new redirect

For a one-off alias, add it to the relevant content file's frontmatter:

```yaml
aliases:
  - /old-path
```

Re-running `npm run build` (or `npm run generate-redirects`) regenerates `public/_redirects`.

## Known limitation: SSR incompatibility

`_redirects` is processed by Cloudflare's static asset layer **before** any Worker code runs. As a result, Cloudflare's own documentation states:

> "Redirects defined in the `_redirects` file are not applied to requests served by your Worker code, even if the request URL matches a rule."

This site is currently fully static (`output: 'static'`, no adapter), so `_redirects` works correctly for all routes.

**When SSR is added** (i.e. when `@astrojs/cloudflare` is installed and `output: 'server'` or `'hybrid'` is set), every request will be handled by Worker code and `_redirects` will be bypassed entirely. At that point the redirect logic must move into Astro middleware (`src/middleware.ts`), which runs inside the Worker on every request.

The migration is straightforward — `scripts/generate-redirects.mjs` already contains all the logic; it just needs to be adapted to populate a data structure the middleware reads at runtime instead of writing a flat file.
