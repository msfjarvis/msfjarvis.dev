import assert from "node:assert/strict";
import test from "node:test";

import { fetchVoteSummary, parseVoteSummary, submitVote, VoteApiError } from "./votes-client.ts";

test("parses an upvote summary for the requested target", () => {
  assert.deepEqual(
    parseVoteSummary(
      { type: "upvote", postId: "posts/hello", total: 4, voted: true, outcome: "created" },
      { type: "upvote", postId: "posts/hello" },
    ),
    { type: "upvote", postId: "posts/hello", total: 4, voted: true },
  );
});

test("parses a poll summary and preserves configured response values", () => {
  assert.deepEqual(
    parseVoteSummary(
      {
        type: "poll",
        postId: "notes/hello",
        pollId: "editor",
        mode: "multiple",
        total: 3,
        results: [
          { choice: "vim", votes: 2 },
          { choice: "zed", votes: 1 },
        ],
        selection: ["vim"],
      },
      { type: "poll", postId: "notes/hello", pollId: "editor", mode: "multiple" },
    ),
    {
      type: "poll",
      postId: "notes/hello",
      pollId: "editor",
      mode: "multiple",
      total: 3,
      results: [
        { choice: "vim", votes: 2 },
        { choice: "zed", votes: 1 },
      ],
      selection: ["vim"],
    },
  );
});

test("serializes summary requests through a global queue", async () => {
  const originalFetch = globalThis.fetch;
  const queueKey = Symbol.for("msfjarvis.dev.votes.summary-request-queue");
  const sharedGlobal = globalThis as typeof globalThis & Record<symbol, unknown>;
  delete sharedGlobal[queueKey];

  let resolveFirst: ((response: Response) => void) | undefined;
  const firstResponse = new Promise<Response>((resolve) => (resolveFirst = resolve));
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input) => {
    requestedUrls.push(String(input));
    if (requestedUrls.length === 1) return firstResponse;
    return jsonResponse({ type: "upvote", postId: "posts/second", total: 2, voted: false });
  }) as typeof fetch;

  try {
    const first = fetchVoteSummary({ type: "upvote", postId: "posts/first" });
    const second = fetchVoteSummary({ type: "upvote", postId: "posts/second" });
    await flushQueuedRequest();

    assert.equal(requestedUrls.length, 1);
    resolveFirst?.(jsonResponse({ type: "upvote", postId: "posts/first", total: 1, voted: true }));
    await first;
    await second;
    assert.equal(requestedUrls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete sharedGlobal[queueKey];
  }
});

test("releases the summary queue after request errors", async () => {
  const originalFetch = globalThis.fetch;
  const queueKey = Symbol.for("msfjarvis.dev.votes.summary-request-queue");
  const sharedGlobal = globalThis as typeof globalThis & Record<symbol, unknown>;
  delete sharedGlobal[queueKey];

  let requestCount = 0;
  globalThis.fetch = (async () => {
    requestCount += 1;
    if (requestCount === 1) throw new Error("network unavailable");
    return jsonResponse({ type: "upvote", postId: "posts/second", total: 0, voted: false });
  }) as typeof fetch;

  try {
    const first = fetchVoteSummary({ type: "upvote", postId: "posts/first" });
    const second = fetchVoteSummary({ type: "upvote", postId: "posts/second" });

    await assert.rejects(first, VoteApiError);
    assert.deepEqual(await second, {
      type: "upvote",
      postId: "posts/second",
      total: 0,
      voted: false,
    });
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete sharedGlobal[queueKey];
  }
});

test("releases the summary queue after API errors", async () => {
  const originalFetch = globalThis.fetch;
  const queueKey = Symbol.for("msfjarvis.dev.votes.summary-request-queue");
  const sharedGlobal = globalThis as typeof globalThis & Record<symbol, unknown>;
  delete sharedGlobal[queueKey];

  let requestCount = 0;
  globalThis.fetch = (async () => {
    requestCount += 1;
    if (requestCount === 1) return jsonResponse({ error: "temporarily unavailable" }, 503);
    return jsonResponse({ type: "upvote", postId: "posts/second", total: 0, voted: false });
  }) as typeof fetch;

  try {
    const first = fetchVoteSummary({ type: "upvote", postId: "posts/first" });
    const second = fetchVoteSummary({ type: "upvote", postId: "posts/second" });

    await assert.rejects(first, VoteApiError);
    await second;
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete sharedGlobal[queueKey];
  }
});

test("does not queue vote mutations behind summary requests", async () => {
  const originalFetch = globalThis.fetch;
  const queueKey = Symbol.for("msfjarvis.dev.votes.summary-request-queue");
  const sharedGlobal = globalThis as typeof globalThis & Record<symbol, unknown>;
  delete sharedGlobal[queueKey];

  let resolveSummary: ((response: Response) => void) | undefined;
  const summaryResponse = new Promise<Response>((resolve) => (resolveSummary = resolve));
  const methods: string[] = [];
  globalThis.fetch = (async (_input, init) => {
    const method = init?.method ?? "GET";
    methods.push(method);
    if (method === "GET") return summaryResponse;
    return jsonResponse({ type: "upvote", postId: "posts/hello", total: 1, voted: true });
  }) as typeof fetch;

  try {
    const summary = fetchVoteSummary({ type: "upvote", postId: "posts/hello" });
    await flushQueuedRequest();
    const mutation = submitVote({ type: "upvote", postId: "posts/hello" });

    assert.deepEqual(methods, ["GET", "POST"]);
    await mutation;
    resolveSummary?.(
      jsonResponse({ type: "upvote", postId: "posts/hello", total: 0, voted: false }),
    );
    await summary;
  } finally {
    globalThis.fetch = originalFetch;
    delete sharedGlobal[queueKey];
  }
});

test("rejects summaries for a different target or with invalid counts", () => {
  assert.throws(
    () =>
      parseVoteSummary(
        { type: "upvote", postId: "posts/other", total: 1, voted: false },
        { type: "upvote", postId: "posts/hello" },
      ),
    VoteApiError,
  );

  assert.throws(
    () =>
      parseVoteSummary(
        {
          type: "poll",
          postId: "posts/hello",
          pollId: "editor",
          mode: "single",
          total: 1,
          results: [{ choice: "vim", votes: -1 }],
          selection: ["vim"],
        },
        { type: "poll", postId: "posts/hello", pollId: "editor", mode: "single" },
      ),
    VoteApiError,
  );
});

function flushQueuedRequest(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
