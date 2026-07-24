import assert from "node:assert/strict";
import test from "node:test";
import type { z } from "astro/zod";

import { bookwyrmLoader } from "./bookwyrm-loader.ts";

const context = ["https://www.w3.org/ns/activitystreams", { Hashtag: "as:Hashtag" }];

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
      url: "https://example.com/cover.jpg",
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

test("preserves BookWyrm shelf order across pages", async () => {
  const originalFetch = globalThis.fetch;
  let clearCalls = 0;
  const storedIds: string[] = [];

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
    const loader = bookwyrmLoader({ profileUrl: "https://bookwyrm.social/user/reader" });
    await loader.load({
      store: {
        clear: () => (clearCalls += 1),
        set: (entry: z.infer<typeof loader.schema>) => storedIds.push(entry.id),
      },
    } as unknown as Parameters<typeof loader.load>[0]);

    assert.equal(clearCalls, 1);
    assert.deepEqual(storedIds, [
      "00000000:https://bookwyrm.social/book/most-recent-shelf-book",
      "00000001:https://bookwyrm.social/book/page-one-last",
      "00000002:https://bookwyrm.social/book/page-two-first",
      "00000003:https://bookwyrm.social/book/oldest-shelf-book",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
