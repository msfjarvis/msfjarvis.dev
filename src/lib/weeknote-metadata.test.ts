import assert from "node:assert/strict";
import test from "node:test";

import { deriveWeeknoteMetadata } from "./weeknote-metadata.ts";

test("derives canonical ISO weeknote metadata", () => {
  assert.deepEqual(
    deriveWeeknoteMetadata(new Date("2026-08-16T00:00:00.000Z")),
    {
      title: "Weeknotes: Week #33 (2026)",
      slug: "week-33-2026",
    },
  );
});

test("uses the ISO week-year at a calendar-year boundary", () => {
  assert.deepEqual(
    deriveWeeknoteMetadata(new Date("2021-01-01T00:00:00.000Z")),
    {
      title: "Weeknotes: Week #53 (2020)",
      slug: "week-53-2020",
    },
  );
});
