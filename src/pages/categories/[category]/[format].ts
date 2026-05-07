import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_TITLE, WEEKNOTES_LEGACY_CUTOFF } from "../../../consts";
import { filterDrafts, slugify } from "../../../utils";
import {
  type FeedFormat,
  FEED_FORMATS,
  FEED_SERIALIZERS,
  buildFeedFromSources,
} from "../../../lib/feed";

export const prerender = true;

export async function getStaticPaths() {
  const [posts, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const catNames = new Set(
    [...posts, ...weeknotes].flatMap((e) => e.data.categories),
  );

  return [...catNames].flatMap((name) =>
    FEED_FORMATS.map((format) => ({
      params: { category: slugify(name), format },
      props: { categoryName: name },
    })),
  );
}

export async function GET(context: APIContext) {
  const { category = "", format = "" } = context.params;
  const { categoryName } = context.props as { categoryName: string };
  const serializer = FEED_SERIALIZERS[format as FeedFormat];
  if (!serializer) return new Response("Not Found", { status: 404 });

  const [posts, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const filteredPosts = posts.filter((e) =>
    e.data.categories.map(slugify).includes(category),
  );
  const filteredWeeknotes = weeknotes.filter((e) =>
    e.data.categories.map(slugify).includes(category),
  );

  return buildFeedFromSources({
    context,
    sources: [
      {
        entries: filteredPosts,
        urlBuilder: (entry, origin) => `${origin}/posts/${entry.id}/`,
      },
      {
        entries: filteredWeeknotes,
        urlBuilder: (entry, origin) =>
          entry.data.date < WEEKNOTES_LEGACY_CUTOFF
            ? `${origin}/posts/weeknotes-${entry.id}/`
            : `${origin}/weeknotes/${entry.id}/`,
      },
    ],
    serializer,
    title: `${categoryName} — ${SITE_TITLE}`,
    description: `Posts in the ${categoryName} category`,
    selfPath: `/categories/${category}/${format}`,
  });
}
