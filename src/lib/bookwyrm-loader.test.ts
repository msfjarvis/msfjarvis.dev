import assert from "node:assert/strict";
import test from "node:test";

import { bookwyrmLoader, Shelf } from "./bookwyrm-loader.ts";

const context = ["https://www.w3.org/ns/activitystreams", { Hashtag: "as:Hashtag" }];
const coverUrl =
  "https://bookwyrm-social.sfo3.digitaloceanspaces.com/images/covers/b16526ac-5885-4889-bcfa-e618f846c12e.jpeg";

function edition(id: string, publishedDate: string) {
  return {
    id: `https://bookwyrm.social/book/${id}`,
    type: "Edition",
    asin: "",
    goodreadsKey: "",
    inventaireId: "",
    isfdb: "",
    lastEditedBy: "",
    librarythingKey: "",
    oclcNumber: "",
    openlibraryKey: "",
    title: id,
    sortTitle: id,
    description: "",
    languages: [],
    series: "",
    seriesNumber: "",
    seriesBooks: [],
    subjects: [],
    subjectPlaces: [],
    authors: [],
    firstPublishedDate: "",
    publishedDate,
    fileLinks: [],
    cover: {
      type: "Image",
      url: coverUrl,
      name: id,
      "@context": context,
    },
    work: `https://bookwyrm.social/work/${id}`,
    isbn10: "",
    isbn13: "",
    pages: 1,
    physicalFormat: "",
    physicalFormatDetail: "",
    publishers: [],
    editionRank: 0,
    "@context": context,
  };
}

function page(pageNumber: number, orderedItems: ReturnType<typeof edition>[]) {
  return {
    id: `https://bookwyrm.social/user/reader/books/read?page=${pageNumber}`,
    type: "OrderedCollectionPage",
    partOf: "https://bookwyrm.social/user/reader/books/read",
    orderedItems,
    "@context": context,
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body));
}

test("preserves BookWyrm shelf order and remote cover URLs", async () => {
  const originalFetch = globalThis.fetch;
  let clearCalls = 0;
  const storedBooks: { id: string; coverUrl: string }[] = [];

  globalThis.fetch = async (input) => {
    switch (String(input)) {
      case "https://bookwyrm.social/user/reader/books/read.json":
        return jsonResponse({
          id: "https://bookwyrm.social/user/reader/books/read",
          type: "OrderedCollection",
          totalItems: 4,
          first: "https://bookwyrm.social/user/reader/books/read?page=1",
          last: "https://bookwyrm.social/user/reader/books/read?page=2",
          name: "Read books",
          owner: "https://bookwyrm.social/user/reader",
          to: [],
          cc: [],
          "@context": context,
        });
      case "https://bookwyrm.social/user/reader/books/read.json?page=1":
        return jsonResponse(
          page(1, [
            edition("most-recent-shelf-book", "1998-01-01"),
            edition("page-one-last", "2000-01-01"),
          ]),
        );
      case "https://bookwyrm.social/user/reader/books/read.json?page=2":
        return jsonResponse(
          page(2, [
            edition("page-two-first", "2025-01-01"),
            edition("oldest-shelf-book", "2024-01-01"),
          ]),
        );
      default:
        throw new Error(`Unexpected fetch: ${input}`);
    }
  };

  try {
    const loader = bookwyrmLoader({
      profileUrl: "https://bookwyrm.social/user/reader",
      shelf: Shelf.read,
    });
    await loader.load({
      store: {
        clear: () => (clearCalls += 1),
        set: (entry: { id: string; data: { cover: { url: string } } }) =>
          storedBooks.push({ id: entry.id, coverUrl: entry.data.cover.url }),
      },
    } as unknown as Parameters<typeof loader.load>[0]);

    assert.equal(clearCalls, 1);
    assert.deepEqual(
      storedBooks.map((book) => book.id),
      [
        "00000000:https://bookwyrm.social/book/most-recent-shelf-book",
        "00000001:https://bookwyrm.social/book/page-one-last",
        "00000002:https://bookwyrm.social/book/page-two-first",
        "00000003:https://bookwyrm.social/book/oldest-shelf-book",
      ],
    );
    assert.deepEqual(
      storedBooks.map((book) => book.coverUrl),
      [coverUrl, coverUrl, coverUrl, coverUrl],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
