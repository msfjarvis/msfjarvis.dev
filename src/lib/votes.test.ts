import assert from "node:assert/strict";
import test from "node:test";

import {
  applyRetractionToSummary,
  applyVoteToSummary,
  getVoteSummary,
  parseVoteSubmission,
  parseVoteTarget,
  recordVote,
  retractVote,
  VoteValidationError,
  voteTargetFromQuery,
  type VoteStore,
} from "./votes.ts";

test("records idempotent upvotes once per voter", async () => {
  const memory = createMemoryStore();
  const submission = parseVoteSubmission({ type: "upvote", postId: "hello-world" });

  assert.equal(await recordVote(memory.store, submission, "alice"), "created");
  assert.equal(await recordVote(memory.store, submission, "alice"), "unchanged");
  assert.equal(await recordVote(memory.store, submission, "bob"), "created");
  assert.equal(memory.writes(), 2);

  assert.deepEqual(
    await getVoteSummary(memory.store, { type: "upvote", postId: "hello-world" }, "alice"),
    { type: "upvote", postId: "hello-world", total: 2, voted: true },
  );
  assert.deepEqual(
    await getVoteSummary(memory.store, { type: "upvote", postId: "hello-world" }, "carol"),
    { type: "upvote", postId: "hello-world", total: 2, voted: false },
  );
});

test("aggregates single-choice poll ballots and lets a voter change their choice", async () => {
  const memory = createMemoryStore();
  const target = {
    type: "poll" as const,
    postId: "roadmap",
    pollId: "next-feature",
    mode: "single" as const,
  };

  await recordVote(
    memory.store,
    parseVoteSubmission({ ...target, type: "single", choice: "search" }),
    "alice",
  );
  await recordVote(
    memory.store,
    parseVoteSubmission({ ...target, type: "single", choice: "themes" }),
    "bob",
  );
  assert.equal(
    await recordVote(
      memory.store,
      parseVoteSubmission({ ...target, type: "single", choice: "themes" }),
      "alice",
    ),
    "updated",
  );

  assert.deepEqual(await getVoteSummary(memory.store, target, "alice"), {
    type: "poll",
    postId: "roadmap",
    pollId: "next-feature",
    mode: "single",
    total: 2,
    results: [{ choice: "themes", votes: 2 }],
    selection: ["themes"],
  });
});

test("counts every selection in multiple-choice ballots", async () => {
  const memory = createMemoryStore(1);
  const target = {
    type: "poll" as const,
    postId: "languages",
    pollId: "favorites",
    mode: "multiple" as const,
  };

  await recordVote(
    memory.store,
    parseVoteSubmission({
      type: "multiple",
      postId: target.postId,
      pollId: target.pollId,
      choices: ["rust", "kotlin"],
    }),
    "alice",
  );
  await recordVote(
    memory.store,
    parseVoteSubmission({
      type: "multiple",
      postId: target.postId,
      pollId: target.pollId,
      choices: ["typescript", "kotlin"],
    }),
    "bob",
  );

  assert.deepEqual(await getVoteSummary(memory.store, target, "bob"), {
    type: "poll",
    postId: "languages",
    pollId: "favorites",
    mode: "multiple",
    total: 2,
    results: [
      { choice: "kotlin", votes: 2 },
      { choice: "rust", votes: 1 },
      { choice: "typescript", votes: 1 },
    ],
    selection: ["kotlin", "typescript"],
  });
});

test("retracts poll ballots", async () => {
  const memory = createMemoryStore();
  const target = {
    type: "poll" as const,
    postId: "roadmap",
    pollId: "next-feature",
    mode: "single" as const,
  };
  const submission = parseVoteSubmission({
    type: "single",
    postId: target.postId,
    pollId: target.pollId,
    choice: "search",
  });

  await recordVote(memory.store, submission, "alice");
  await retractVote(memory.store, target, "alice");

  assert.deepEqual(await getVoteSummary(memory.store, target, "alice"), {
    ...target,
    total: 0,
    results: [],
    selection: [],
  });
});

