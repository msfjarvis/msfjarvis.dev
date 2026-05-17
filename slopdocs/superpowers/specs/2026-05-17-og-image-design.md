# OpenGraph image design for Astro content collections

## Goal

Add build-time OpenGraph image generation for this Astro site using `astro-opengraph-images`, with a reusable template that fills from Astro content collections.

The design should be inspired by the previous Hugo-based image treatment without copying it directly. It should preserve the dark, developer-oriented feel of the old card while improving structure for collection metadata.

## Chosen direction

Use the visual direction previously labeled **Option 3 / Hard summary block**.

This is a framed dark card with a subtle accent stripe on the left, a small metadata header, a large monospace title area, and a dedicated lower summary section separated by a rule.

## Scope

First version applies only to collection entry pages under:

- `/posts/`
- `/notes/`
- `/weeknotes/`

However, the implementation should remain generic enough that individual standalone pages can be opted in later without reworking the rendering model.

## Architecture

Replace the current route-based `astro-og-canvas` implementation with the `astro-opengraph-images` Astro integration.

The site will use a single custom renderer for collection pages. The integration will run at build time, filter output to supported collection routes, and generate PNG files for matching pages.

The renderer will derive its content primarily from metadata already emitted into built pages, rather than by tightly coupling itself to content collection lookups. This keeps the design reusable for later expansion to standalone pages.

## Content model

The OG template will be driven from existing collection schema fields in `src/content.config.ts`:

- `title`
- `date`
- `summary`
- collection identity inferred from the route or collection name (`posts`, `notes`, `weeknotes`)

`summary` is currently optional in schema, so the layout must tolerate missing summary text.

## Layout structure

### Top zone

- Small site label: `msfjarvis.dev`
- Small formatted date
- Large monospace title as the dominant element

This zone should reserve strict vertical space for the title to avoid collisions with lower content.

### Bottom zone

- A thin horizontal separator line
- Summary text on the left
- Small secondary metadata on the right, such as collection label

This zone is a fixed content area, not leftover footer space.

## Visual style

- Dark background inspired by `og_base.png`
- Subtle inner frame
- Left accent stripe for identity
- Monospace title styling to preserve continuity with the old site
- Quiet supporting text colors for date and summary

The design should feel like an intentional successor to the old image rather than a direct port.

## Data flow

For each supported collection page:

1. The page emits normal Open Graph metadata through the existing head pipeline.
2. The integration crawls built output during the build.
3. A filter keeps only `/posts/`, `/notes/`, and `/weeknotes/` routes.
4. The custom renderer reads page metadata and stable page markup to extract:
   - title from `og:title`
   - summary from `og:description`
   - date from a stable metadata hook or DOM marker
   - collection kind from pathname
5. The integration writes the final PNG into the build output and the page metadata points to it.

## Behavior rules

### Title handling

- The title gets priority in visual hierarchy
- The title area must be height-limited so it cannot overlap the summary block
- Long titles may be truncated or scaled conservatively rather than allowed to collide with lower content

### Summary handling

- If `summary` exists, render it in the lower content block
- If `summary` is missing, the lower block should still render cleanly without awkward empty space

### Date handling

- `date` should be formatted into a short readable form suitable for OG images
- Date remains secondary to title and summary
- If date extraction fails, omit it rather than failing image generation unless the failure indicates a real page contract bug

### Collection differentiation

- `posts`, `notes`, and `weeknotes` share the same base template
- Subtle differentiation is allowed, such as collection label text or accent color variation, but is not required in the first version

## Error handling

- If a collection page is missing `og:title`, the build should fail rather than silently emit a broken image
- If `og:description` is missing, the layout should still render cleanly
- Date extraction should be resilient and should not crash generation for otherwise valid pages

## Validation

Validation should focus on behavior rather than static source checks.

Key checks:

- Images generate successfully during `astro build`
- Sample `posts`, `notes`, and `weeknotes` entries all produce OG images
- Long titles do not overlap the summary block
- Missing summaries do not break layout
- Generated page metadata points to the correct image path

## Recommendation

Implement a single custom `astro-opengraph-images` renderer for collection entry pages only. This best matches the approved visual design while keeping the system reusable enough to extend to selected standalone pages later.
