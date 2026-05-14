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

export function buildManifestEntry(input: BuildManifestEntryInput): WebmentionsManifestEntry | null {
  const { collection, id, data, siteUrl, workersCi } = input;
  if (!(data.lastmod instanceof Date) || Number.isNaN(data.lastmod.valueOf())) {
    if (workersCi) return null;
    throw new Error(`Missing or invalid lastmod for ${collection}/${id}`);
  }
  const basePath = collection === "posts" ? "posts" : "notes";
  const urlPath = collection === "weeknotes" ? `notes/${id}/` : `${basePath}/${id}/`;
  return {
    url: new URL(urlPath, `${siteUrl}/`).toString(),
    lastmod: data.lastmod.toISOString(),
  };
}
