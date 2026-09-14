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
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
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
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  ) {
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

function requiredRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid Mastodon status: ${label}`);
  }
  return value as Record<string, unknown>;
}

function parseTimestamp(value: unknown): string {
  if (typeof value !== "string")
    throw new Error("Invalid Mastodon status: created_at");
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Invalid Mastodon status: created_at");
  }
  return timestamp.toISOString();
}

function accountAddress(acct: string, instance: string): string {
  return acct.includes("@") ? `@${acct}` : `@${acct}@${instance}`;
}

export function getMastodonSnapshotKey(url: string): string {
  return parseStatusUrl(url).canonicalUrl;
}

function normalizeStatus(
  value: unknown,
  requested: ParsedStatusUrl,
): MastodonStatus {
  const data = requiredRecord(value, "payload");
  if (typeof data.content !== "string") {
    throw new Error("Invalid Mastodon status: content");
  }

  const account = requiredRecord(data.account, "account");
  if (
    typeof account.display_name !== "string" ||
    typeof account.acct !== "string"
  ) {
    throw new Error("Invalid Mastodon status: account");
  }

  const images: MastodonStatus["images"] = [];
  const attachments: MastodonStatus["attachments"] = [];
  const media = Array.isArray(data.media_attachments)
    ? data.media_attachments
    : [];
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

function snapshotString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid Mastodon status snapshot: ${label}`);
  }
  return value;
}

function snapshotStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid Mastodon status snapshot: ${label}`);
  }
  return value.map((item, index) => snapshotString(item, `${label}[${index}]`));
}

function snapshotList(
  value: unknown,
  label: string,
  fields: readonly string[],
): Array<Record<string, string>> {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid Mastodon status snapshot: ${label}`);
  }
  return value.map((item, index) => {
    const record = requiredRecord(item, `${label}[${index}]`);
    return Object.fromEntries(
      fields.map((field) => [
        field,
        snapshotString(record[field], `${label}[${index}].${field}`),
      ]),
    );
  });
}

function normalizeSnapshot(
  value: unknown,
  canonicalUrl: string,
): MastodonStatus {
  const data = requiredRecord(value, "payload");
  if (data.canonicalUrl !== canonicalUrl) {
    throw new Error("Invalid Mastodon status snapshot: canonicalUrl");
  }

  const author = requiredRecord(data.author, "author");
  const paragraphs = snapshotStringList(data.paragraphs, "paragraphs");
  const images = snapshotList(data.images, "images", ["url", "alt"]).map(
    ({ url, alt }) => ({ url, alt }),
  );
  const attachments = snapshotList(data.attachments, "attachments", [
    "url",
    "label",
  ]).map(({ url, label }) => ({ url, label }));

  return {
    canonicalUrl,
    paragraphs,
    createdAt: parseTimestamp(data.createdAt),
    author: {
      displayName: snapshotString(author.displayName, "author.displayName"),
      account: snapshotString(author.account, "author.account"),
    },
    images,
    attachments,
  };
}

/** Load a checked-in status snapshot; builds never fall back to the network. */
export function getMastodonStatusSnapshot(input: {
  url: string;
  snapshots: Record<string, unknown>;
}): MastodonStatus {
  const canonicalUrl = getMastodonSnapshotKey(input.url);
  const snapshot = input.snapshots[canonicalUrl];
  if (!snapshot) {
    throw new Error(
      `Missing Mastodon status snapshot for ${canonicalUrl}. Run pnpm mastodon:refresh.`,
    );
  }
  return normalizeSnapshot(snapshot, canonicalUrl);
}

export async function fetchMastodonStatus(input: {
  url: string;
  fetchImpl?: typeof fetch;
}): Promise<MastodonStatus> {
  const requested = parseStatusUrl(input.url);
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(requested.endpoint, {
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(
      `Mastodon status request failed for ${requested.endpoint}`,
      { cause: error },
    );
  }
  if (!response.ok)
    throw new Error(
      `Mastodon status request failed with HTTP ${response.status}`,
    );

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Failed to parse Mastodon status JSON", { cause: error });
  }
  return normalizeStatus(payload, requested);
}
