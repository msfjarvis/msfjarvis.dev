# Webmentions Build Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the webmentions manifest with `{ url, lastmod }` entries and add an Astro build integration that diffs against the deployed manifest and sends `publish`/`update`/`delete` events.

**Architecture:** Extract manifest creation, manifest parsing, and diffing into a focused `src/lib/webmentions.ts` module. Keep `src/pages/webmentions-manifest.json.ts` as the route that serializes the manifest, then add a new `src/integrations/webmentions.ts` integration wired from `astro.config.mjs` to fetch the deployed manifest, diff it against the built manifest, send all `/send` events, and print a summary table without failing the build for send failures.

**Tech Stack:** Astro 6, TypeScript, Cloudflare adapter, Node.js built-in `node:test`, native `fetch`, `node:fs/promises`, `node:path`

---

## File structure

- Modify: `src/pages/webmentions-manifest.json.ts`
  - Replace inline manifest assembly with shared helpers.
- Create: `src/lib/webmentions.ts`
  - Define manifest types, manifest builder, validation helpers, parser, diff logic, and summary formatting helpers.
- Create: `src/integrations/webmentions.ts`
  - Implement Astro integration hook that reads built manifest, fetches deployed manifest, sends events, and logs summary output.
- Modify: `astro.config.mjs`
  - Register the new integration and pass env-driven config.
- Modify: `src/content.config.ts`
  - Make `lastmod` required in collection schema if that improves earlier validation without breaking the `WORKERS_CI` skip requirement; otherwise leave schema as-is and validate in shared helpers.
- Create if feasible: `src/lib/webmentions.test.ts`
  - Node built-in test coverage for validation, parsing, diffing, and summary-friendly send result shaping.

### Task 1: Inspect current content metadata and decide validation boundary

**Files:**

- Modify: `src/content.config.ts`
- Modify: `src/lib/webmentions.ts`

- [ ] **Step 1: Inspect whether `lastmod` can remain optional in schema**

Review `src/content.config.ts` and confirm whether collection parsing must tolerate missing `lastmod` so `WORKERS_CI` builds can skip entries later.

Expected decision: keep `lastmod` optional in schema and enforce required-when-included in shared webmentions logic.

- [ ] **Step 2: Write the failing test for `lastmod` validation if Node test runner is practical**

Create `src/lib/webmentions.test.ts` with:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildManifestEntry } from "./webmentions.js";

