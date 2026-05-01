import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';

export async function GET(context: APIContext) {
  const notes = await getCollection('notes', (n) => !n.data.deleted);
  notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `Notes — ${SITE_TITLE}`,
    description: 'Short notes by Harsh Shandilya',
    site: context.site!,
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
