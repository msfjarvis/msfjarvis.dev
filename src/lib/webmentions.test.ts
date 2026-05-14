import assert from "node:assert/strict";
import test from "node:test";

import { buildManifest, buildManifestEntry, diffManifests } from "./webmentions.ts";

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
  assert.deepEqual(manifest.entries.map((entry) => entry.url), [
    "https://example.com/notes/a/",
    "https://example.com/posts/z/",
  ]);
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
