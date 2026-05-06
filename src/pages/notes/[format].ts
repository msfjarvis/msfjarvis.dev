import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";
import { filterDrafts } from "../../utils";
import { createFeedEndpoint } from "../../lib/feed";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources(_context: APIContext) {
    const notes = await getCollection("notes", filterDrafts);
    return [
      {
        entries: notes,
        urlBuilder: (entry: any, origin: string) => `${origin}/notes/${entry.id}/`,
      },
    ];
  },
  title: `Notes — ${SITE_TITLE}`,
  description: "Short notes by Harsh Shandilya",
  selfPath: (format) => `/notes/${format}`,
});
