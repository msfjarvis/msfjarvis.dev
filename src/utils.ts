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
    .replace(/[^A-Za-z0-9\-]/g, "-") // non-alphanumeric (except hyphens) → hyphens
    .replace(/-{2,}/g, "-") // collapse consecutive hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

export const filterDrafts: (p: { data: { draft: boolean; deleted: boolean } }) => boolean = (p) => {
  return !p.data.deleted && (showDrafts || !p.data.draft);
};
