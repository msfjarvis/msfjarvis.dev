import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { filterDrafts } from '../../utils';
import { buildCollectionFeed } from '../../lib/feed';

export const prerender = true;

export async function GET(context: APIContext) {
  const weeknotes = await getCollection('weeknotes', filterDrafts);

  return buildCollectionFeed({
    context,
    entries: weeknotes,
    urlBuilder: (entry, origin) => `${origin}/weeknotes/${entry.id}/`,
    title: `Weeknotes — ${SITE_TITLE}`,
    description: 'Weekly notes by Harsh Shandilya',
    selfPath: '/weeknotes/rss.xml',
  });
}
