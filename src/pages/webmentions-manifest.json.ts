import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_URL } from '../consts';

export async function GET(_context: APIContext) {
  const posts = await getCollection('posts', (p) => !p.data.deleted && !p.data.draft);
  const notes = await getCollection('notes', (n) => !n.data.deleted);

  const postEntries = posts.map((p) => ({
    source: `src/content/posts/${p.id}.mdx`,
    url: `${SITE_URL}/posts/${p.id}/`,
  }));

  const noteEntries = notes.map((n) => ({
    source: `src/content/notes/${n.id}.md`,
    url: `${SITE_URL}/notes/${n.id}/`,
  }));

  const entries = [...postEntries, ...noteEntries].sort((a, b) =>
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
