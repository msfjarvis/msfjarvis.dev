import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManifest,
  buildManifestEntry,
  diffManifests,
  formatSendSummary,
  parseManifest,
  sendEvents,
} from "./webmentions.ts";

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

test("diffManifests classifies publish update and delete", () => {
  const previous = {
    schemaVersion: 2 as const,
    siteOrigin: "https://example.com",
    generatedAt: "2026-05-14T00:00:00.000Z",
    entries: [
      { url: "https://example.com/posts/old/", lastmod: "2026-05-01T00:00:00.000Z" },
      { url: "https://example.com/posts/same/", lastmod: "2026-05-01T00:00:00.000Z" },
      { url: "https://example.com/posts/gone/", lastmod: "2026-05-01T00:00:00.000Z" },
    ],
  };

  const next = {
    schemaVersion: 2 as const,
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

test("parseManifest bridges schema version 1 manifests", () => {
  const manifest = parseManifest({
    schemaVersion: 1,
    siteOrigin: "https://example.com",
    generatedAt: "2026-05-14T00:00:00.000Z",
    entries: [
      { source: "src/content/posts/old.mdx", url: "https://example.com/posts/old/" },
      { source: "src/content/posts/gone.mdx", url: "https://example.com/posts/gone/" },
    ],
  });

  assert.deepEqual(manifest, {
    schemaVersion: 2,
    siteOrigin: "https://example.com",
    generatedAt: "2026-05-14T00:00:00.000Z",
    entries: [
      { url: "https://example.com/posts/old/", lastmod: "1970-01-01T00:00:00.000Z" },
      { url: "https://example.com/posts/gone/", lastmod: "1970-01-01T00:00:00.000Z" },
    ],
  });
});

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
