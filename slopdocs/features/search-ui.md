# Search UI

Decision: integrate search with Pagefind directly, copying only the necessary wiring patterns from the local `../astro-pagefind` checkout, while using Pagefind’s predefined Component UI for the actual search experience. The site will expose a compact global trigger in the header, a floating modal with inline results, and a dedicated `/search` page using the same Pagefind-backed presentation.

## Context

- Site repo: `msfjarvis.dev` (Astro, Cloudflare adapter, `output: "server"`).
- Search integration source of truth requested by user: local repo at `../astro-pagefind`.
- Read and followed:
  - `../astro-pagefind/README.md`
  - `../astro-pagefind/packages/example/src/layouts/Main.astro`
  - Pagefind component docs:
    - `https://pagefind.app/docs/components/searchbox/`
    - `https://pagefind.app/llms-component-ui.txt`
- Existing site structure relevant to integration:
  - `src/components/Header.astro`
  - `src/layouts/BaseLayout.astro`
  - `src/components/BaseHead.astro`
  - `src/styles/global.css`
- Existing design tokens already cover the theming surface we need:
  - `--bg`, `--bg-subtle`, `--border`, `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-subtle`
  - `--font-sans`, `--font-mono`

## User requirements captured during brainstorming

- Add search to this Astro site using the `astro-pagefind` repo as the integration guide.
- Provide both:
  - a global entrypoint in the header/nav
  - a dedicated `/search` page
- Header search should be a compact trigger that opens a floating modal.
- Results should be shown inline inside the modal itself.
- Predefined components are acceptable as long as they can be fully styled to match the site’s existing UI.

## Chosen approach

Use Pagefind’s predefined Component UI, not a hand-rolled search implementation.

### Why

- Matches requested UX directly:
  - `<pagefind-modal-trigger>` provides the compact global search trigger and keyboard shortcut.
  - `<pagefind-modal>` provides the floating modal with input and inline results in the same overlay.
- Lower risk than building a custom modal shell around lower-level Pagefind primitives.
- Keeps accessibility and keyboard behavior delegated to Pagefind.
- Styling remains viable because Pagefind exposes `--pf-*` CSS variables and allows targeted overrides.

## Alternatives considered

### 1. Prebuilt modal + dedicated search page built from predefined components (recommended)

Use:
- a local Pagefind integration in this repo, based on the `astro-pagefind` build/dev wiring
- a local `PagefindConfig.astro` patterned after `astro-pagefind`
- `<pagefind-modal-trigger>` in the header
- `<pagefind-modal>` mounted globally in the base layout
- `/search` page using predefined Pagefind components

Pros:
- Minimal custom JS
- Fastest path to requested UX
- Good accessibility defaults
- Shared visual language between modal and full page

Cons:
- Markup control is more constrained than a fully custom shell

### 2. Custom modal layout using Pagefind building blocks

Use `<pagefind-input>`, `<pagefind-summary>`, `<pagefind-results>`, etc. inside a custom modal structure.

Pros:
- More control over layout and exact markup

Cons:
- More code, more moving pieces, higher maintenance burden
- Easy to regress keyboard/focus/accessibility behavior relative to the stock modal

### 3. Fully custom search implementation using Pagefind internals

Use Pagefind APIs programmatically and build all UI and interaction ourselves.

Pros:
- Maximum flexibility

Cons:
- Overkill for this site
- Highest complexity and risk
- Not justified by current requirements

## Architecture

### Build-time integration

Add direct Pagefind support to the project using a local Astro integration.

Intent:
- build the Pagefind index as part of Astro builds
- serve previously built `/pagefind/` assets in dev mode, following the working parts of `../astro-pagefind`
- avoid the compatibility problems of depending on the published `astro-pagefind` package with this repo’s Astro/server setup

### Shared layout wiring

Mount shared Pagefind configuration at the layout level.

Expected changes:
- `src/components/PagefindConfig.astro`
  - local wrapper patterned after `../astro-pagefind/packages/astro-pagefind/src/components/PagefindConfig.astro`
  - imports `@pagefind/component-ui` and its CSS
  - sets `bundle-path` to `${import.meta.env.BASE_URL}pagefind/`
- `src/layouts/BaseLayout.astro`
  - import the local `PagefindConfig.astro`
  - render `<PagefindConfig />` once in the shared layout
  - render a global `<pagefind-modal>` once so search is available site-wide
- `src/components/BaseHead.astro`
  - only add explicit Pagefind assets if the local wrapper does not already cover them

### Header entrypoint

Update `src/components/Header.astro` to add a compact search trigger in the nav.

Intent:
- preserve current nav structure and spacing
- make the search control feel native to the existing header
- use a compact button-like control, not a permanent inline input

Preferred primitive:
- `<pagefind-modal-trigger compact ...>` or equivalent predefined trigger configuration if styling is cleaner with non-compact text hidden via CSS

### Dedicated search page

Create `src/pages/search.astro`.

Intent:
- direct navigable destination for search
- fallback/stable page for users who prefer a full-page search surface
- reuse Pagefind presentation rather than inventing a second UI model

Likely structure:
- page title + short intro
- shared Pagefind config/instance
- predefined Pagefind components composing a full-page search surface
- no custom search logic unless necessary

## Styling plan

Goal: make predefined Pagefind UI look first-party against `src/styles/global.css`.

### Theme tokens mapping

