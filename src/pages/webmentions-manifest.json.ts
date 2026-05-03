import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_URL } from '../consts';
import { filterDrafts } from '../utils';

export const prerender = true;

export async function GET(_context: APIContext) {
  const posts = await getCollection('posts', filterDrafts);
  const notes = await getCollection('notes', filterDrafts);
  const weeknotes = await getCollection('weeknotes', filterDrafts);

  const postEntries = posts.map((p) => ({
    source: `src/content/posts/${p.id}.mdx`,
    url: `${SITE_URL}/posts/${p.id}/`,
  }));

  const noteEntries = notes.map((n) => ({
    source: `src/content/notes/${n.id}.mdx`,
    url: `${SITE_URL}/notes/${n.id}/`,
  }));

  const weeknoteEntries = weeknotes.map((w) => ({
    source: `src/content/weeknotes/${w.id}.mdx`,
    url: `${SITE_URL}/notes/${w.id}/`,
  }));

  const entries = [...postEntries, ...noteEntries, ...weeknoteEntries].sort((a, b) =>
    a.source.localeCompare(b.source)
  );

  const manifest = {
    schemaVersion: 1,
    siteOrigin: SITE_URL,
    generatedAt: new Date().toISOString(),
    entries,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
