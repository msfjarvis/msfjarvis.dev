import { formatReelMdx, parseReelMdx } from "./reel-format.ts";
import type { ReelEntry } from "./reel-format.ts";
import assert from "node:assert/strict";
import test from "node:test";

const entry: ReelEntry = {
  title: "HoloTrials: Case Covered",
  date: "2026-09-13",
  cover: "./cover.webp",
  subtitle: "Thirty-one frames, left to right.",
  frames: [
    {
      src: "./opening_shot.webp",
      alt: "Wide view of a low-poly schoolyard.",
      title: "Schoolyard, first frame",
      caption: "Wide shot of the schoolyard.",
    },
    {
      src: "./cover.webp",
      alt: "Kronii in the trial room.",
      title: "Ouro Kronii, trial room",
      caption: "Eyes closed, one hand raised.",
    },
  ],
};

test("reel entries round-trip through the custom format", () => {
  const mdx = formatReelMdx(entry);

  assert.match(mdx, /^---\ntitle: "HoloTrials: Case Covered"\n/);
  assert.match(
    mdx,
    /^import Frame from "\.\.\/\.\.\/\.\.\/components\/Frame\.astro";$/m,
  );
  assert.match(mdx, /^import opening_shot from "\.\/opening_shot\.webp";$/m);
  assert.match(mdx, /^import cover from "\.\/cover\.webp";$/m);
  assert.match(mdx, /image=\{opening_shot\}/);

  assert.deepEqual(parseReelMdx(mdx), entry);
});

test("an omitted subtitle is not written or parsed", () => {
  const { subtitle: _subtitle, ...withoutSubtitle } = entry;
  const mdx = formatReelMdx(withoutSubtitle);

  assert.doesNotMatch(mdx, /^subtitle:/m);
  assert.deepEqual(parseReelMdx(mdx), withoutSubtitle);
});

test("repeated images share a single import", () => {
  const mdx = formatReelMdx({
    ...entry,
    frames: [...entry.frames, { ...entry.frames[0]! }],
  });

  assert.equal(mdx.match(/import opening_shot/g)?.length, 1);
  assert.equal(parseReelMdx(mdx).frames.length, 3);
});

test("plain string image attributes are accepted", () => {
  const mdx = [
    "---",
    'title: "Plain"',
    'date: "2026-09-13"',
    'cover: "./cover.webp"',
    "---",
    "",
    '<Frame image="./shot.webp" title="Shot" caption="Caption" alt="Alt" />',
    "",
  ].join("\n");

  assert.deepEqual(parseReelMdx(mdx).frames, [
    { src: "./shot.webp", alt: "Alt", title: "Shot", caption: "Caption" },
  ]);
});
