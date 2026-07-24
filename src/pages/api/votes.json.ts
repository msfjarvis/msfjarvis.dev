import { env } from "cloudflare:workers";
import type { APIRoute, AstroCookies } from "astro";

import {
  applyRetractionToSummary,
  applyVoteToSummary,
  createKvVoteStore,
  getVoteSummary,
  hashVoterId,
  parseVoteSubmission,
  parseVoteTarget,
  recordVote,
  retractVote,
  VoteCapacityError,
  VoteValidationError,
  voteTargetForSubmission,
  voteTargetFromQuery,
  type VoteTarget,
} from "../../lib/votes.ts";

const VOTER_COOKIE = "__Host-msfjarvis-voter";
const VOTER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const MAX_BODY_BYTES = 8 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const target = voteTargetFromQuery(url.searchParams);
    const voterHash = await voterHashFor(cookies);
    const summary = await getVoteSummary(createKvVoteStore(env.VOTES), target, voterHash);
    return json(summary);
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const submission = parseVoteSubmission(await readJson(request));
    const voterHash = await voterHashFor(cookies);
    const target = voteTargetForSubmission(submission);
    await enforceMutationRateLimit(target, voterHash);
    const store = createKvVoteStore(env.VOTES);
    const currentSummary = await getVoteSummary(store, target, voterHash);
    const updatedSummary = applyVoteToSummary(currentSummary, submission);
    const outcome = await recordVote(store, submission, voterHash);
    return json({ outcome, ...updatedSummary }, outcome === "created" ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const target = parseVoteTarget(await readJson(request));
    const voterHash = await voterHashFor(cookies);
    await enforceMutationRateLimit(target, voterHash);
    const store = createKvVoteStore(env.VOTES);
    const currentSummary = await getVoteSummary(store, target, voterHash);
    const updatedSummary = applyRetractionToSummary(currentSummary);
    await retractVote(store, target, voterHash);
    return json(updatedSummary);
  } catch (error) {
    return errorResponse(error);
  }
};

export const ALL: APIRoute = () =>
  json({ error: "Method not allowed" }, 405, new Headers({ Allow: "GET, HEAD, POST, DELETE" }));

async function voterHashFor(cookies: AstroCookies): Promise<string> {
  const existing = cookies.get(VOTER_COOKIE)?.value;
  const voterId = existing && UUID_PATTERN.test(existing) ? existing : crypto.randomUUID();

  if (voterId !== existing) {
    cookies.set(VOTER_COOKIE, voterId, {
      httpOnly: true,
      maxAge: VOTER_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "strict",
      secure: true,
    });
  }

  return hashVoterId(voterId);
}

async function enforceMutationRateLimit(target: VoteTarget, voterHash: string): Promise<void> {
  const targetKey =
    target.type === "upvote"
      ? `upvote:${target.postId}`
      : `poll:${target.postId}:${target.pollId}:${target.mode}`;
  const [visitor, vote] = await Promise.all([
    env.VOTE_VISITOR_RATE_LIMITER.limit({ key: voterHash }),
    env.VOTE_TARGET_RATE_LIMITER.limit({ key: targetKey }),
  ]);
  if (!visitor.success || !vote.success) throw new VoteRateLimitError();
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new VoteValidationError("Content-Type must be application/json");
  }

  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new RequestTooLargeError();
  }

  if (request.body === null) {
    throw new VoteValidationError("request body must contain JSON");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();

  try {
    return JSON.parse(body);
  } catch {
    throw new VoteValidationError("request body must contain valid JSON");
  }
}

function errorResponse(error: unknown): Response {
  if (error instanceof RequestTooLargeError) {
    return json({ error: error.message }, 413);
  }
  if (error instanceof VoteValidationError) {
    return json({ error: error.message }, 400);
  }
  if (error instanceof VoteRateLimitError) {
    return json({ error: error.message }, 429, new Headers({ "Retry-After": "10" }));
  }
  if (error instanceof VoteCapacityError) {
    return json({ error: "Vote results are temporarily unavailable" }, 503);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ message: "Votes API request failed", error: message }));
  if (/KV PUT failed: 429/.test(message)) {
    return json(
      { error: "Please wait before changing this vote again" },
      429,
      new Headers({ "Retry-After": "1" }),
    );
  }
  return json({ error: "Vote request failed" }, 503);
}

function json(body: unknown, status = 200, additionalHeaders?: Headers): Response {
  const headers = new Headers(additionalHeaders);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

class RequestTooLargeError extends Error {
  constructor() {
    super(`request body must not exceed ${MAX_BODY_BYTES} bytes`);
  }
}

class VoteRateLimitError extends Error {
  constructor() {
    super("Too many vote changes; please try again later");
  }
}
