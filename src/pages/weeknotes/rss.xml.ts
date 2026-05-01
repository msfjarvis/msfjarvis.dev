import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';

export async function GET(context: APIContext) {
  const weeknotes = await getCollection('weeknotes', (w) => !w.data.deleted && !w.data.draft);
  weeknotes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `Weeknotes — ${SITE_TITLE}`,
    description: 'Weekly notes by Harsh Shandilya',
    site: context.site!,
    stylesheet: '/pretty-feed-v3.xsl',
    items: weeknotes.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.summary,
      link: `/weeknotes/${entry.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
