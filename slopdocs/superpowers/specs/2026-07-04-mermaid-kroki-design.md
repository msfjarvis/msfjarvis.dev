# Mermaid to Kroki build-time rendering design

## Summary

Replace the current Mermaid-based build-time renderer with Kroki-backed SVG generation using `https://kroki.io`.

Authors will keep writing fenced `mermaid` code blocks in markdown/MDX. During the Astro markdown pipeline, those fences will still be transformed into inline SVG plus the existing site lightbox UI. Feed rendering will flatten that interactive wrapper back down to a single static inline SVG so RSS/Atom readers can render diagrams without executing JavaScript.

Kroki failures must fail the build hard.

## Goals

- Remove the direct `mermaid` runtime dependency from the site build.
- Stop relying on client-side JavaScript execution for feed readers to display diagrams.
- Preserve current fenced-code authoring for content.
- Preserve the on-site lightbox UX for Mermaid diagrams.
- Ensure feeds contain a light-mode static SVG variant.
- Fail the build on Kroki/network/rendering errors.

## Non-goals

- Changing Mermaid authoring syntax.
- Adding fallback rendering when Kroki is unavailable.
- Converting diagrams into standalone asset files.
- Adding diagram caching or persistence outside the existing build pipeline.
- Broadly redesigning the current lightbox UX.

## Current state

Today, Mermaid fences are handled by a remark plugin at `src/remark/remark-mermaid.ts`.
That plugin calls `src/lib/render-mermaid.ts`, which sets up JSDOM, initializes Mermaid in a server context, renders SVG, and injects CSS-variable-based theming.

The plugin wraps the generated SVG in an interactive lightbox shell containing:

- preview SVG
- expand button
- modal dialog markup
- inline script for opening/closing the modal

Feeds are built through `src/lib/feed.ts`, which renders entry HTML and already strips image-lightbox-only interactivity. Mermaid lightbox markup currently survives in a form that is not suitable for feed readers that do not run JavaScript.

## Chosen approach

Use the existing remark plugin as the single Mermaid integration point and swap only the renderer helper implementation.

### Why this approach

- It preserves the current content authoring model.
- It keeps Mermaid transformation responsibility in one place.
- It avoids duplicating Mermaid logic across site and feed pipelines.
- It minimizes surface area compared to generating external assets.
- It cleanly removes Mermaid/JSDOM-specific SSR complexity.

## Alternatives considered

### 1. Current-plugin, new-Kroki renderer helper (chosen)

Keep `src/remark/remark-mermaid.ts` and replace `src/lib/render-mermaid.ts` with a Kroki-backed implementation.

Pros:

- Smallest targeted change
- Preserves current authoring and plugin structure
- Easy to validate through existing build paths

Cons:

- Requires feed cleanup to understand Mermaid lightbox markup

### 2. Separate feed-specific Mermaid handling

Leave site rendering as-is and add a separate feed-only Mermaid rewrite path.

Pros:

- Explicit feed behavior

Cons:

- Splits responsibility across pipelines
- Higher drift risk between site and feed output
- More maintenance burden

### 3. Pre-generate external SVG assets

Render diagrams to files and replace fences with references.

Pros:

- Cacheable assets
- Smaller HTML bodies

Cons:

- Requires asset naming/invalidation plumbing
- More invasive than needed
- Does not fit the current inline-SVG approach

## Architecture

### Markdown transformation

`src/remark/remark-mermaid.ts` will continue to:

1. detect code fences where `lang === "mermaid"`
2. call a renderer helper with the raw diagram source
3. replace the code fence with generated HTML
4. throw a file-contextual error if rendering fails

No author-facing syntax changes are needed.

### Kroki renderer helper

`src/lib/render-mermaid.ts` will be rewritten to use Kroki.

It will:

- send a POST request to `https://kroki.io/mermaid/svg`
- send the Mermaid source as plain text in the request body
- request SVG output directly
- validate that the response is successful and contains SVG markup
- normalize the SVG so it still carries the local `mermaid-diagram` class hook
- return inline SVG markup to the remark plugin

It will fail hard when:

- the network request fails
- Kroki returns a non-2xx status
- Kroki returns empty or malformed SVG
- the request exceeds the configured timeout

The helper will not attempt fallback rendering.

### Site HTML behavior

The site output will keep the existing lightbox treatment around Mermaid diagrams:

- inline preview SVG in content flow
- expand button
- modal/dialog container
- inline client script for opening and closing the dialog

This preserves the current browser UX.

### Feed HTML behavior

`src/lib/feed.ts` will extend its cleanup pass so Mermaid lightboxes are flattened for feeds.

The cleanup must:

- detect Mermaid lightbox roots
- keep exactly one inline SVG per Mermaid diagram
- remove the expand button
- remove the modal/dialog container
- remove the inline Mermaid lightbox script

