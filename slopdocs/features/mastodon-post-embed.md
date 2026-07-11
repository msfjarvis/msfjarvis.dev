# Mastodon post embed

## Decision

Implement a server-rendered Astro component, `src/components/MastodonPost.astro`, with one required `url` prop:

```astro
<MastodonPost url="https://infosec.exchange/@0xabad1dea/116900098449254586" />
```

The component parses a repository-controlled Mastodon status URL and fetches the instance-local public REST endpoint, `https://<instance>/api/v1/statuses/<status-id>`. It emits a semantic, intentionally unstyled `blockquote` with `lang`, `cite`, and `data-source="fediverse"` attributes; post text; image attachments; and an author/timestamp footer linking to the canonical post URL.

## Rendering model

- Add `src/lib/mastodon.ts` for URL parsing, endpoint construction, fetch/response validation, and normalization. Keep it separate from Astro markup and accept an injectable `fetch` implementation for Node tests. The `url` prop is trusted site content, not untrusted request input: do not reuse this fetch path for visitor-supplied URLs without an outbound network policy that resolves and pins public IP addresses.
- Render with `MastodonPost.astro`; content pages are prerendered today, so the status fetch happens during the Astro build for those pages. The same component remains compatible with server-rendered routes.
- Convert remote status HTML into escaped plain-text paragraphs, preserving `<p>` and line-break structure. Do not inject provider HTML with `set:html`: content from arbitrary Mastodon instances is untrusted.
- Render image attachments as `<figure><img ... loading="lazy"></figure>`, using original width, height, URL, and description where supplied by the API.
- Render non-image attachments as ordinary links rather than adding media-player behavior.
- Attribute the post with the API status/account display name, federated account address, canonical status URL, and ISO timestamp. Render the blockquote with the deterministic `lang="en"` attribute; do not trust or pass through the API's optional `language` field.

## Failure behavior

Failure is deliberate: invalid or unsupported URL shapes, non-success responses, malformed API payloads, unavailable/deleted statuses, and network errors must throw descriptive errors. A broken upstream post must fail the build/request rather than silently produce a fallback link or incomplete page.

There is no fetch cache or retry policy in the first version. Each component render fetches its status once; caching can be added later if repeated embeds make it necessary.

## Scope and alternatives

The first version targets the public Mastodon REST status representation and the standard Mastodon URL shape ending in a numeric status ID. It supports formatted content safely as text and image attachments. It does not initially embed polls, boosts, content-warning interactions, video, or audio; non-image media stays reachable through attachment links.

ActivityPub document fetching was rejected for now because cross-software object/media normalization is significantly broader. Mastodon oEmbed was rejected because it returns provider-generated HTML/JavaScript rather than the requested semantic markup.

## Verification

Use the repository's Node test runner (`node --test ./**/*.test.ts`). Unit tests should cover URL parsing and endpoint generation, successful response normalization (body paragraphs, image metadata, and attribution), and all failure paths through injected `fetch` implementations. Run formatting, linting, Astro type checking, and the test suite after implementation.
