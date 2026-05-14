export type WebmentionsCollection = "posts" | "notes" | "weeknotes";

export interface BuildManifestEntryInput {
  collection: WebmentionsCollection;
  id: string;
  data: { lastmod?: Date };
  siteUrl: string;
  workersCi: boolean;
}

export interface WebmentionsManifestEntry {
  url: string;
  lastmod: string;
}

export interface WebmentionsManifest {
  schemaVersion: 2;
  siteOrigin: string;
  generatedAt: string;
  entries: WebmentionsManifestEntry[];
}

export interface WebmentionSendEvent {
  pageUrl: string;
  reason: "publish" | "update" | "delete";
}

export function buildManifestEntry(input: BuildManifestEntryInput): WebmentionsManifestEntry | null {
  const { collection, id, data, siteUrl, workersCi } = input;
  if (!(data.lastmod instanceof Date) || Number.isNaN(data.lastmod.valueOf())) {
    if (workersCi) return null;
    throw new Error(`Missing or invalid lastmod for ${collection}/${id}`);
  }
  const basePath = collection;
  const urlPath = `${basePath}/${id}/`;
  return {
    url: new URL(urlPath, `${siteUrl}/`).toString(),
    lastmod: data.lastmod.toISOString(),
  };
}

export function buildManifest(input: {
  siteUrl: string;
  generatedAt: Date;
  entries: WebmentionsManifestEntry[];
}): WebmentionsManifest {
  return {
    schemaVersion: 2,
    siteOrigin: input.siteUrl,
    generatedAt: input.generatedAt.toISOString(),
    entries: [...input.entries].sort((a, b) => a.url.localeCompare(b.url)),
  };
}

export function parseManifest(value: unknown): WebmentionsManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid webmentions manifest");
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== 2) throw new Error("Unsupported webmentions manifest schemaVersion");
  if (!Array.isArray(manifest.entries)) throw new Error("Invalid webmentions manifest entries");
  for (const entry of manifest.entries) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid webmentions manifest entry");
    const record = entry as Record<string, unknown>;
    if (typeof record.url !== "string" || typeof record.lastmod !== "string") {
      throw new Error("Invalid webmentions manifest entry shape");
    }
  }
  return manifest as WebmentionsManifest;
}

export function diffManifests(previous: WebmentionsManifest, next: WebmentionsManifest): WebmentionSendEvent[] {
  const previousMap = new Map(previous.entries.map((entry) => [entry.url, entry.lastmod]));
  const nextMap = new Map(next.entries.map((entry) => [entry.url, entry.lastmod]));
  const events: WebmentionSendEvent[] = [];

  for (const [url, lastmod] of previousMap) {
    if (!nextMap.has(url)) {
      events.push({ pageUrl: url, reason: "delete" });
      continue;
    }
    if (nextMap.get(url) !== lastmod) {
      events.push({ pageUrl: url, reason: "update" });
    }
  }

  for (const [url] of nextMap) {
    if (!previousMap.has(url)) {
      events.push({ pageUrl: url, reason: "publish" });
    }
  }

  return events.sort((a, b) => a.pageUrl.localeCompare(b.pageUrl) || a.reason.localeCompare(b.reason));
}
