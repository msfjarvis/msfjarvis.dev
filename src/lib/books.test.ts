import assert from "node:assert/strict";
import test from "node:test";

import { bookSchema, orderBooks, partitionBooks } from "./books.ts";

function book(overrides: Record<string, unknown> = {}) {
  return {
    bookTitle: "A book",
    bookAuthors: ["An author"],
    bookWork: "https://bookwyrm.social/book/1",
    readingShelf: "read",
    readingStartedAt: "2026-01-01T00:00:00Z",
    readingFinishedAt: "2026-01-02T00:00:00Z",
    readingLastReadAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function entry(data: Record<string, unknown>, id: string) {
  return { id, data: bookSchema.parse(data) };
}

test("parses the flat book frontmatter contract", () => {
  const parsed = bookSchema.parse(
    book({
      bookCover: "https://example.com/cover.jpg",
      bookCoverAlt: "A cover",
      bookSeries: "A series",
      bookSeriesNumber: "2",
      bookPublishedYear: 2024,
      readingShelf: "stopped-reading",
      readingFinishedAt: undefined,
      readingStoppedAt: "2026-01-02T00:00:00Z",
    }),
  );

  assert.equal(parsed.bookTitle, "A book");
  assert.equal(parsed.bookPublishedYear, 2024);
  assert.equal(parsed.readingShelf, "stopped-reading");
  assert.equal(parsed.readingStoppedAt, "2026-01-02T00:00:00Z");
});

test("allows local cover paths", () => {
  const parsed = bookSchema.parse(book({ bookCover: "./cover.jpg" }));

  assert.equal(parsed.bookCover, "./cover.jpg");
});

test("allows missing optional book and reading metadata", () => {
  const parsed = bookSchema.parse(
    book({
      readingStartedAt: undefined,
      readingFinishedAt: undefined,
      readingLastReadAt: undefined,
    }),
  );

  assert.equal(parsed.bookCover, undefined);
  assert.equal(parsed.bookPublishedYear, undefined);
  assert.equal(parsed.readingLastReadAt, undefined);
});

test("rejects invalid URLs, timestamps, and inconsistent reading data", () => {
  assert.throws(() =>
    bookSchema.parse(book({ bookWork: "http://example.com" })),
  );
  assert.throws(() => bookSchema.parse(book({ bookPublishedYear: 2024.5 })));
  assert.throws(() =>
    bookSchema.parse(book({ readingStartedAt: "yesterday" })),
  );
  assert.throws(() =>
    bookSchema.parse(book({ readingStoppedAt: "2026-01-02T00:00:00Z" })),
  );
  assert.throws(() =>
    bookSchema.parse(
      book({
        readingStoppedAt: "2026-01-02T00:00:00Z",
        readingLastReadAt: "2026-01-03T00:00:00Z",
      }),
    ),
  );
});

test("orders all books by their latest reading timestamp, descending", () => {
  const books = [
    entry(
      book({
        readingStartedAt: undefined,
        readingFinishedAt: undefined,
        readingLastReadAt: undefined,
      }),
      "undated",
    ),
    entry(
      book({
        readingStartedAt: "2026-01-03T00:00:00Z",
        readingFinishedAt: "2026-01-04T00:00:00Z",
        readingLastReadAt: "2026-01-04T00:00:00Z",
      }),
      "older",
    ),
    entry(
      book({
        readingStartedAt: "2026-01-01T00:00:00+01:00",
        readingFinishedAt: "2026-01-01T00:00:00+01:00",
        readingLastReadAt: "2026-01-01T00:00:00+01:00",
      }),
      "offset-older",
    ),
    entry(
      book({
        readingStartedAt: "2025-12-31T23:30:00Z",
        readingFinishedAt: "2025-12-31T23:30:00Z",
        readingLastReadAt: "2025-12-31T23:30:00Z",
      }),
      "utc-newer",
    ),
  ];

  assert.deepEqual(
    orderBooks(books).map((book) => book.id),
    ["older", "utc-newer", "offset-older", "undated"],
  );
});

test("partitions the one ordered catalog into all reading shelves", () => {
  const books = [
    entry(
      book({
        readingShelf: "read",
        readingFinishedAt: "2026-01-03T00:00:00Z",
        readingLastReadAt: "2026-01-03T00:00:00Z",
      }),
      "finished",
    ),
    entry(
      book({
        readingShelf: "reading",
        readingFinishedAt: undefined,
        readingStartedAt: "2026-01-04T00:00:00Z",
        readingLastReadAt: "2026-01-04T00:00:00Z",
      }),
      "reading",
    ),
    entry(
      book({
        readingShelf: "stopped-reading",
        readingFinishedAt: undefined,
        readingStoppedAt: "2026-01-02T00:00:00Z",
        readingLastReadAt: "2026-01-02T00:00:00Z",
      }),
      "stopped",
    ),
  ];

  const shelves = partitionBooks(books);
  assert.deepEqual(
    shelves.currentlyReading.map((book) => book.id),
    ["reading"],
  );
  assert.deepEqual(
    shelves.finishedReading.map((book) => book.id),
    ["finished"],
  );
  assert.deepEqual(
    shelves.stoppedReading.map((book) => book.id),
    ["stopped"],
  );
});
