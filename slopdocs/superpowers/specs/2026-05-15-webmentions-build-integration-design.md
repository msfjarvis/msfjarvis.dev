# Webmentions build integration design

## Summary

Replace the current webmentions manifest shape with a URL-based manifest that includes per-page `lastmod`, then add an Astro integration that compares the newly built manifest against the deployed manifest at `$SITE_URL` and sends outgoing webmention processing events to the webmention server.

## Goals

- Preserve `/webmentions-manifest.json` as the public build artifact.
- Remove file-path tracking from the manifest.
- Require explicit per-page modification timestamps via `lastmod`.
- Diff built content against the currently deployed site state.
- Trigger `/send` requests for `publish`, `update`, and `delete` events.
- Surface all send outcomes in a tabulated build summary.

## Non-goals

- Recreate Netlify changed-file behavior.
- Retry failed `/send` requests inside the site build.
- Fail the build because one or more `/send` calls failed.
- Introduce a new test framework.

## Manifest contract

`src/pages/webmentions-manifest.json.ts` remains the source of the generated manifest route.

The manifest will move to `schemaVersion: 2` and emit entries shaped like:

```json
{
  "url": "https://example.com/posts/hello/",
  "lastmod": "2026-05-15T12:34:56.000Z"
}
```

Full manifest shape:

```json
{
  "schemaVersion": 2,
  "siteOrigin": "https://example.com",
  "generatedAt": "2026-05-15T12:34:56.000Z",
  "entries": [
    {
      "url": "https://example.com/posts/hello/",
      "lastmod": "2026-05-15T12:34:56.000Z"
    }
  ]
}
```

The `source` field is removed entirely.

## lastmod validation rules

All included posts, notes, and weeknotes must provide a valid `lastmod`.

Rules:

- If `WORKERS_CI` is unset, any entry with a missing or invalid `lastmod` fails the build.
- If `WORKERS_CI` is set, any entry with a missing or invalid `lastmod` is skipped and a warning is logged.
- No fallback timestamp is permitted.

A valid `lastmod` means a value that can be converted into a valid ISO timestamp for manifest output.

## Architecture

Introduce a shared utility module for webmentions manifest logic. This module will own:

- manifest entry creation from content collections
- `lastmod` validation and skipping/failure behavior
- manifest serialization shape
- diffing previous and current manifests by URL

This shared module will be used by both:

1. `src/pages/webmentions-manifest.json.ts` for route generation
2. a new Astro integration for post-build diffing and send orchestration

## Diff behavior

The Astro integration will run after build output is available.

Workflow:

1. Read the generated `webmentions-manifest.json` from build output.
2. Fetch the deployed manifest from `${SITE_URL}/webmentions-manifest.json`.
3. Fail the build if fetching the deployed manifest fails for any reason.
4. Compare old and new manifests by `url`.
5. Emit send events with the following mapping:
   - URL only in new manifest -> `publish`
   - URL in both manifests with changed `lastmod` -> `update`
   - URL only in old manifest -> `delete`

No event is emitted for unchanged entries.

## Send behavior

For each diff event, the integration will call:

`POST ${WORKER_ORIGIN}/send`

Headers:

- `Authorization: Bearer ${AUTH_TOKEN}`
- `Content-Type: application/json`

Body:

```json
{
  "pageUrl": "https://example.com/posts/hello/",
  "reason": "publish"
}
```

The same body shape is used for `update` and `delete`.

## Error handling

### Build-failing conditions

The build must fail when:

- local/non-Workers CI validation finds a missing or invalid `lastmod`
- the deployed manifest cannot be fetched successfully
- the deployed manifest is invalid JSON or does not match the expected contract enough to diff safely
- required integration configuration is missing

### Non-failing conditions

The build must not fail when:

- one or more `/send` requests fail

Instead, send failures are recorded in the final summary table.

## Summary output

After all send attempts complete, print a tabulated summary including at least:

- page URL
- reason (`publish`, `update`, `delete`)
- result (`success` or `failed`)
- optional status detail such as HTTP status or error text

Behavior:

- attempt all sends even if earlier ones fail
- print a summary even if some sends failed
- do not convert send failures into a build failure

## Configuration

The integration will read explicit configuration for:

- webmention worker origin
- webmention auth token

This configuration will be passed from `astro.config.mjs` into the integration, following existing environment-driven site configuration patterns.

## Testing

Tests should be added only if they can be implemented with the default Node.js test runner and existing project tooling.

Acceptable test coverage, if feasible:

- manifest validation behavior
- manifest diff classification
- send orchestration summary behavior

If achieving this would require introducing a separate test framework, skip tests for this change.

## Implementation notes

- Keep manifest URL generation aligned with existing route patterns for posts, notes, and weeknotes.
- Preserve deterministic entry ordering in the manifest.
- Use a shared manifest parser/validator for reading the built and deployed manifests so diffing logic has one contract.
- The integration should be quiet when there are no diffs except for a concise summary.

## Open decisions resolved

- `/send` failures do not fail the build.
- Missing or invalid `lastmod` never falls back.
- `WORKERS_CI` controls skip-with-warning versus fail-fast validation.
- Tests are optional and only allowed with the built-in Node.js runner.