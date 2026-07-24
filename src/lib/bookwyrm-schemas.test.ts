import assert from "node:assert/strict";
import test from "node:test";

import { pageSchema } from "./bookwyrm-schemas.ts";

const context = ["https://www.w3.org/ns/activitystreams", { Hashtag: "as:Hashtag" }];

function edition(overrides: Record<string, unknown> = {}) {
  return {
    id: "https://bookwyrm.social/book/1244830",
    type: "Edition",
    title: "Mother of Learning: ARC 3",
    sortTitle: "mother of learning: arc 3",
    subtitle: "",
    description: "<p>A book description.</p>",
    languages: ["English"],
    series: "Mother of Learning",
    seriesNumber: "3",
    seriesBooks: [],
    subjects: [],
    subjectPlaces: [],
    authors: ["https://bookwyrm.social/author/26138"],
    firstPublishedDate: "",
    publishedDate: "2022-09-05",
    fileLinks: [],
    cover: {
      type: "Image",
      url: "https://bookwyrm-social.sfo3.digitaloceanspaces.com/images/covers/cover.jpeg",
      name: "Mother of Learning: ARC 3",
      "@context": context,
    },
    work: "https://bookwyrm.social/book/1244831",
    isbn10: "",
    isbn13: "",
    oclcNumber: "",
    pages: 743,
    physicalFormat: "EBook",
    physicalFormatDetail: "",
    publishers: ["Wraithmarked Creative, LLC"],
    editionRank: 7,
    "@context": context,
    ...overrides,
  };
}

test("parses BookWyrm pages with independently optional edition metadata", () => {
  const page = pageSchema.parse({
    id: "https://bookwyrm.social/user/msfjarvis/books/read?page=1",
    type: "OrderedCollectionPage",
    partOf: "https://bookwyrm.social/user/msfjarvis/books/read",
    orderedItems: [
      edition({ asin: "B0BCGMW45C" }),
      edition({
        openlibraryKey: "OL26796237M",
        goodreadsKey: "20758105",
        subjects: ["Fiction", "Science Fiction"],
        firstPublishedDate: "2010-05-03",
      }),
      edition({ isfdb: "317247" }),
      edition({
        openlibraryKey: "OL60858456M",
        lastEditedBy: "https://bookwyrm.social/user/msfjarvis",
        subtitle: "How We Think about the Future",
        fileLinks: [
          {
            href: "https://www.kobo.com/us/en/ebook/could-should-might-don-t",
            mediaType: "EPUB",
            attributedTo: "https://bookwyrm.social/user/msfjarvis",
            availability: "purchase",
          },
        ],
      }),
      edition({
        openlibraryKey: "OL30036715M",
        inventaireId: "isbn:9780593135204",
        librarythingKey: "",
        goodreadsKey: "54493401",
        asin: "B08FHBV4ZX",
        lastEditedBy: "https://bookwyrm.social/user/eviley3",
      }),
      edition({
        openlibraryKey: "OL27983419M",
        librarythingKey: "",
        subtitle: undefined,
      }),
    ],
    next: "https://bookwyrm.social/user/msfjarvis/books/read?page=2",
    "@context": context,
  });

  assert.equal(page.orderedItems.length, 6);
  assert.equal(page.orderedItems[0].asin, "B0BCGMW45C");
  assert.equal(page.orderedItems[2].isfdb, "317247");
  assert.equal(page.orderedItems[4].inventaireId, "isbn:9780593135204");
  assert.equal(page.orderedItems[5].subtitle, undefined);
  assert.equal(page.orderedItems[0].firstPublishedDate, undefined);
  assert.equal(page.orderedItems[1].firstPublishedDate?.toISOString(), "2010-05-03T00:00:00.000Z");
  assert.equal(page.orderedItems[0].publishedDate?.toISOString(), "2022-09-05T00:00:00.000Z");
});

test("parses sparse editions and a previous-page link", () => {
  const { pages, subtitle, ...feverCode } = edition({
    id: "https://bookwyrm.social/book/521695",
    inventaireId: "isbn:9780553513097",
    title: "The Fever Code",
    sortTitle: "fever code",
    publishedDate: "2016-09-27",
    publishers: [],
    physicalFormat: "",
  });

  const page = pageSchema.parse({
    id: "https://bookwyrm.social/user/msfjarvis/books/read?page=2",
    type: "OrderedCollectionPage",
    partOf: "https://bookwyrm.social/user/msfjarvis/books/read",
    orderedItems: [feverCode],
    next: "https://bookwyrm.social/user/msfjarvis/books/read?page=3",
    prev: "https://bookwyrm.social/user/msfjarvis/books/read?page=1",
    "@context": context,
  });

  assert.equal(page.prev, "https://bookwyrm.social/user/msfjarvis/books/read?page=1");
  assert.equal(page.orderedItems[0].subtitle, undefined);
  assert.equal(page.orderedItems[0].pages, undefined);
});

test("normalizes an empty published date", () => {
  const parsed = pageSchema.parse({
    id: "https://bookwyrm.social/user/msfjarvis/books/read?page=3",
    type: "OrderedCollectionPage",
    partOf: "https://bookwyrm.social/user/msfjarvis/books/read",
    orderedItems: [edition({ publishedDate: "" })],
    "@context": context,
  });

  assert.equal(parsed.orderedItems[0].publishedDate, undefined);
});
