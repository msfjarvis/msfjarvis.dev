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

interface TagFeedProps {
  tagName: string;
  filteredPosts: Awaited<ReturnType<typeof getCollection<"posts">>>;
  filteredNotes: Awaited<ReturnType<typeof getCollection<"notes">>>;
  filteredWeeknotes: Awaited<ReturnType<typeof getCollection<"weeknotes">>>;
}

export async function getStaticPaths() {
  const [posts, notes, weeknotes] = await Promise.all([
    getCollection("posts", filterDrafts),
    getCollection("notes", filterDrafts),
    getCollection("weeknotes", filterDrafts),
  ]);

  const tagNames = new Set([...posts, ...notes, ...weeknotes].flatMap((e) => e.data.tags));

  return [...tagNames].flatMap((name) => {
    const slug = slugify(name);
    const filteredPosts = posts.filter((e) => e.data.tags.map(slugify).includes(slug));
    const filteredNotes = notes.filter((e) => e.data.tags.map(slugify).includes(slug));
    const filteredWeeknotes = weeknotes.filter((e) => e.data.tags.map(slugify).includes(slug));
    return FEED_FORMATS.map((format) => ({
      params: { tag: slug, format },
      props: {
        tagName: name,
        filteredPosts,
        filteredNotes,
        filteredWeeknotes,
      } satisfies TagFeedProps,
    }));
  });
}

export async function GET(context: APIContext) {
  const { tag, format } = context.params;
  if (!tag || !format) return new Response("Bad Request", { status: 400 });
  const { tagName, filteredPosts, filteredNotes, filteredWeeknotes } =
    context.props as TagFeedProps;
  if (!tagName) return new Response("Internal Error", { status: 500 });

  const serializer = FEED_SERIALIZERS[format as FeedFormat];
  if (!serializer) return new Response("Not Found", { status: 404 });

  return buildFeedFromSources({
    context,
    sources: [
      {
        entries: filteredPosts,
        urlBuilder: (entry, origin) => `${origin}/posts/${entry.id}/`,
      },
      {
        entries: filteredNotes,
        urlBuilder: (entry, origin) => `${origin}/notes/${entry.id}/`,
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
    title: `${tagName} — ${SITE_TITLE}`,
    description: `Posts tagged ${tagName}`,
    selfPath: `/tags/${tag}/${format}`,
  });
}
