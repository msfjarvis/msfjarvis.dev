# Adding a new collection

Posts, notes and weeknotes are implemented as Astro collections which are used pervasively throughout the project to do data driven generation. Adding a new collection will change a lot of files that I do not expect to remember forever, hence this page.

In most places where the collection is fetched, it is also filtered for some metadata flags to prevent building drafts. The `filterDrafts` helper in `utils.ts` is the only thing to be used for this.

When adding a new collection, also add a matching `npm run new:*` command for it instead of relying on manual file creation. These commands keep slug generation, directory layout, timestamps, and frontmatter consistent across collections.

Current commands are:

- `npm run new:post -- "Title"`
- `npm run new:note -- "Title"`
- `npm run new:weeknote`

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
