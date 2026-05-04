import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { filterDrafts } from '../utils';
import { buildMultiCollectionFeed } from '../lib/feed';
import type { FeedSource } from '../lib/feed';

export const prerender = true;

const cutoffDate = new Date('2026-05-01');

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', filterDrafts);
  const weeknotes = await getCollection('weeknotes', filterDrafts);

  const sources: FeedSource[] = [
    {
      entries: posts,
      urlBuilder: (entry, origin) => `${origin}/posts/${entry.id}/`,
    },
    {
      entries: weeknotes,
      urlBuilder: (entry, origin) =>
        entry.data.date < cutoffDate
          ? `${origin}/posts/weeknotes-${entry.id}/`
          : `${origin}/weeknotes/${entry.id}/`,
    },
  ];

  return buildMultiCollectionFeed({
    context,
    sources,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    selfPath: '/rss.xml',
  });
}
