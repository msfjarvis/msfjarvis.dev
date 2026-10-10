# Open Graph images

Keep generation local. The site needs a small metadata/path contract, not the upstream `astro-opengraph-images` integration and its unused Tailwind peer tree. Cheerio is already needed for feeds and Mastodon HTML; it also replaces JSDOM here. Retain React, Satori, Resvg, and font packages for card rendering.

## Data flow

- `BaseHead.astro` uses `opengraph-images-paths.ts` to emit image URLs. Directory pages map to `index.png`; flat pages map to `.png`, with root error-page exceptions.
- `opengraph-images.ts` selects posts/notes/weeknotes entry pages and reads their built HTML. File lookup supports directory indexes and flat HTML output.
- `parseOpenGraphPage` parses once with Cheerio. Required tags are `og:title`, `og:url`, `og:type`, and `og:image`; missing/blank values fail generation. Description is optional and omitted when equal to the title.
- `[data-og-date]` and `[data-og-collection]` carry optional renderer metadata. Renderers receive plain fields, not a DOM or a parser handle. Keep HTML traversal inside the parser.
- The configured collection renderer produces React elements; Satori lays them out as SVG; Resvg produces PNG. The build verifies the declared image URL matches the output path.
- Development middleware handles GET/HEAD directory image URLs by fetching the corresponding live page and using the same rendering path. No separate layout or metadata extraction implementation.

## Constraints

- Card styling and fonts are independent of HTML parsing. Changing parser internals must not change existing image pixels.
- Cheerio does not execute page scripts or evaluate styles. JSDOM-specific HTML stripping is unnecessary; do not restore a browser DOM just for attribute queries.
- Keep draft/dev origins in image URLs. Required metadata failures should remain visible rather than silently generating incomplete cards.
- Tests cover metadata validation, entity decoding, marker handling, and output-path conventions. Validate integration changes with a full build and compare generated PNG hashes against a baseline captured before the change.
