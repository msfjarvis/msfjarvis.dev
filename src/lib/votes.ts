const KEY_PREFIX = "votes:v1";
const MAX_MULTIPLE_CHOICES = 20;
const MAX_TOTAL_CHOICE_CHARACTERS = 512;
const MAX_DISTINCT_CHOICES = 100;
const MAX_BALLOTS_PER_TARGET = 50_000;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~/-]{0,127}$/;
const CHOICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~/-]{0,63}$/;

export type PollMode = "single" | "multiple";

export type VoteTarget =
  | { type: "upvote"; postId: string }
  | { type: "poll"; postId: string; pollId: string; mode: PollMode };

export type VoteSubmission =
  | { type: "upvote"; postId: string; choices: [] }
  | { type: "single"; postId: string; pollId: string; choices: [string] }
  | { type: "multiple"; postId: string; pollId: string; choices: string[] };

type BallotMetadata = {
  version: 1;
  type: VoteSubmission["type"];
  choices: string[];
};

export type VoteSummary =
  | {
      type: "upvote";
      postId: string;
      total: number;
      voted: boolean;
    }
  | {
      type: "poll";
      postId: string;
      pollId: string;
      mode: PollMode;
      total: number;
      results: Array<{ choice: string; votes: number }>;
      selection: string[];
    };

export interface VoteStore {
  getMetadata(key: string): Promise<unknown | null>;
  put(key: string, metadata: BallotMetadata): Promise<void>;
  delete(key: string): Promise<void>;
  list(
    prefix: string,
    cursor?: string,
  ): Promise<{
    entries: Array<{ key: string; metadata: unknown }>;
    cursor?: string;
  }>;
}

export class VoteValidationError extends Error {}
export class VoteCapacityError extends Error {}

export function createKvVoteStore(namespace: KVNamespace): VoteStore {
  return {
    async getMetadata(key) {
      const result = await namespace.getWithMetadata(key, "text");
      return result.value === null ? null : result.metadata;
    },
    async put(key, metadata) {
      await namespace.put(key, "1", { metadata });
    },
    async delete(key) {
      await namespace.delete(key);
    },
    async list(prefix, cursor) {
      const result = await namespace.list<unknown>({ prefix, cursor, limit: 1_000 });
      return {
        entries: result.keys.map(({ name, metadata }) => ({ key: name, metadata })),
        ...(!result.list_complete && { cursor: result.cursor }),
      };
    },
  };
}

export function parseVoteSubmission(input: unknown): VoteSubmission {
  const body = requireObject(input);
  const type = body.type;
  const postId = requireId(body.postId, "postId");

  switch (type) {
    case "upvote":
      return { type, postId, choices: [] };
    case "single":
      return {
        type,
        postId,
        pollId: requireId(body.pollId, "pollId"),
        choices: [requireChoiceId(body.choice)],
      };
    case "multiple": {
      const pollId = requireId(body.pollId, "pollId");
      if (!Array.isArray(body.choices)) {
        throw new VoteValidationError("choices must be an array");
      }
      if (body.choices.length === 0 || body.choices.length > MAX_MULTIPLE_CHOICES) {
        throw new VoteValidationError(
          `choices must contain between 1 and ${MAX_MULTIPLE_CHOICES} items`,
        );
      }

      const choices = body.choices.map(requireChoiceId).sort();
      if (new Set(choices).size !== choices.length) {
        throw new VoteValidationError("choices must not contain duplicates");
      }
      if (
        choices.reduce((total, choice) => total + choice.length, 0) > MAX_TOTAL_CHOICE_CHARACTERS
      ) {
        throw new VoteValidationError(
          `choice IDs must total no more than ${MAX_TOTAL_CHOICE_CHARACTERS} characters`,
        );
      }
      return { type, postId, pollId, choices };
    }
    default:
      throw new VoteValidationError("type must be upvote, single, or multiple");
  }
}

export function parseVoteTarget(input: unknown): VoteTarget {
  const body = requireObject(input);
  const type = body.type;
  const postId = requireId(body.postId, "postId");

  if (type === "upvote") return { type, postId };
  if (type === "poll") {
    return {
      type,
      postId,
      pollId: requireId(body.pollId, "pollId"),
      mode: requirePollMode(body.mode),
    };
  }
  throw new VoteValidationError("type must be upvote or poll");
}

