import { SITE_TITLE } from "../../consts";
import { createFeedEndpoint } from "../../lib/feed";
import { filterDrafts } from "../../utils";
import { getCollection } from "astro:content";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources() {
    const notes = await getCollection("notes", filterDrafts);
    return [
      {
        entries: notes,
        urlBuilder: (entry: any, origin: string) =>
          `${origin}/notes/${entry.id}/`,
      },
    ];
  },
  title: `Notes — ${SITE_TITLE}`,
  description: "Short notes by Harsh Shandilya",
  selfPath: (format) => `/notes/${format}`,
});
