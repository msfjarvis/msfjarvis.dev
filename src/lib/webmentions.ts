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