test("keeps single- and multiple-choice poll modes isolated", async () => {
  const memory = createMemoryStore();
  await recordVote(
    memory.store,
    parseVoteSubmission({
      type: "single",
      postId: "post",
      pollId: "poll",
      choice: "one",
    }),
    "alice",
  );
  await recordVote(
    memory.store,
    parseVoteSubmission({
      type: "multiple",
      postId: "post",
      pollId: "poll",
      choices: ["one", "two"],
    }),
    "bob",
  );

  assert.equal(
    (
      await getVoteSummary(
        memory.store,
        { type: "poll", postId: "post", pollId: "poll", mode: "single" },
        "alice",
      )
    ).total,
    1,
  );
  assert.equal(
    (
      await getVoteSummary(
        memory.store,
        { type: "poll", postId: "post", pollId: "poll", mode: "multiple" },
        "bob",
      )
    ).total,
    1,
  );
});

test("updates summaries without reading KV after a committed mutation", () => {
  const submission = parseVoteSubmission({
    type: "multiple",
    postId: "post",
    pollId: "poll",
    choices: ["one", "two"],
  });
  const current = {
    type: "poll" as const,
    postId: "post",
    pollId: "poll",
    mode: "multiple" as const,
    total: 1,
    results: [{ choice: "one", votes: 1 }],
    selection: ["one"],
  };

  const updated = applyVoteToSummary(current, submission);
  assert.deepEqual(updated, {
    ...current,
    results: [
      { choice: "one", votes: 1 },
      { choice: "two", votes: 1 },
    ],
    selection: ["one", "two"],
  });
  assert.deepEqual(applyRetractionToSummary(updated), {
    ...current,
    total: 0,
    results: [],
    selection: [],
  });
});

test("validates vote payloads and targets", () => {
  assert.throws(
    () =>
      parseVoteSubmission({
        type: "multiple",
        postId: "post",
        pollId: "poll",
        choices: ["same", "same"],
      }),
    VoteValidationError,
  );
  assert.throws(
    () => parseVoteSubmission({ type: "single", postId: "post", pollId: "poll" }),
    /choice/,
  );
  assert.throws(
    () => parseVoteSubmission({ type: "upvote", postId: "spaces are not IDs" }),
    /postId/,
  );
  assert.throws(
    () =>
      parseVoteSubmission({
        type: "multiple",
        postId: "post",
        pollId: "poll",
        choices: Array.from({ length: 9 }, (_, index) => `${index}${"x".repeat(63)}`),
      }),
    /total no more/,
  );
  assert.deepEqual(
    parseVoteTarget({ type: "poll", postId: "post", pollId: "poll", mode: "single" }),
    {
      type: "poll",
      postId: "post",
      pollId: "poll",
      mode: "single",
    },
  );
  assert.deepEqual(voteTargetFromQuery(new URLSearchParams({ postId: "post" })), {
    type: "upvote",
    postId: "post",
  });
  assert.throws(
    () => voteTargetFromQuery(new URLSearchParams({ postId: "post", pollId: "poll" })),
    /mode/,
  );
});

function createMemoryStore(pageSize = 1_000): {
  store: VoteStore;
  writes: () => number;
} {
  const values = new Map<string, unknown>();
  let writeCount = 0;

  return {
    writes: () => writeCount,
    store: {
      async getMetadata(key) {
        return values.get(key) ?? null;
      },
      async put(key, metadata) {
        writeCount += 1;
        values.set(key, metadata);
      },
      async delete(key) {
        values.delete(key);
      },
      async list(prefix, cursor) {
        const matching = Array.from(values.entries())
          .filter(([key]) => key.startsWith(prefix))
          .sort(([left], [right]) => left.localeCompare(right));
        const start = cursor === undefined ? 0 : Number(cursor);
        const entries = matching
          .slice(start, start + pageSize)
          .map(([key, metadata]) => ({ key, metadata }));
        const next = start + entries.length;
        return {
          entries,
          ...(next < matching.length && { cursor: String(next) }),
        };
      },
    },
  };
}
