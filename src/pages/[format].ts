import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  WEEKNOTES_LEGACY_CUTOFF,
} from "../consts";
import { createFeedEndpoint } from "../lib/feed";
import { filterDrafts } from "../utils";
import { getCollection } from "astro:content";

export const prerender = true;

export const { getStaticPaths, GET } = createFeedEndpoint({
  async getSources() {
    const posts = await getCollection("posts", filterDrafts);
    const weeknotes = await getCollection("weeknotes", filterDrafts);
    return [
      {
        entries: posts,
        urlBuilder: (entry: any, origin: string) =>
          `${origin}/posts/${entry.id}/`,
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
