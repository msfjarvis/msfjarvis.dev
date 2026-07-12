import { load } from "cheerio";

export interface MastodonStatus {
  canonicalUrl: string;
  paragraphs: string[];
  createdAt: string;
  author: { displayName: string; account: string };
  images: Array<{ url: string; alt: string }>;
  attachments: Array<{ url: string; label: string }>;
}

interface ParsedStatusUrl {
  canonicalUrl: string;
  endpoint: string;
  instance: string;
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseStatusUrl(value: string): ParsedStatusUrl {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid Mastodon status URL");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("Invalid Mastodon status URL");
  }

  const statusId = url.pathname.match(/^\/@[^/]+\/(\d+)$/)?.[1];
  if (!statusId) throw new Error("Invalid Mastodon status URL");

  url.search = "";
  url.hash = "";
  url.protocol = "https:";
  return {
    canonicalUrl: url.toString(),
    endpoint: new URL(`/api/v1/statuses/${statusId}`, url.origin).toString(),
    instance: url.hostname,
  };
}

function normalizeContent(value: string): string[] {
  const $ = load(value, undefined, false);
  $("script, style").remove();
  $("br").replaceWith("\n");

  const paragraphs = $("p")
    .toArray()
    .map((paragraph) => $(paragraph).text().trim())
    .filter(Boolean);
  if (paragraphs.length > 0) return paragraphs;

  const text = $.root().text().trim();
  return text ? [text] : [];
}

function requiredRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid Mastodon status: ${label}`);
  }
  return value as Record<string, unknown>;
}

function parseTimestamp(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid Mastodon status: created_at");
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Invalid Mastodon status: created_at");
  }
  return timestamp.toISOString();
}

function accountAddress(acct: string, instance: string): string {
  return acct.includes("@") ? `@${acct}` : `@${acct}@${instance}`;
}

function normalizeStatus(value: unknown, requested: ParsedStatusUrl): MastodonStatus {
  const data = requiredRecord(value, "payload");
  if (typeof data.content !== "string") {
    throw new Error("Invalid Mastodon status: content");
  }

  const account = requiredRecord(data.account, "account");
  if (typeof account.display_name !== "string" || typeof account.acct !== "string") {
    throw new Error("Invalid Mastodon status: account");
  }

  const images: MastodonStatus["images"] = [];
  const attachments: MastodonStatus["attachments"] = [];
  const media = Array.isArray(data.media_attachments) ? data.media_attachments : [];
  for (const item of media) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const url = httpUrl(item.url);
    if (!url) continue;

    const label = typeof item.description === "string" ? item.description : url;
    if (item.type === "image") images.push({ url, alt: label });
    else attachments.push({ url, label });
  }

  return {
    canonicalUrl: requested.canonicalUrl,
    paragraphs: normalizeContent(data.content),
    createdAt: parseTimestamp(data.created_at),
    author: {
      displayName: account.display_name,
      account: accountAddress(account.acct, requested.instance),
    },
    images,
    attachments,
  };
}

export async function fetchMastodonStatus(input: {
  url: string;
  fetchImpl?: typeof fetch;
}): Promise<MastodonStatus> {
  const requested = parseStatusUrl(input.url);
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(requested.endpoint, { redirect: "manual" });
  } catch (error) {
    throw new Error(`Mastodon status request failed for ${requested.endpoint}`, { cause: error });
  }
  if (!response.ok) throw new Error(`Mastodon status request failed with HTTP ${response.status}`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Failed to parse Mastodon status JSON", { cause: error });
  }
  return normalizeStatus(payload, requested);
}
