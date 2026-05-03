import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { filterDrafts } from '../../utils';

export const prerender = true;

export async function GET(context: APIContext) {
  const notes = await getCollection('notes', filterDrafts);
  notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `Notes — ${SITE_TITLE}`,
    description: 'Short notes by Harsh Shandilya',
    site: context.site!,
    stylesheet: '/pretty-feed-v3.xsl',
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
