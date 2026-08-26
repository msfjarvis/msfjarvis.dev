import assert from "node:assert/strict";
import test from "node:test";
import {
  clearOpenLibraryCache,
  lookupOpenLibraryBook,
  parseOpenLibraryUrl,
} from "./open-library-lookup.ts";

function mockFetch(records: Record<string, unknown>, calls: string[] = []) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const body = records[url];
    if (!body) return new Response("missing", { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  };
}

test("parses exact work and edition identities", () => {
  assert.deepEqual(
    parseOpenLibraryUrl(
      "https://openlibrary.org/works/ol123w/an/ordinary/title?view=1#details",
    ),
    { kind: "work", key: "OL123W" },
  );
  assert.deepEqual(parseOpenLibraryUrl("https://openlibrary.org/books/OL9M/"), {
    kind: "edition",
    key: "OL9M",
  });
  assert.equal(
    parseOpenLibraryUrl("http://openlibrary.org/works/OL123W"),
    undefined,
  );
  assert.equal(
    parseOpenLibraryUrl("https://openlibrary.org/works/OL123W.json"),
    undefined,
  );
  assert.equal(
    parseOpenLibraryUrl("https://openlibrary.org/books/OL123W"),
    undefined,
  );
  assert.equal(
    parseOpenLibraryUrl("https://openlibrary.org/search?q=OL123W"),
    undefined,
  );
});

test("looks up a work with bounded authors and normalizes metadata", async () => {
  clearOpenLibraryCache();
  const calls: string[] = [];
  const fetch = mockFetch(
    {
      "https://openlibrary.org/works/OL123W.json": {
        title: "A Work",
        covers: [42],
        authors: [
          { author: { key: "/authors/OL1A" } },
          { author: { key: "/authors/OL2A" } },
        ],
      },
      "https://openlibrary.org/authors/OL1A.json": { name: "One" },
      "https://openlibrary.org/authors/OL2A.json": { name: "Two" },
    },
    calls,
  );
  const result = await lookupOpenLibraryBook(
    "https://openlibrary.org/works/OL123W",
    { fetch },
  );
  assert.deepEqual(result, {
    bookTitle: "A Work",
    bookAuthors: ["One", "Two"],
    bookCover: "https://covers.openlibrary.org/b/id/42-L.jpg",
    bookCoverAlt: "Cover of A Work",
    bookSeries: "",
    bookSeriesNumber: "",
    bookPublishedYear: undefined,
  });
  assert.equal(calls.length, 3);
});

test("resolves editions and falls back to work cover/year", async () => {
  clearOpenLibraryCache();
  const fetch = mockFetch({
    "https://openlibrary.org/books/OL9M.json": {
      title: "Edition",
      works: [{ key: "https://openlibrary.org/works/OL123W/title" }],
      publish_date: "2018",
    },
    "https://openlibrary.org/works/OL123W.json": {
      title: "Work",
      covers: [7],
      first_publish_year: 1999,
      series: ["Saga"],
    },
  });
  const result = await lookupOpenLibraryBook(
    "https://openlibrary.org/books/OL9M",
    { fetch },
  );
  assert.equal(result.bookTitle, "Edition");
  assert.equal(result.bookCover, "https://covers.openlibrary.org/b/id/7-L.jpg");
  assert.equal(result.bookPublishedYear, 2018);
  assert.equal(result.bookSeries, "Saga");
});

test("uses one deadline for sequential author requests", async () => {
  clearOpenLibraryCache();
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = url.endsWith("/works/OL2W.json")
      ? { title: "Slow", authors: [{ author: { key: "/authors/OL1A" } }] }
      : { name: "Author" };
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 20);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
    return new Response(JSON.stringify(body));
  };
  await assert.rejects(
    () =>
      lookupOpenLibraryBook("https://openlibrary.org/works/OL2W", {
        fetch,
        timeoutMs: 5,
      }),
    /timed out/,
  );
});

test("custom fetches are not cached and failures can be retried", async () => {
  clearOpenLibraryCache();
  let calls = 0;
  const fetch = async () => {
    calls++;
    if (calls === 1) return new Response("nope", { status: 500 });
    return new Response(JSON.stringify({ title: "Retry" }));
  };
  await assert.rejects(() =>
    lookupOpenLibraryBook("https://openlibrary.org/works/OL3W", { fetch }),
  );
  const result = await lookupOpenLibraryBook(
    "https://openlibrary.org/works/OL3W",
    { fetch },
  );
  assert.equal(result.bookTitle, "Retry");
});

test("reports HTTP and timeout failures and permits retry", async () => {
  clearOpenLibraryCache();
  await assert.rejects(
    () => lookupOpenLibraryBook("https://openlibrary.org/works/nope"),
    /exact HTTPS/,
  );
  const slow = async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  await assert.rejects(
    () =>
      lookupOpenLibraryBook("https://openlibrary.org/works/OL1W", {
        fetch: slow,
        timeoutMs: 1,
      }),
    /timed out/,
  );
  const retry = mockFetch({
    "https://openlibrary.org/works/OL1W.json": { title: "Retry" },
  });
  const result = await lookupOpenLibraryBook(
    "https://openlibrary.org/works/OL1W",
    { fetch: retry },
  );
  assert.equal(result.bookTitle, "Retry");
});
