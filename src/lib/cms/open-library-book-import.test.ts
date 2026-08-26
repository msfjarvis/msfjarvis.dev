import assert from "node:assert/strict";
import test from "node:test";
import {
  openLibraryBookMetadataFieldNames,
  openLibraryBookMetadataFields,
} from "./open-library-book-fields.ts";
import {
  applyImportedBook,
  isImportedBook,
} from "./open-library-book-import.ts";

const fetched = {
  bookTitle: "Fetched",
  bookAuthors: ["Author"],
  bookCover: "cover",
  bookCoverAlt: "Cover of Fetched",
  bookSeries: "Series",
  bookSeriesNumber: "1",
  bookPublishedYear: 2020,
};

test("every imported field is declared in the CMS metadata fields", () => {
  assert.deepEqual(openLibraryBookMetadataFieldNames, [
    "bookTitle",
    ...openLibraryBookMetadataFields.map((field) => field.name),
  ]);
});

test("imported metadata is optional before the pre-save merge", () => {
  assert.ok(
    openLibraryBookMetadataFields.every((field) => field.required === false),
  );
});

test("optional metadata patterns accept empty fields before pre-save", () => {
  for (const fieldName of ["bookCover"]) {
    const field = openLibraryBookMetadataFields.find(
      (candidate) => candidate.name === fieldName,
    );
    if (!field || !("pattern" in field)) {
      throw new Error(`Missing pattern for ${fieldName}`);
    }
    assert.match("", new RegExp(field.pattern[0]));
  }
});

test("a lookup replaces persisted metadata and removes its draft value", () => {
  assert.deepEqual(
    applyImportedBook(
      {
        bookImport: fetched,
        bookTitle: "Old",
        bookAuthors: ["Old author"],
        bookCover: "old-cover",
        readingShelf: "reading",
      },
      fetched,
    ),
    { ...fetched, readingShelf: "reading" },
  );
});

test("only complete Open Library lookups are imported", () => {
  assert.equal(isImportedBook(fetched), true);
  assert.equal(isImportedBook({ bookTitle: "Incomplete" }), false);
  assert.equal(isImportedBook(null), false);
});
