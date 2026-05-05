import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";
import { filterDrafts } from "../../utils";
import { buildCollectionFeed } from "../../lib/feed";

export const prerender = true;

export async function GET(context: APIContext) {
  const notes = await getCollection("notes", filterDrafts);

  return buildCollectionFeed({
    context,
    entries: notes,
    urlBuilder: (entry, origin) => `${origin}/notes/${entry.id}/`,
    title: `Notes — ${SITE_TITLE}`,
    description: "Short notes by Harsh Shandilya",
    selfPath: "/notes/rss.xml",
  });
}
