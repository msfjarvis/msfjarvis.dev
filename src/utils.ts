import { showDrafts } from "./consts";

/**
 * Converts a raw tag/category string into a URL-safe slug,
 * matching Hugo's urlize behaviour: lowercase, spaces/special chars → hyphens.
 * This is done manually here instead of relying on Astro's default slug creation
 * to avoid broken links from behavorial differences between the two.
 */
export function slugify(str: string): string {
  // Removed toLowerCase() because capitalization is important for certain names,
  // and web servers take care of ignoring capitalization when serving the site.
  // .toLowerCase()
  return str
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/[^A-Za-z0-9-]/g, "-") // non-alphanumeric (except hyphens) → hyphens
    .replace(/-{2,}/g, "-") // collapse consecutive hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

type ContentEntry = {
  collection?: string;
  id?: string;
  url?: string;
  digest?: string | number;
};

/** Return a stable key for the content entries that contribute to a page. */
export function getContentCacheKey(entries: ContentEntry[]): string {
  // A loader without a digest cannot safely reuse its previous output.
  if (entries.some((entry) => entry.digest == null)) {
    return crypto.randomUUID();
  }

  return JSON.stringify(
    entries
      .map(({ collection, id, url, digest }) => [
        collection ?? "",
        id ?? url ?? "",
        String(digest),
      ])
      .sort(([leftCollection, leftId], [rightCollection, rightId]) =>
        `${leftCollection}/${leftId}`.localeCompare(
          `${rightCollection}/${rightId}`,
        ),
      ),
  );
}

export const filterDrafts: (p: {
  data: { draft: boolean; deleted: boolean };
}) => boolean = (p) => {
  return !p.data.deleted && (showDrafts || !p.data.draft);
};
