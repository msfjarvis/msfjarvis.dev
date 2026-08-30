import assert from "node:assert/strict";
import test from "node:test";

import { getPagePathname } from "./opengraph-images.ts";

test("maps directory OpenGraph image paths back to their page paths", () => {
  assert.equal(getPagePathname("/posts/example/index.png"), "/posts/example/");
  assert.equal(getPagePathname("/notes/example/index.png"), "/notes/example/");
});

test("ignores image paths that are not directory OpenGraph images", () => {
  assert.equal(getPagePathname("/posts/example.png"), undefined);
  assert.equal(getPagePathname("/posts/example/index.webp"), undefined);
});
