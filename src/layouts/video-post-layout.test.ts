import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const layout = readFileSync(new URL("./VideoPostLayout.astro", import.meta.url), "utf8");
const script = layout.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];

test("video-focused layout preserves standalone scale but leaves rows unscaled", () => {
  assert.ok(script);

  function player(inRow: boolean) {
    const video = {
      style: { zoom: "0.1", aspectRatio: "" },
      readyState: 1,
      videoWidth: 90,
      videoHeight: 195,
      classList: { add() {} },
      getAttribute: () => null,
    };
    return {
      video,
      closest: () => (inRow ? {} : null),
      querySelector: (selector: string) => (selector === "video" ? video : null),
      getAttribute: () => null,
    };
  }

  const standalone = player(false);
  const row = player(true);
  const shell = { querySelectorAll: () => [standalone, row] };
  runInNewContext(script, { document: { querySelector: () => shell } });

  assert.equal(standalone.video.style.zoom, "0.1");
  assert.equal(row.video.style.zoom, "");
});
