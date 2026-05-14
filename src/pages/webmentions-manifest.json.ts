import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_URL } from "../consts";
import { buildManifest, buildManifestEntry } from "../lib/webmentions";
import { filterDrafts } from "../utils";

export const prerender = true;

export async function GET(_context: APIContext) {
  const workersCi = Boolean(process.env.WORKERS_CI);
  const collections = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("notes", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const entries = collections.flatMap((items, index) => {
    const collection = ["posts", "notes", "weeknotes"][index] as const;
    return items.flatMap((item) => {
      const entry = buildManifestEntry({
        collection,
        id: item.id,
        data: { lastmod: item.data.lastmod },
        siteUrl: SITE_URL,
        workersCi,
      });
      if (entry === null && workersCi) {
        console.warn(
          `Skipping ${collection}/${item.id} in webmentions manifest due to missing or invalid lastmod`,
        );
        return [];
      }
      return entry ? [entry] : [];
    });
  });

  return new Response(
    JSON.stringify(
      buildManifest({
        siteUrl: SITE_URL,
        generatedAt: new Date(),
        entries,
      }),
      null,
      2,
    ),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
