import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_DESCRIPTION, SITE_TITLE, WEEKNOTES_LEGACY_CUTOFF } from "../consts";
import { filterDrafts } from "../utils";
import { createFeedEndpoint } from "../lib/feed";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources(_context: APIContext) {
    const posts = await getCollection("posts", filterDrafts);
    const weeknotes = await getCollection("weeknotes", filterDrafts);
    return [
      {
        entries: posts,
        urlBuilder: (entry: any, origin: string) => `${origin}/posts/${entry.id}/`,
      },
      {
        entries: weeknotes,
        urlBuilder: (entry: any, origin: string) =>
          entry.data.date < WEEKNOTES_LEGACY_CUTOFF
            ? `${origin}/posts/weeknotes-${entry.id}/`
            : `${origin}/weeknotes/${entry.id}/`,
      },
    ];
  },
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  selfPath: (format) => `/${format}`,
});
