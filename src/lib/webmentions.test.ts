import assert from "node:assert/strict";
import test from "node:test";

import { buildManifestEntry } from "./webmentions.ts";

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