Map Pagefind variables to site variables:

- `--pf-background` -> `var(--bg)`
- `--pf-border` -> `var(--border)`
- `--pf-text` -> `var(--text)`
- `--pf-text-secondary` -> `var(--text-2)`
- `--pf-text-muted` -> `var(--text-3)`
- `--pf-font` -> `var(--font-sans)`
- focus/hover/accent-related values -> `var(--accent)` / `var(--accent-subtle)` / subtle backgrounds

### Modal tuning

Adjust:
- modal max width / height
- top offset on larger screens
- backdrop color to fit site tone
- internal spacing and border radius to sit comfortably next to the site’s simple, clean look

### Trigger styling

The header search trigger should visually read like a native nav control.

Likely adjustments:
- remove stock button feel if needed
- align with existing nav font sizing
- use border/background tokens matching the rest of the site
- ensure hover/focus states are consistent with current links and interactive elements

### Result presentation

Use light overrides for:
- result title spacing
- excerpt spacing and line length
- keyboard hint/footer polish if visible
- dark mode parity with the existing `prefers-color-scheme: dark` token set

Constraint:
- prefer CSS variables first, then narrowly-scoped overrides only where Pagefind defaults do not match the site

## Interaction model

### Global trigger behavior

- Trigger appears in the site header on all pages using `BaseLayout`.
- Clicking the trigger opens the modal.
- Global keyboard shortcut opens it:
  - `Cmd+K` on macOS
  - `Ctrl+K` on Windows/Linux
- `Escape` closes the modal.
- Focus returns to the trigger after close.

### Modal behavior

- Modal contains the search input and inline results.
- Typing updates results inside the modal itself.
- Keyboard navigation remains Pagefind-native.
- No bespoke interaction logic unless required by an integration edge case.

### Full-page behavior

- `/search` exposes the same underlying search capability without requiring a modal.
- It should work independently as a direct destination.
- It should visually feel like part of the same feature, not a disconnected second implementation.

## Error handling / fallback behavior

### Missing index in local dev

Known limitation from Pagefind model:
- search results may not be available in local dev until the site has been built and indexed at least once

Decision:
- accept this behavior
- only document in code/comments if a comment is necessary for maintainers
- do not add workaround complexity unless verification proves it is needed here

### Progressive failure posture

- If the modal cannot return results because the Pagefind bundle/index is absent, the page should still render normally.
- `/search` remains the stable destination for users, but it depends on the same underlying assets, so it is a UX fallback, not a no-index fallback.
- Avoid custom JS to keep failure modes limited to the underlying integration.

## Files expected to change

- `package.json`
  - add direct dependencies needed for Pagefind (`pagefind`, `@pagefind/component-ui`, and `sirv` if the local integration uses the same dev-server middleware pattern)
- `astro.config.mjs`
  - register a local `pagefind()` integration
+- `src/integrations/pagefind.ts`
+  - local Astro integration adapted from `../astro-pagefind/packages/astro-pagefind/src/pagefind.ts`
+- `src/components/PagefindConfig.astro`
+  - local wrapper adapted from `../astro-pagefind/packages/astro-pagefind/src/components/PagefindConfig.astro`
- `src/components/BaseHead.astro`
  - wire shared Pagefind component assets if required
- `src/layouts/BaseLayout.astro`
  - add `PagefindConfig`
  - add global modal host
- `src/components/Header.astro`
  - add header search trigger
- `src/pages/search.astro`
  - add dedicated search page
- `src/styles/global.css`
  - add `--pf-*` theme variables and minimal overrides

Potentially touched depending on final implementation details:
- nav link data if a visible `/search` link is also desired later (not required by current decision)

## Verification plan

Run enough verification to prove both build-time and UI wiring work.

### Must verify

- site builds successfully with the local Pagefind integration enabled
- Pagefind assets are emitted in the build output
- header trigger renders on site pages using `BaseLayout`
- modal opens on click
- modal opens via `Cmd+K` / `Ctrl+K`
- results render inline inside the modal
- `/search` works as an independent destination
- dark mode styling is coherent with the site’s existing color tokens

### Nice-to-have verification

- focus return after closing modal
- keyboard navigation through results behaves correctly
- no obvious layout regressions in header spacing on narrow screens

## Non-goals

- Building a custom search engine or custom indexing pipeline
- Custom ranking work beyond what the stock integration gives us
- Search facets/filters in this initial pass
- Multiple independent Pagefind instances
- Heavy template customization unless the stock result markup proves impossible to style acceptably

## Open constraints to watch during implementation

- This site uses `output: "server"` with Cloudflare adapter; the published `astro-pagefind` package is not a viable direct dependency here, so reuse only the compatible pieces of its implementation locally.
- `astro-pagefind` docs mention the newer Pagefind component UI is preferred and the older `Search.astro` component is maintenance-mode only. Do not use `Search.astro` unless there is a concrete blocker with the component UI path.
- If Pagefind asset loading is sensitive to bundle path or base URL, use the local `PagefindConfig.astro` wrapper rather than bespoke per-page script logic.

## Implementation recommendation to carry into planning

Implement the smallest viable version first:
1. add the local Pagefind integration and shared config
2. get a stock modal trigger + modal working globally
3. add `/search` page with predefined components
4. theme everything to match the site
5. only introduce extra overrides or JS if verification reveals a concrete gap
