# Mastodon post embed

## Decision

Implement a server-rendered Astro component, `src/components/MastodonPost.astro`, with one required `url` prop:

```astro
<MastodonPost url="https://infosec.exchange/@0xabad1dea/116900098449254586" />
```

The component parses a repository-controlled Mastodon status URL and loads its checked-in normalized snapshot. It emits a semantic, intentionally unstyled `blockquote` with `lang`, `cite`, and `data-source="fediverse"` attributes; post text; image attachments; and an author/timestamp footer linking to the canonical post URL.

## Rendering model

- `src/lib/mastodon.ts` owns URL parsing, endpoint construction, live response validation/normalization for refreshes, and snapshot validation/loading for rendering. Keep it separate from Astro markup and accept an injectable `fetch` implementation for Node tests. The `url` prop is trusted site content, not untrusted request input: do not reuse the refresh fetch path for visitor-supplied URLs without an outbound network policy that resolves and pins public IP addresses.
- Run `pnpm mastodon:refresh` after adding or changing an embed. The command scans `src/**/*.astro` and `src/**/*.mdx` for live literal `MastodonPost` URL props, fetches the public REST endpoint, and atomically regenerates the checked-in `src/data/mastodon-snapshots.ts` module. MDX authoring stays `<MastodonPost url="…" />`; the generated data is never refreshed during a normal build.
- Render with `MastodonPost.astro`; pages and feeds consume the same snapshot and make no Mastodon network requests at build or request time.
- Convert remote status HTML into escaped plain-text paragraphs, preserving `<p>` and line-break structure. Do not inject provider HTML with `set:html`: content from arbitrary Mastodon instances is untrusted.
- Render image attachments as `<figure><img ... loading="lazy"></figure>` using their URL and description. Render non-image attachments as ordinary links rather than adding media-player behavior.
- Attribute the post with the API status/account display name, federated account address, canonical status URL, and ISO timestamp. Render the blockquote with the deterministic `lang="en"` attribute; do not trust or pass through the API's optional `language` field.

## Failure behavior

Failure is deliberate: normal builds fail descriptively when a snapshot is missing, malformed, or mismatched with its URL. They never fall back to a live fetch. The explicit refresh command fails on invalid or unsupported URL shapes, non-success responses, malformed API payloads, unavailable/deleted statuses, and network errors; it writes nothing unless every referenced embed refreshes successfully. There is no automatic refresh, retry, or stale-data policy.

## Scope and alternatives

The first version targets the public Mastodon REST status representation and the standard Mastodon URL shape ending in a numeric status ID. It supports formatted content safely as text and image attachments. It does not initially embed polls, boosts, content-warning interactions, video, or audio; non-image media stays reachable through attachment links.

ActivityPub document fetching was rejected for now because cross-software object/media normalization is significantly broader. Mastodon oEmbed was rejected because it returns provider-generated HTML/JavaScript rather than the requested semantic markup.

## Verification

Use the repository's Node test runner (`pnpm test`). Unit tests cover URL parsing, snapshot lookup, response normalization, and failure paths through injected `fetch` implementations. Refresh-command tests cover literal MDX URL extraction and deterministic generated output. Run formatting, linting, Astro type checking, and the test suite after implementation.