test("buildManifestEntry throws when lastmod is missing outside WORKERS_CI", () => {
  assert.throws(
    () =>
      buildManifestEntry({
        collection: "posts",
        id: "hello",
        data: { lastmod: undefined },
        siteUrl: "https://example.com",
        workersCi: false,
      }),
    /lastmod/i,
  );
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test src/lib/webmentions.test.ts`

Expected: FAIL because `src/lib/webmentions.ts` or `buildManifestEntry` does not exist yet.

- [ ] **Step 4: Write the minimal shared helper skeleton**

Create `src/lib/webmentions.ts` with:

```ts
export type WebmentionsCollection = "posts" | "notes" | "weeknotes";

export interface BuildManifestEntryInput {
  collection: WebmentionsCollection;
  id: string;
  data: { lastmod?: Date };
  siteUrl: string;
  workersCi: boolean;
}

export interface WebmentionsManifestEntry {
  url: string;
  lastmod: string;
}

export function buildManifestEntry(
  input: BuildManifestEntryInput,
): WebmentionsManifestEntry | null {
  const { collection, id, data, siteUrl, workersCi } = input;
  if (!(data.lastmod instanceof Date) || Number.isNaN(data.lastmod.valueOf())) {
    if (workersCi) return null;
    throw new Error(`Missing or invalid lastmod for ${collection}/${id}`);
  }
  const basePath = collection === "posts" ? "posts" : "notes";
  const urlPath = collection === "weeknotes" ? `notes/${id}/` : `${basePath}/${id}/`;
  return {
    url: new URL(urlPath, `${siteUrl}/`).toString(),
    lastmod: data.lastmod.toISOString(),
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test src/lib/webmentions.test.ts`

Expected: PASS for the new validation test.

- [ ] **Step 6: Commit**

```bash
git add src/lib/webmentions.ts src/lib/webmentions.test.ts src/content.config.ts
git commit -m "feat: add webmentions manifest entry validation"
```

### Task 2: Build and serialize the new manifest from shared helpers

**Files:**

- Modify: `src/lib/webmentions.ts`
- Modify: `src/pages/webmentions-manifest.json.ts`
- Test: `src/lib/webmentions.test.ts`

- [ ] **Step 1: Write the failing test for full manifest assembly**

Add to `src/lib/webmentions.test.ts`:

```ts
test("buildManifest sorts entries and emits schemaVersion 2", () => {
  const manifest = buildManifest({
    siteUrl: "https://example.com",
    generatedAt: new Date("2026-05-15T00:00:00.000Z"),
    entries: [
      { url: "https://example.com/posts/z/", lastmod: "2026-01-02T00:00:00.000Z" },
      { url: "https://example.com/notes/a/", lastmod: "2026-01-01T00:00:00.000Z" },
    ],
  });

  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(
    manifest.entries.map((entry) => entry.url),
    ["https://example.com/notes/a/", "https://example.com/posts/z/"],
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/webmentions.test.ts`

Expected: FAIL because `buildManifest` does not exist.

- [ ] **Step 3: Implement minimal manifest builder and route integration**

Extend `src/lib/webmentions.ts` with:

```ts
export interface WebmentionsManifest {
  schemaVersion: 2;
  siteOrigin: string;
  generatedAt: string;
  entries: WebmentionsManifestEntry[];
}

export function buildManifest(input: {
  siteUrl: string;
  generatedAt: Date;
  entries: WebmentionsManifestEntry[];
}): WebmentionsManifest {
  return {
    schemaVersion: 2,
    siteOrigin: input.siteUrl,
    generatedAt: input.generatedAt.toISOString(),
    entries: [...input.entries].sort((a, b) => a.url.localeCompare(b.url)),
  };
}
```

Replace `src/pages/webmentions-manifest.json.ts` with code shaped like:

```ts
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_URL } from "../consts";
import { buildManifest, buildManifestEntry } from "../lib/webmentions";
import { filterDrafts } from "../utils";

export const prerender = true;

export async function GET(_context: APIContext) {
  const workersCi = Boolean(process.env.WORKERS_CI);
  const collections = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("notes", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const entries = collections.flatMap((items, index) => {
    const collection = ["posts", "notes", "weeknotes"][index] as const;
    return items.flatMap((item) => {
      const entry = buildManifestEntry({
        collection,
        id: item.id,
        data: { lastmod: item.data.lastmod },
        siteUrl: SITE_URL,
        workersCi,
      });
      return entry ? [entry] : [];
    });
  });

  return new Response(
    JSON.stringify(
      buildManifest({
        siteUrl: SITE_URL,
        generatedAt: new Date(),
        entries,
      }),
      null,
      2,
    ),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/webmentions.test.ts`

Expected: PASS for manifest assembly tests.

- [ ] **Step 5: Build the site to verify the new route serializes**

Run: `npm run build`

Expected: Astro build succeeds or fails only on real missing `lastmod` violations.

- [ ] **Step 6: Commit**

```bash
git add src/lib/webmentions.ts src/pages/webmentions-manifest.json.ts src/lib/webmentions.test.ts
git commit -m "feat: emit schema v2 webmentions manifest"
```

### Task 3: Add parser and diff helpers for deployed-versus-built manifest comparison

**Files:**

- Modify: `src/lib/webmentions.ts`
- Test: `src/lib/webmentions.test.ts`

- [ ] **Step 1: Write the failing test for diff classification**

Add to `src/lib/webmentions.test.ts`:

```ts
test("diffManifests classifies publish update and delete", () => {
  const previous = {
    schemaVersion: 2,
    siteOrigin: "https://example.com",
    generatedAt: "2026-05-14T00:00:00.000Z",
    entries: [
      { url: "https://example.com/posts/old/", lastmod: "2026-05-01T00:00:00.000Z" },
      { url: "https://example.com/posts/same/", lastmod: "2026-05-01T00:00:00.000Z" },
      { url: "https://example.com/posts/gone/", lastmod: "2026-05-01T00:00:00.000Z" },
    ],
  };

  const next = {
    schemaVersion: 2,
    siteOrigin: "https://example.com",
    generatedAt: "2026-05-15T00:00:00.000Z",
    entries: [
      { url: "https://example.com/posts/old/", lastmod: "2026-05-02T00:00:00.000Z" },
      { url: "https://example.com/posts/same/", lastmod: "2026-05-01T00:00:00.000Z" },
      { url: "https://example.com/posts/new/", lastmod: "2026-05-15T00:00:00.000Z" },
    ],
  };

  assert.deepEqual(diffManifests(previous, next), [
    { pageUrl: "https://example.com/posts/gone/", reason: "delete" },
    { pageUrl: "https://example.com/posts/new/", reason: "publish" },
    { pageUrl: "https://example.com/posts/old/", reason: "update" },
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/webmentions.test.ts`

Expected: FAIL because `diffManifests` does not exist.

- [ ] **Step 3: Implement parser and diff helpers**

Extend `src/lib/webmentions.ts` with:

```ts
export interface WebmentionSendEvent {
  pageUrl: string;
  reason: "publish" | "update" | "delete";
}

export function parseManifest(value: unknown): WebmentionsManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid webmentions manifest");
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== 2)
    throw new Error("Unsupported webmentions manifest schemaVersion");
  if (!Array.isArray(manifest.entries)) throw new Error("Invalid webmentions manifest entries");
  for (const entry of manifest.entries) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid webmentions manifest entry");
    const record = entry as Record<string, unknown>;
    if (typeof record.url !== "string" || typeof record.lastmod !== "string") {
      throw new Error("Invalid webmentions manifest entry shape");
    }
  }
  return manifest as WebmentionsManifest;
}

export function diffManifests(
  previous: WebmentionsManifest,
  next: WebmentionsManifest,
): WebmentionSendEvent[] {
  const previousMap = new Map(previous.entries.map((entry) => [entry.url, entry.lastmod]));
  const nextMap = new Map(next.entries.map((entry) => [entry.url, entry.lastmod]));
  const events: WebmentionSendEvent[] = [];

  for (const [url, lastmod] of previousMap) {
    if (!nextMap.has(url)) {
      events.push({ pageUrl: url, reason: "delete" });
      continue;
    }
    if (nextMap.get(url) !== lastmod) {
      events.push({ pageUrl: url, reason: "update" });
    }
  }

  for (const [url] of nextMap) {
    if (!previousMap.has(url)) {
      events.push({ pageUrl: url, reason: "publish" });
    }
  }

  return events.sort(
    (a, b) => a.pageUrl.localeCompare(b.pageUrl) || a.reason.localeCompare(b.reason),
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/webmentions.test.ts`

Expected: PASS for diff classification.

- [ ] **Step 5: Commit**

```bash
git add src/lib/webmentions.ts src/lib/webmentions.test.ts
git commit -m "feat: add webmentions manifest diff helpers"
```

### Task 4: Implement send orchestration and summary formatting helpers

**Files:**

- Modify: `src/lib/webmentions.ts`
- Test: `src/lib/webmentions.test.ts`

- [ ] **Step 1: Write the failing test for summary table formatting**

Add to `src/lib/webmentions.test.ts`:

```ts
test("formatSendSummary renders success and failure rows", () => {
  const output = formatSendSummary([
    {
      pageUrl: "https://example.com/posts/new/",
      reason: "publish",
      ok: true,
      status: 202,
      detail: "Accepted",
    },
    {
      pageUrl: "https://example.com/posts/bad/",
      reason: "update",
      ok: false,
      status: 500,
      detail: "Internal Server Error",
    },
  ]);

  assert.match(output, /publish/);
  assert.match(output, /failed/);
  assert.match(output, /Internal Server Error/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/webmentions.test.ts`

Expected: FAIL because `formatSendSummary` does not exist.

- [ ] **Step 3: Implement send result types and formatter**

Extend `src/lib/webmentions.ts` with:

```ts
export interface WebmentionSendResult {
  pageUrl: string;
  reason: WebmentionSendEvent["reason"];
  ok: boolean;
  status: number | null;
  detail: string;
}

export function formatSendSummary(results: WebmentionSendResult[]): string {
  const headers = ["pageUrl", "reason", "result", "detail"] as const;
  const rows = results.map((result) => ({
    pageUrl: result.pageUrl,
    reason: result.reason,
    result: result.ok ? "success" : "failed",
    detail: result.status === null ? result.detail : `${result.status} ${result.detail}`.trim(),
  }));
  const widths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => row[header].length)),
  );
  const pad = (value: string, index: number) => value.padEnd(widths[index]);
  const render = (values: string[]) => values.map(pad).join(" | ");
  return [
    render(headers.map(String)),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map((row) => render(headers.map((header) => row[header]))),
  ].join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/webmentions.test.ts`

Expected: PASS for summary formatting.

- [ ] **Step 5: Commit**

```bash
git add src/lib/webmentions.ts src/lib/webmentions.test.ts
git commit -m "feat: add webmentions send summary formatting"
```

### Task 5: Add the Astro integration that fetches, diffs, sends, and logs summary output

**Files:**

- Create: `src/integrations/webmentions.ts`
- Modify: `astro.config.mjs`
- Test: `src/lib/webmentions.test.ts`

- [ ] **Step 1: Write the failing test for send orchestration if extraction keeps it unit-testable**

Add to `src/lib/webmentions.test.ts`:

```ts
test("sendEvents attempts all sends and records failures", async () => {
  const calls: Array<{ pageUrl: string; reason: string }> = [];
  const results = await sendEvents({
    events: [
      { pageUrl: "https://example.com/posts/a/", reason: "publish" },
      { pageUrl: "https://example.com/posts/b/", reason: "update" },
    ],
    workerOrigin: "https://worker.example.com",
    authToken: "secret",
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      if (body.pageUrl.endsWith("/b/")) {
        return new Response("boom", { status: 500, statusText: "Internal Server Error" });
      }
      return new Response("ok", { status: 202, statusText: "Accepted" });
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(results[0]?.ok, true);
  assert.equal(results[1]?.ok, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/webmentions.test.ts`

Expected: FAIL because `sendEvents` does not exist.

- [ ] **Step 3: Implement `sendEvents` helper and the Astro integration**

Extend `src/lib/webmentions.ts` with:

```ts
export async function sendEvents(input: {
  events: WebmentionSendEvent[];
  workerOrigin: string;
  authToken: string;
  fetchImpl?: typeof fetch;
}): Promise<WebmentionSendResult[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  return Promise.all(
    input.events.map(async (event) => {
      try {
        const response = await fetchImpl(new URL("/send", input.workerOrigin), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        });
        const detail = response.statusText || (response.ok ? "OK" : "Request failed");
        return {
          pageUrl: event.pageUrl,
          reason: event.reason,
          ok: response.ok,
          status: response.status,
          detail,
        };
      } catch (error) {
        return {
          pageUrl: event.pageUrl,
          reason: event.reason,
          ok: false,
          status: null,
          detail: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );
}
```

Create `src/integrations/webmentions.ts` with code shaped like:

```ts
import type { AstroIntegration } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { diffManifests, formatSendSummary, parseManifest, sendEvents } from "../lib/webmentions";

export default function webmentionsIntegration(config: {
  siteUrl: string;
  workerOrigin?: string;
  authToken?: string;
}): AstroIntegration {
  return {
    name: "webmentions",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        if (!config.workerOrigin || !config.authToken) {
          throw new Error("Missing webmentions worker configuration");
        }

        const outputDir = dir.pathname;
        const manifestPath = path.join(outputDir, "webmentions-manifest.json");
        const builtManifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));

        const deployedResponse = await fetch(new URL("/webmentions-manifest.json", config.siteUrl));
        if (!deployedResponse.ok) {
          throw new Error(
            `Failed to fetch deployed webmentions manifest: ${deployedResponse.status} ${deployedResponse.statusText}`,
          );
        }
        const deployedManifest = parseManifest(await deployedResponse.json());

        const events = diffManifests(deployedManifest, builtManifest);
        const results = await sendEvents({
          events,
          workerOrigin: config.workerOrigin,
          authToken: config.authToken,
        });

        logger.info(
          events.length === 0
            ? "No webmention send events."
            : `Webmention send summary:\n${formatSendSummary(results)}`,
        );
      },
    },
  };
}
```

Update `astro.config.mjs` with:

```js
import webmentionsIntegration from "./src/integrations/webmentions.ts";

const webmentionWorkerOrigin = process.env.WEBMENTION_WORKER_ORIGIN;
const webmentionAuthToken = process.env.WEBMENTION_AUTH_TOKEN;

integrations: [
  mdx(),
  sitemap(),
  feedDiscovery(),
  webmentionsIntegration({
    siteUrl,
    workerOrigin: webmentionWorkerOrigin,
    authToken: webmentionAuthToken,
  }),
],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/webmentions.test.ts`

Expected: PASS for send orchestration.

- [ ] **Step 5: Build with env vars to verify integration wiring**

Run:

```bash
WEBMENTION_WORKER_ORIGIN=https://webmentions.example.com \
WEBMENTION_AUTH_TOKEN=secret \
npm run build
```

Expected: build reaches the integration, attempts deployed-manifest fetch, and either completes or fails only on real fetch/validation problems.

- [ ] **Step 6: Commit**

```bash
git add src/integrations/webmentions.ts astro.config.mjs src/lib/webmentions.ts src/lib/webmentions.test.ts
git commit -m "feat: send webmention updates during astro build"
```

### Task 6: Verify no-regression behavior and tighten noisy edges

**Files:**

- Modify: `src/lib/webmentions.ts`
- Modify: `src/integrations/webmentions.ts`
- Test: `src/lib/webmentions.test.ts`

- [ ] **Step 1: Write the failing test for `WORKERS_CI` skip behavior if tests are present**

Add to `src/lib/webmentions.test.ts`:

```ts
test("buildManifestEntry returns null for invalid lastmod in WORKERS_CI", () => {
  assert.equal(
    buildManifestEntry({
      collection: "notes",
      id: "hello",
      data: { lastmod: undefined },
      siteUrl: "https://example.com",
      workersCi: true,
    }),
    null,
  );
});
```

- [ ] **Step 2: Run the test to verify it fails if behavior is not already covered**

Run: `node --test src/lib/webmentions.test.ts`

Expected: FAIL only if skip behavior is not yet implemented.

- [ ] **Step 3: Add warning and empty-summary polish**

Adjust `src/pages/webmentions-manifest.json.ts` to warn when a page is skipped under `WORKERS_CI`, and adjust `src/integrations/webmentions.ts` to log a concise success line when there are no diff events.

Code shape:

```ts
if (entry === null && workersCi) {
  console.warn(
    `Skipping ${collection}/${item.id} in webmentions manifest due to missing or invalid lastmod`,
  );
}
```

and:

```ts
if (events.length === 0) {
  logger.info("No webmention send events.");
  return;
}
logger.info(`Webmention send summary:\n${formatSendSummary(results)}`);
```

- [ ] **Step 4: Run tests and build verification**

Run:

```bash
node --test src/lib/webmentions.test.ts
npm run build
```

Expected: tests pass if present; build succeeds or fails only on configured manifest-fetch/lastmod rules.

- [ ] **Step 5: Commit**

```bash
git add src/pages/webmentions-manifest.json.ts src/integrations/webmentions.ts src/lib/webmentions.ts src/lib/webmentions.test.ts
git commit -m "chore: polish webmentions build reporting"
```

## Self-review checklist

- Spec coverage: manifest shape, `WORKERS_CI` behavior, deployed manifest fetch failure, diff mapping, send summary, and non-failing `/send` errors are each covered by a dedicated task.
- Placeholder scan: no `TODO`/`TBD` placeholders remain; each code-changing step includes concrete code.
- Type consistency: the plan consistently uses `WebmentionsManifest`, `WebmentionsManifestEntry`, `WebmentionSendEvent`, `WebmentionSendResult`, `buildManifestEntry`, `buildManifest`, `parseManifest`, `diffManifests`, `sendEvents`, and `formatSendSummary`.