The resulting feed HTML should contain a plain static inline SVG only.

## Light-mode feed rendering

Feed readers cannot be assumed to provide the site’s CSS custom properties. Because of that, feed output must not depend on `var(--...)` color values to remain legible.

The feed cleanup path will ensure Mermaid SVGs use concrete light-theme colors before serialization.

Acceptable implementation shapes:

- renderer helper returns a light-colored SVG by default and site-only styles enhance it later, or
- feed cleanup rewrites CSS-variable-based theming in the kept SVG into concrete light palette values

Required outcome:

- feed SVG renders legibly on its own
- feed SVG does not require JavaScript
- feed SVG does not require the site stylesheet to look correct

## Error handling

Rendering failures must abort the build.

Errors should preserve enough context to identify the offending content file, matching the current behavior where the remark plugin reports the source file path.

Preferred error shape:

- content file path
- brief reason (`HTTP 500`, timeout, invalid SVG, etc.)
- optionally a short response snippet when useful and safe

## Dependency and config changes

### Remove Mermaid-specific runtime setup

The new implementation should remove the need for:

- `mermaid`
- JSDOM-based DOM bootstrapping in `src/lib/render-mermaid.ts`
- DOMPurify stubbing and SVG measurement shims used only for Mermaid SSR

### Clean Astro/Vite config

`astro.config.mjs` should be cleaned up to remove Mermaid-specific SSR externals that are no longer needed.

The global markdown/MDX registration of `remarkMermaid` should remain intact.

## Data flow

1. Author writes a fenced Mermaid block in markdown/MDX.
2. Astro markdown processing invokes `remarkMermaid`.
3. `remarkMermaid` sends the block contents to `renderMermaidDiagram()`.
4. `renderMermaidDiagram()` POSTs the source to `https://kroki.io/mermaid/svg`.
5. Kroki returns SVG.
6. The plugin inserts the SVG into the existing lightbox wrapper for site output.
7. Feed rendering later flattens that wrapper into a single static inline SVG.
8. If any Kroki step fails, the build fails.

## Testing and verification

Verification should cover both site output and feed output.

### Build-path verification

- Run the normal build path that includes markdown/MDX processing.
- Confirm existing Mermaid-bearing content still builds successfully.
- Confirm Mermaid syntax or Kroki failures abort the build.

### Site-output verification

- Confirm pages containing Mermaid diagrams still render inline SVG previews.
- Confirm the expand/lightbox button still works in the browser.
- Confirm only one preview diagram appears in normal page flow.

### Feed-output verification

- Render a feed item containing a Mermaid diagram.
- Confirm the feed HTML contains plain inline SVG.
- Confirm Mermaid dialog/button/script markup is absent.
- Confirm colors are concrete and readable in light mode.
- Confirm feed output does not rely on CSS variables for diagram legibility.

## Files expected to change

- `src/lib/render-mermaid.ts`
  - replace Mermaid/JSDOM renderer with Kroki POST-based renderer
- `src/remark/remark-mermaid.ts`
  - likely minimal or no structural changes; keep current integration and error context
- `src/lib/feed.ts`
  - extend feed cleanup to flatten Mermaid lightbox markup to a single static SVG
- `astro.config.mjs`
  - remove obsolete Mermaid SSR external config if no longer needed
- `package.json`
  - remove `mermaid` if unused after migration
- lockfile
  - dependency updates reflecting removal of Mermaid-related packages if they are no longer referenced

## Risks and mitigations

### Risk: build instability due to external service dependency

Because Kroki is remote, builds now depend on network availability.

Mitigation:

- this is an accepted trade-off
- failures are explicit and should stop the build immediately
- timeout/error reporting should be clear

### Risk: feed SVG becomes unreadable without site CSS

If the SVG still depends on CSS variables, some readers may render poor colors or ignore them entirely.

Mitigation:

- ensure feed cleanup or renderer output converts diagram colors to concrete light-theme values
- verify serialized feed output directly, not just page output

### Risk: cleanup accidentally removes the only SVG copy

The current lightbox wrapper contains preview and expanded variants.

Mitigation:

- cleanup should intentionally select and preserve one SVG
- tests/verification should assert one Mermaid SVG remains in feed output

## Acceptance criteria

- Fenced `mermaid` blocks still work in markdown/MDX content.
- Mermaid rendering uses `https://kroki.io` instead of the Mermaid package.
- Site pages retain the current Mermaid lightbox UX.
- RSS/Atom feed content contains plain static inline SVG for Mermaid diagrams.
- Feed diagrams render in a light-mode-safe way without JavaScript.
- Kroki failures fail the build hard with source-file context.
- Mermaid-specific JSDOM/runtime setup is removed from the repo.