export function voteTargetFromQuery(searchParams: URLSearchParams): VoteTarget {
  const postId = requireId(searchParams.get("postId"), "postId");
  const pollId = searchParams.get("pollId");
  const mode = searchParams.get("mode");
  if (pollId === null) {
    if (mode !== null) throw new VoteValidationError("mode requires pollId");
    return { type: "upvote", postId };
  }
  return {
    type: "poll",
    postId,
    pollId: requireId(pollId, "pollId"),
    mode: requirePollMode(mode),
  };
}

export async function hashVoterId(voterId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(voterId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordVote(
  store: VoteStore,
  submission: VoteSubmission,
  voterHash: string,
): Promise<"created" | "updated" | "unchanged"> {
  const target = voteTargetForSubmission(submission);
  const key = ballotKey(target, voterHash);
  const metadata: BallotMetadata = {
    version: 1,
    type: submission.type,
    choices: submission.choices,
  };
  const previous = await store.getMetadata(key);

  if (isBallotMetadata(previous) && ballotMetadataEqual(previous, metadata)) {
    return "unchanged";
  }

  await store.put(key, metadata);
  return previous === null ? "created" : "updated";
}

export async function retractVote(
  store: VoteStore,
  target: VoteTarget,
  voterHash: string,
): Promise<void> {
  await store.delete(ballotKey(target, voterHash));
}

export async function getVoteSummary(
  store: VoteStore,
  target: VoteTarget,
  voterHash: string,
): Promise<VoteSummary> {
  const prefix = targetPrefix(target);
  const viewerKey = ballotKey(target, voterHash);
  const counts = new Map<string, number>();
  let total = 0;
  let viewerVoted = false;
  let selection: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await store.list(prefix, cursor);
    for (const entry of page.entries) {
      const metadata = entry.metadata;
      if (!isBallotForTarget(metadata, target)) continue;

      total += 1;
      if (entry.key === viewerKey) {
        viewerVoted = true;
        selection = metadata.choices;
      }
      for (const choice of metadata.choices) {
        if (!counts.has(choice) && counts.size >= MAX_DISTINCT_CHOICES) {
          throw new VoteCapacityError("This poll has too many distinct choices");
        }
        counts.set(choice, (counts.get(choice) ?? 0) + 1);
      }
    }

    if (total > MAX_BALLOTS_PER_TARGET) {
      throw new VoteCapacityError("This vote has too many ballots to aggregate from KV");
    }
    cursor = page.cursor;
  } while (cursor !== undefined);

  if (target.type === "upvote") {
    return { type: "upvote", postId: target.postId, total, voted: viewerVoted };
  }

  return {
    type: "poll",
    postId: target.postId,
    pollId: target.pollId,
    mode: target.mode,
    total,
    results: sortedResults(counts),
    selection,
  };
}

export function applyVoteToSummary(summary: VoteSummary, submission: VoteSubmission): VoteSummary {
  const target = voteTargetForSubmission(submission);
  assertSummaryTarget(summary, target);

  if (summary.type === "upvote" && submission.type === "upvote") {
    if (summary.voted) return summary;
    assertBallotCapacity(summary.total);
    return { ...summary, total: summary.total + 1, voted: true };
  }
  if (summary.type !== "poll" || submission.type === "upvote") {
    throw new VoteValidationError("vote does not match its summary target");
  }

  if (summary.selection.length === 0) assertBallotCapacity(summary.total);
  const counts = new Map(summary.results.map(({ choice, votes }) => [choice, votes]));
  for (const choice of summary.selection) {
    const votes = (counts.get(choice) ?? 0) - 1;
    if (votes <= 0) counts.delete(choice);
    else counts.set(choice, votes);
  }
  for (const choice of submission.choices) {
    if (!counts.has(choice) && counts.size >= MAX_DISTINCT_CHOICES) {
      throw new VoteCapacityError("This poll has too many distinct choices");
    }
    counts.set(choice, (counts.get(choice) ?? 0) + 1);
  }

  return {
    ...summary,
    total: summary.total + (summary.selection.length === 0 ? 1 : 0),
    results: sortedResults(counts),
    selection: submission.choices,
  };
}

export function applyRetractionToSummary(summary: VoteSummary): VoteSummary {
  if (summary.type === "upvote") {
    return summary.voted
      ? { ...summary, total: Math.max(0, summary.total - 1), voted: false }
      : summary;
  }
  if (summary.selection.length === 0) return summary;

  const counts = new Map(summary.results.map(({ choice, votes }) => [choice, votes]));
  for (const choice of summary.selection) {
    const votes = (counts.get(choice) ?? 0) - 1;
    if (votes <= 0) counts.delete(choice);
    else counts.set(choice, votes);
  }
  return {
    ...summary,
    total: Math.max(0, summary.total - 1),
    results: sortedResults(counts),
    selection: [],
  };
}

export function voteTargetForSubmission(submission: VoteSubmission): VoteTarget {
  return submission.type === "upvote"
    ? { type: "upvote", postId: submission.postId }
    : {
        type: "poll",
        postId: submission.postId,
        pollId: submission.pollId,
        mode: submission.type,
      };
}

function targetPrefix(target: VoteTarget): string {
  const post = encodeURIComponent(target.postId);
  return target.type === "upvote"
    ? `${KEY_PREFIX}:${post}:upvote:`
    : `${KEY_PREFIX}:${post}:poll:${encodeURIComponent(target.pollId)}:${target.mode}:`;
}

function ballotKey(target: VoteTarget, voterHash: string): string {
  return `${targetPrefix(target)}${voterHash}`;
}

function isBallotForTarget(metadata: unknown, target: VoteTarget): metadata is BallotMetadata {
  if (!isBallotMetadata(metadata)) return false;
  return target.type === "upvote" ? metadata.type === "upvote" : metadata.type === target.mode;
}

function isBallotMetadata(value: unknown): value is BallotMetadata {
  if (typeof value !== "object" || value === null) return false;
  const metadata = value as Record<string, unknown>;
  if (metadata.version !== 1 || !Array.isArray(metadata.choices)) return false;
  const choices = metadata.choices;
  if (!choices.every((choice) => typeof choice === "string" && CHOICE_ID_PATTERN.test(choice))) {
    return metadata.type === "upvote" && choices.length === 0;
  }
  if (metadata.type === "single") return choices.length === 1;
  if (metadata.type === "multiple") {
    return (
      choices.length > 0 &&
      choices.length <= MAX_MULTIPLE_CHOICES &&
      new Set(choices).size === choices.length &&
      choices.reduce((total, choice) => total + choice.length, 0) <= MAX_TOTAL_CHOICE_CHARACTERS
    );
  }
  return metadata.type === "upvote" && choices.length === 0;
}

function ballotMetadataEqual(left: BallotMetadata, right: BallotMetadata): boolean {
  return (
    left.type === right.type &&
    left.choices.length === right.choices.length &&
    left.choices.every((choice, index) => choice === right.choices[index])
  );
}

function assertSummaryTarget(summary: VoteSummary, target: VoteTarget): void {
  const matches =
    summary.type === target.type &&
    summary.postId === target.postId &&
    (summary.type === "upvote" ||
      (target.type === "poll" && summary.pollId === target.pollId && summary.mode === target.mode));
  if (!matches) throw new VoteValidationError("vote does not match its summary target");
}

function assertBallotCapacity(total: number): void {
  if (total >= MAX_BALLOTS_PER_TARGET) {
    throw new VoteCapacityError("This vote cannot accept more ballots");
  }
}

function sortedResults(counts: Map<string, number>): Array<{ choice: string; votes: number }> {
  return Array.from(counts, ([choice, votes]) => ({ choice, votes })).sort((a, b) =>
    a.choice.localeCompare(b.choice),
  );
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VoteValidationError("request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function requireId(value: unknown, name: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new VoteValidationError(
      `${name} must be 1-128 URL-safe characters and start with a letter or number`,
    );
  }
  return value;
}

function requireChoiceId(value: unknown): string {
  if (typeof value !== "string" || !CHOICE_ID_PATTERN.test(value)) {
    throw new VoteValidationError(
      "choice must be 1-64 URL-safe characters and start with a letter or number",
    );
  }
  return value;
}

function requirePollMode(value: unknown): PollMode {
  if (value !== "single" && value !== "multiple") {
    throw new VoteValidationError("mode must be single or multiple");
  }
  return value;
}
