import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_URL } from '../consts';

export const prerender = true;

const showDrafts = import.meta.env.DEV || import.meta.env.INCLUDE_DRAFTS === 'true';

export async function GET(_context: APIContext) {
  const posts = await getCollection('posts', (p) => !p.data.deleted && (showDrafts || !p.data.draft));
  const notes = await getCollection('notes', (n) => !n.data.deleted);
  const weeknotes = await getCollection('weeknotes', (w) => !w.data.deleted && (showDrafts || !w.data.draft));

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
