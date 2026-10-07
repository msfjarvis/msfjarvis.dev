# Search UI

## Current state

The visible search UI uses Cloudflare AI Search's `@cloudflare/ai-search-snippet` package. `src/components/CloudflareSearch.astro` reads the public `PUBLIC_CLOUDFLARE_AI_SEARCH_ENDPOINT` build-time variable and, when it is non-empty, renders an accessible header button and `<search-modal-snippet>`. The button calls the modal's `open()` method; the snippet's built-in keyboard shortcut is Meta+K. With no endpoint configured, neither the button nor modal is rendered, so there is no dead or misconfigured search affordance. Only the public endpoint is sent to the browser; never expose `CLOUDFLARE_API_TOKEN`.

The snippet calls the configured public Cloudflare AI Search endpoint directly from the browser. The endpoint must be enabled for public access in the Cloudflare dashboard, and its browser CORS policy must permit this site. Index ingestion credentials/configuration are separate server/build-time settings.

## Temporary Pagefind coexistence

This is the visible-UI phase only. Pagefind's Astro build integration, package dependencies, `src/integrations/pagefind.ts`, Astro registration, and `src/components/PagefindConfig.astro` remain in the repository for the separate indexing/build cleanup phase. Existing `data-pagefind-*` attributes also remain until that phase. Pagefind's visible component UI, stylesheet/script includes, modal, trigger, theme wiring, and related styling have been removed from shared layouts/styles. Do not remove or alter the Pagefind build integration as part of UI work; the later cleanup phase owns that.

Cloudflare AI Search content ingestion is implemented separately in `src/integrations/cloudflare-ai-search.ts`. It uploads raw Markdown/MDX source documents from supported collections. Build ingestion credentials are `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_SEARCH_NAMESPACE`, `CLOUDFLARE_AI_SEARCH_INSTANCE_ID`, and `CLOUDFLARE_API_TOKEN`; these are never browser configuration. Hybrid retrieval is configured on the Cloudflare instance, not through item uploads.

## UI implementation notes

- `src/components/CloudflareSearch.astro` is the single wrapper for endpoint gating, package registration, trigger behavior, and modal configuration.
- The package import is `@cloudflare/ai-search-snippet/search`; its module registers the `<search-modal-snippet>` web component.
- The search package uses a shadow DOM. Host-level `--search-snippet-*` CSS custom properties map its colors and font to site design tokens.
- The modal's built-in keyboard interaction and result navigation remain package-owned. Keep the explicit trigger as a native button with an accessible label.
- `src/components/Header.astro` includes the wrapper, so both `BaseLayout` and `PostLayout` expose search through their shared header.

## Follow-up / operational constraints

- Set `PUBLIC_CLOUDFLARE_AI_SEARCH_ENDPOINT` to the dashboard-provided **public** endpoint before expecting a search control to appear. Do not substitute a docs/demo URL or a private API endpoint.
- Enable public access and configure CORS in the Cloudflare dashboard for the production and preview origins that need search.
- The UI uses no API token. If public endpoint policy changes, do not move a secret into `PUBLIC_*` configuration; add a server-mediated design as a separate task.
- Phase 3 is responsible for removing the now-unused Pagefind UI component/configuration and build/indexing integration as scoped by that task. Until then, Pagefind and AI Search indexing coexist even though only AI Search is user-visible.
