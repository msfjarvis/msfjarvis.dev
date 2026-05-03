import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { filterDrafts } from '../utils';

export const prerender = true;

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', filterDrafts);
  const weeknotes = await getCollection('weeknotes', filterDrafts);

  // Combine posts and weeknotes with collection metadata, then sort by date (newest first)
  const allItems = [
    ...posts.map((post) => ({ ...post, type: 'posts' as const })),
    ...weeknotes.map((weeknote) => ({ ...weeknote, type: 'weeknotes' as const })),
  ];
  allItems.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const cutoffDate = new Date('2026-05-01');
  
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site!,
    stylesheet: '/pretty-feed-v3.xsl',
    items: allItems.map((item) => {
      let link = `/${item.type}/${item.id}/`;
      if (item.type === 'weeknotes' && item.data.date < cutoffDate) {
        link = `/posts/weeknotes-${item.id}/`;
      }
      return {
        title: item.data.title,
        pubDate: item.data.date,
        description: item.data.summary,
        link,
      };
    }),
    customData: `<language>en-us</language>`,
  });
}
