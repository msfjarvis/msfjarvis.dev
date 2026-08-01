import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  importReadingCatalog,
  normalizeTitleSlug,
  parseBookwyrmExport,
  projectBook,
  renderMdx,
  selectReadthrough,
} from "./import-bookwyrm-reading.mjs";

function readthrough({
  start_date = "2026-01-01T00:00:00Z",
  finish_date = null,
  stopped_date = null,
} = {}) {
  return { start_date, finish_date, stopped_date };
}

function book(id, shelf, readthroughs, overrides = {}) {
  const { authors, edition: editionOverrides, ...remaining } = overrides;
  return {
    edition: {
      id: `https://bookwyrm.social/book/${id}`,
      title: id,
      work: `https://bookwyrm.social/work/${id}`,
      cover: {
        url: `images/covers/${id}.jpg`,
        name: `Cover: ${id}`,
      },
      series: "A Series",
      seriesNumber: "2",
      publishedDate: "2024-06-01",
      firstPublishedDate: "2020-01-01",
      ...editionOverrides,
    },
    authors: authors ?? [
      { name: "Ada Lovelace" },
      { name: "https://bookwyrm.social/author/1" },
      "HTTP://example.test/author",
    ],
    shelves: [
      {
        id: `https://bookwyrm.social/user/reader/books/${shelf}`,
        name: shelf,
      },
    ],
    readthroughs,
    ...remaining,
  };
}

function exportData(...books) {
  return { books };
}

test("imports all reading shelves and projects BookWyrm read-through timestamps", async () => {
  const destination = await mkdtemp(join(tmpdir(), "bookwyrm-import-"));
  try {
    const result = await importReadingCatalog({
      destination,
      exportData: exportData(
        book("Earlier", "read", [
          readthrough({
            start_date: "2026-01-01T00:00:00Z",
            finish_date: "2026-01-02T00:00:00Z",
          }),
        ]),
        book("Later", "read", [
          readthrough({
            start_date: "2026-01-01T00:00:00Z",
            finish_date: "2026-02-03T00:00:00Z",
          }),
        ]),
        book("Current", "reading", [
          readthrough({ start_date: "2026-03-04T00:00:00Z" }),
        ]),
        book("Stopped", "stopped-reading", [
          readthrough({
            start_date: "2026-02-01T00:00:00Z",
            stopped_date: "2026-02-05T00:00:00Z",
          }),
        ]),
      ),
    });

    assert.deepEqual(result, {
      count: 4,
      shelves: { read: 2, reading: 1, "stopped-reading": 1 },
    });
    const current = await readFile(
      join(destination, "current", "index.mdx"),
      "utf8",
    );
    assert.match(current, /bookAuthors:\n {2}- "Ada Lovelace"\n/);
    assert.doesNotMatch(current, /bookwyrm\.social\/author/);
    assert.match(current, /readingStartedAt: "2026-03-04T00:00:00Z"/);
    assert.match(current, /readingLastReadAt: "2026-03-04T00:00:00Z"/);
    assert.doesNotMatch(current, /reading(Finished|Stopped)At/);

    const stopped = await readFile(
      join(destination, "stopped", "index.mdx"),
      "utf8",
    );
    assert.match(stopped, /readingShelf: stopped-reading/);
    assert.match(stopped, /readingStoppedAt: "2026-02-05T00:00:00Z"/);
    assert.match(stopped, /readingLastReadAt: "2026-02-05T00:00:00Z"/);
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});

test("selects the most recently completed read-through instead of shelf position", () => {
  assert.deepEqual(
    selectReadthrough([
      readthrough({
        start_date: "2025-01-01T00:00:00Z",
        finish_date: "2025-01-02T00:00:00Z",
      }),
      readthrough({
        start_date: "2026-01-01T00:00:00Z",
        finish_date: "2026-01-03T00:00:00Z",
      }),
    ]),
    {
      startedAt: "2026-01-01T00:00:00Z",
      finishedAt: "2026-01-03T00:00:00Z",
      stoppedAt: undefined,
      lastReadAt: "2026-01-03T00:00:00Z",
    },
  );
});

test("uses firstPublishedDate when publishedDate is absent", () => {
  const projected = projectBook(
    book(
      "Fallback",
      "read",
      [readthrough({ finish_date: "2026-01-02T00:00:00Z" })],
      {
        edition: { publishedDate: "", firstPublishedDate: "1987-01-01" },
      },
    ),
  );
  assert.equal(projected.bookPublishedYear, 1987);
});

test("normalizes diacritics, ampersands, and punctuation", () => {
  assert.equal(normalizeTitleSlug("Élan & Co. — Vol. 2"), "elan-and-co-vol-2");
});

test("renders empty authors and omits unavailable cover metadata", () => {
  const projected = projectBook(
    book(
      "No metadata",
      "read",
      [readthrough({ finish_date: "2026-01-02T00:00:00Z" })],
      {
        authors: [],
        edition: { cover: undefined },
      },
    ),
  );
  const mdx = renderMdx(projected);
  assert.match(mdx, /bookAuthors: \[\]\n/);
  assert.doesNotMatch(mdx, /bookCover:/);
});

test("parses extracted archive JSON and rejects malformed export data", () => {
  assert.deepEqual(parseBookwyrmExport('{"books":[]}'), { books: [] });
  assert.throws(
    () => parseBookwyrmExport('{"notBooks":[]}'),
    /archive\.json has no books array/,
  );
});

test("rejects inconsistent shelf/read-through data", () => {
  assert.throws(
    () =>
      projectBook(
        book("Unfinished", "read", [
          readthrough({ start_date: "2026-01-01T00:00:00Z" }),
        ]),
      ),
    /read shelf entry has no finish_date/,
  );
  assert.throws(
    () =>
      selectReadthrough([
        readthrough({
          finish_date: "2026-01-02T00:00:00Z",
          stopped_date: "2026-01-03T00:00:00Z",
        }),
      ]),
    /both finish_date and stopped_date/,
  );
  assert.throws(
    () =>
      selectReadthrough([
        readthrough({
          start_date: "2026-01-03T00:00:00Z",
          finish_date: "2026-01-02T00:00:00Z",
        }),
      ]),
    /ends before it starts/,
  );
});

test("refuses to overwrite a populated destination unless forced", async () => {
  const fs = {
    isPopulated: async () => true,
    mkdir: async () => {},
    readFile: async () => {
      throw new Error("should not read");
    },
    writeFile: async () => {
      throw new Error("should not write");
    },
  };
  await assert.rejects(
    importReadingCatalog({
      exportData: exportData(
        book("Read", "read", [
          readthrough({ finish_date: "2026-01-02T00:00:00Z" }),
        ]),
      ),
      fs,
    }),
    /Refusing to overwrite populated destination/,
  );
});

test("requires an account export", async () => {
  await assert.rejects(
    importReadingCatalog(),
    /Provide a BookWyrm account export/,
  );
});
