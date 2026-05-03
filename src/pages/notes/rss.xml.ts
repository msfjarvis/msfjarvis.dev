import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { filterDrafts } from '../../utils';
import { renderEntryContentForRss } from '../../lib/feed';

export const prerender = true;

export async function GET(context: APIContext) {
  const notes = await getCollection('notes', filterDrafts);
  notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const origin = context.site!.origin;

  const items = await Promise.all(
    notes.map(async (note) => {
      const content = await renderEntryContentForRss(note, origin);
      return {
        title: note.data.title,
        pubDate: note.data.date,
        link: `/notes/${note.id}/`,
        content,
      };
    }),
  );

  return rss({
    title: `Notes — ${SITE_TITLE}`,
    description: 'Short notes by Harsh Shandilya',
    site: new URL(context.site!),
    stylesheet: '/pretty-feed-v3.xsl',
    items,
    customData: `<language>en-us</language>`,
  });
}
