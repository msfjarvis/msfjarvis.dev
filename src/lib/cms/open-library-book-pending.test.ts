import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPendingBook,
  consumePendingBook,
  getPendingBook,
  removePendingBook,
  setPendingBook,
  updatePendingBook,
} from "./open-library-book-pending.ts";

const fetched = {
  bookTitle: "Fetched",
  bookAuthors: ["Author"],
  bookWork: "https://openlibrary.org/works/OL1W",
  bookCover: "cover",
  bookCoverAlt: "Cover of Fetched",
  bookSeries: "Series",
  bookSeriesNumber: "1",
  bookPublishedYear: 2020,
};

test("pending metadata preserves siblings but applies explicit overrides", () => {
  setPendingBook("Fetched", fetched);
  const pending = getPendingBook("Fetched");
  assert.ok(pending);
  assert.deepEqual(
    applyPendingBook(
      { bookTitle: "Existing", bookAuthors: ["Kept"], bookWork: "" },
      pending,
    ),
    {
      bookTitle: "Existing",
      bookAuthors: ["Kept"],
      bookWork: fetched.bookWork,
      bookCover: "cover",
      bookCoverAlt: "Cover of Fetched",
      bookSeries: "Series",
      bookSeriesNumber: "1",
      bookPublishedYear: 2020,
    },
  );
  updatePendingBook(
    "Fetched",
    { ...fetched, bookTitle: "Edited" },
    {
      bookTitle: "Edited",
      bookAuthors: [],
    },
  );
  assert.equal(getPendingBook("Fetched"), undefined);
  const edited = getPendingBook("Edited");
  assert.ok(edited);
  assert.deepEqual(
    applyPendingBook({ bookTitle: "Edited", bookAuthors: ["Old"] }, edited),
    { ...fetched, bookTitle: "Edited", bookAuthors: [] },
  );
});

test("existing entries keep native edits, including cleared fields", () => {
  setPendingBook("Existing", fetched);
  const pending = getPendingBook("Existing");
  assert.ok(pending);
  assert.deepEqual(
    applyPendingBook(
      {
        bookTitle: "Existing",
        bookCover: "",
        bookSeries: "",
        bookAuthors: [],
      },
      pending,
      false,
    ),
    {
      bookTitle: "Existing",
      bookCover: "",
      bookSeries: "",
      bookAuthors: [],
    },
  );
});

test("new entries fill empty fields from fetched metadata", () => {
  setPendingBook("New", { ...fetched, bookTitle: "New" });
  const pending = getPendingBook("New");
  assert.ok(pending);
  assert.equal(
    applyPendingBook({ bookTitle: "New", bookCover: "" }, pending, true)
      .bookCover,
    "cover",
  );
});

test("pending records can be consumed or abandoned", () => {
  setPendingBook("Consumed", fetched);
  assert.ok(consumePendingBook("Consumed"));
  assert.equal(getPendingBook("Consumed"), undefined);
  setPendingBook("Abandoned", fetched);
  removePendingBook("Abandoned");
  assert.equal(getPendingBook("Abandoned"), undefined);
});

test("empty explicit overrides remove optional fields", () => {
  setPendingBook("Clear", { ...fetched, bookTitle: "Clear" });
  updatePendingBook(
    "Clear",
    { ...fetched, bookTitle: "Clear", bookCover: "" },
    {
      bookCover: "",
    },
  );
  const pending = getPendingBook("Clear");
  assert.ok(pending);
  assert.equal(
    applyPendingBook({ bookTitle: "Clear", bookCover: "old" }, pending)
      .bookCover,
    undefined,
  );
});

test("replace applies fetched fields to nonempty siblings", () => {
  setPendingBook("Replace", { ...fetched, bookTitle: "Replace" }, true);
  const pending = getPendingBook("Replace");
  assert.ok(pending);
  assert.deepEqual(
    applyPendingBook({ bookTitle: "Old", bookAuthors: ["Old"] }, pending),
    { ...fetched, bookTitle: "Replace" },
  );
});
