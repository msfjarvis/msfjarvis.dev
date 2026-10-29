import type { JsonValue, PollMode, VoteSummary } from "./votes.ts";

type UpvoteSubmission = { type: "upvote"; postId: string };

type SinglePollSubmission = {
  type: "single";
  postId: string;
  pollId: string;
  choice: string;
};

type MultiplePollSubmission = {
  type: "multiple";
  postId: string;
  pollId: string;
  choices: string[];
};

export type BrowserVoteSubmission =
  | UpvoteSubmission
  | SinglePollSubmission
  | MultiplePollSubmission;

export type BrowserVoteTarget =
  | UpvoteSubmission
  | { type: "poll"; postId: string; pollId: string; mode: PollMode };

export class VoteApiError extends Error {}

const summaryRequestQueueKey = Symbol.for("msfjarvis.dev.votes.summary-request-queue");

export function fetchVoteSummary(target: BrowserVoteTarget): Promise<VoteSummary> {
  const params = new URLSearchParams({ postId: target.postId });

  if (target.type === "poll") {
    params.set("pollId", target.pollId);
    params.set("mode", target.mode);
  }

  return queueSummaryRequest(() =>
    requestVote(`/api/votes.json?${params}`, { method: "GET" }, target),
  );
}

export function submitVote(submission: BrowserVoteSubmission): Promise<VoteSummary> {
  return requestVote(
    "/api/votes.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    },
    targetForSubmission(submission),
  );
}

export function clearVote(target: BrowserVoteTarget): Promise<VoteSummary> {
  return requestVote(
    "/api/votes.json",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    },
    target,
  );
}

export function parseVoteSummary(input: JsonValue, target: BrowserVoteTarget): VoteSummary {
  if (!isRecord(input)) throw new VoteApiError("The vote server returned an invalid response");

  const { total } = input;

  if (!isCount(total)) throw new VoteApiError("The vote server returned an invalid vote total");

  if (target.type === "upvote") {
    if (input.type !== "upvote" || input.postId !== target.postId || !isBoolean(input.voted)) {
      throw new VoteApiError("The vote server returned a response for a different upvote");
    }

    return { type: "upvote", postId: target.postId, total, voted: input.voted };
  }

  if (
    input.type !== "poll" ||
    input.postId !== target.postId ||
    input.pollId !== target.pollId ||
    input.mode !== target.mode ||
    !Array.isArray(input.results) ||
    !Array.isArray(input.selection)
  ) {
    throw new VoteApiError("The vote server returned a response for a different poll");
  }

  const results: Array<{ choice: string; votes: number }> = [];

  for (const result of input.results) {
    if (!isRecord(result) || !isString(result.choice) || !isCount(result.votes)) {
      throw new VoteApiError("The vote server returned invalid poll results");
    }

    results.push({ choice: result.choice, votes: result.votes });
  }

  if (!input.selection.every(isString)) {
    throw new VoteApiError("The vote server returned an invalid poll selection");
  }

  return {
    type: "poll",
    postId: target.postId,
    pollId: target.pollId,
    mode: target.mode,
    total,
    results,
    selection: [...input.selection],
  };
}

function queueSummaryRequest(request: () => Promise<VoteSummary>): Promise<VoteSummary> {
  // SAFETY: the symbol is process-global and stores only this module's serialized request tail.
  const sharedGlobal = globalThis as typeof globalThis & Record<symbol, Promise<void> | undefined>;
  const previousRequest = sharedGlobal[summaryRequestQueueKey] ?? Promise.resolve();
  const result = previousRequest.catch(() => undefined).then(request);

  sharedGlobal[summaryRequestQueueKey] = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

async function requestVote(
  url: string,
  init: RequestInit,
  target: BrowserVoteTarget,
): Promise<VoteSummary> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new VoteApiError("Could not reach the vote server. Please try again.");
  }

  let body: JsonValue;

  try {
    body = await response.json();
  } catch {
    throw new VoteApiError("The vote server returned an unreadable response");
  }

  if (!response.ok) {
    const message = isRecord(body) && isString(body.error) ? body.error : null;
    throw new VoteApiError(message ?? `Vote request failed (${response.status})`);
  }

  return parseVoteSummary(body, target);
}

function targetForSubmission(submission: BrowserVoteSubmission): BrowserVoteTarget {
  return submission.type === "upvote"
    ? submission
    : {
        type: "poll",
        postId: submission.postId,
        pollId: submission.pollId,
        mode: submission.type,
      };
}

function isRecord(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return value instanceof Object && !Array.isArray(value);
}

function isString(value: JsonValue | undefined): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

function isBoolean(value: JsonValue | undefined): value is boolean {
  return value === true || value === false;
}

function isCount(value: JsonValue | undefined): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
