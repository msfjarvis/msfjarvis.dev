# Search UI

## Current state

The visible search UI uses Cloudflare AI Search's `@cloudflare/ai-search-snippet` package. `src/components/CloudflareSearch.astro` reads the public `PUBLIC_CLOUDFLARE_AI_SEARCH_ENDPOINT` build-time variable and, when non-empty, renders an accessible header button and `<search-modal-snippet>`. The button opens the modal; its built-in keyboard shortcut is Meta+K. With no endpoint configured, neither control is rendered. Only the public endpoint is sent to the browser; never expose `CLOUDFLARE_API_TOKEN`.

The snippet calls the configured public Cloudflare AI Search endpoint directly from the browser. Enable public access in the Cloudflare dashboard and configure browser CORS to permit this site. Set `PUBLIC_CLOUDFLARE_AI_SEARCH_ENDPOINT` to the dashboard-provided public endpoint at build time for production and any preview deployment that needs search. Do not substitute a docs/demo URL or a private API endpoint.

## Ingestion

Cloudflare AI Search ingestion is implemented separately in `src/integrations/cloudflare-ai-search.ts`. It uploads raw Markdown/MDX source documents from supported collections. Build ingestion requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_SEARCH_NAMESPACE`, `CLOUDFLARE_AI_SEARCH_INSTANCE_ID`, and `CLOUDFLARE_API_TOKEN`; these are server/build-time settings, never browser configuration. Hybrid retrieval is configured on the Cloudflare instance, not through item uploads.

## Implementation notes

- `src/components/CloudflareSearch.astro` owns endpoint gating, package registration, trigger behavior, and modal configuration.
- The `@cloudflare/ai-search-snippet/search` import registers `<search-modal-snippet>`.
- The package uses shadow DOM. Host-level `--search-snippet-*` CSS custom properties map its colors and font to site design tokens.
- `src/components/Header.astro` includes the wrapper, so both `BaseLayout` and `PostLayout` expose search through their shared header.
- PhotoSwipe scopes standalone post images to `article.h-entry`; this semantic selector is independent of search indexing.
- Search indexing is handled by the Cloudflare AI Search build integration; no separate local index is generated.

The UI uses no API token. If public endpoint policy changes, do not move a secret into `PUBLIC_*` configuration; add a server-mediated design as a separate task.
