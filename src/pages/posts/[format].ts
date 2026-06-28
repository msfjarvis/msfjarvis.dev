import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE } from "../../consts";
import { filterDrafts } from "../../utils";
import { createFeedEndpoint } from "../../lib/feed";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources(_context: APIContext) {
    const weeknotes = await getCollection("posts", filterDrafts);
    return [
      {
        entries: weeknotes,
        urlBuilder: (entry: any, origin: string) => `${origin}/posts/${entry.id}/`,
      },
    ];
  },
  title: `Posts — ${SITE_TITLE}`,
  description: "Posts by Harsh Shandilya",
  selfPath: (format) => `/posts/${format}`,
});
