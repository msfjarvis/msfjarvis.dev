import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { filterDrafts } from '../../utils';
import { renderEntryContentForRss } from '../../lib/feed';

export const prerender = true;

export async function GET(context: APIContext) {
  const weeknotes = await getCollection('weeknotes', filterDrafts);
  weeknotes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const origin = context.site!.origin;

  const items = await Promise.all(
    weeknotes.map(async (entry) => {
      const content = await renderEntryContentForRss(entry, origin);
      return {
        title: entry.data.title,
        pubDate: entry.data.date,
        description: entry.data.summary,
        link: `/weeknotes/${entry.id}/`,
        content,
      };
    }),
  );

  return rss({
    title: `Weeknotes — ${SITE_TITLE}`,
    description: 'Weekly notes by Harsh Shandilya',
    site: new URL(context.site!),
    stylesheet: '/pretty-feed-v3.xsl',
    items,
    customData: `<language>en-us</language>`,
  });
}
