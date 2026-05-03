# Adding a new collection

Posts, notes and weeknotes are implemented as Astro collections which are used pervasively throughout the project to do data driven generation. Adding a new collection will change a lot of files that I do not expect to remember forever, hence this page.

In most places where the collection is fetched, it is also filtered for some metadata flags to prevent building drafts. As of writing that filter looks like this: `(p) => !p.data.deleted && (showDrafts || !p.data.draft)`.

## Files to be created/changed

- `src/pages/<name>/[slug].astro`, `src/pages/<name>/index.astro`
    - Create these to have the collection show up on the site
- `src/pages/tags/[tag].astro`, `src/pages/tags/index.astro`
    - Update this page if the new collection will have tags that will be indexed.
- `src/pages/categories/[category].astro`, `src/pages/categories/index.astro`
    - Same but for categories
- `src/pages/webmentions-manifest.json.ts`
    - If the page can accept Webmentions, it will have to be added to the manifest by configuring the collection in this file.
- `src/pages/<name>/rss.xml.ts`
    - If the page needs an RSS feed, you will need to wire it up with the `@astrojs/rss` plugin.
