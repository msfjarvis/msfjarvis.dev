import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import mdxRenderer from '@astrojs/mdx/server.js';
import { render } from 'astro:content';
import { load } from 'cheerio';
import type { APIContext } from 'astro';

// --- Types ---

/** Normalised item shape for all feeds. */
export interface FeedItem {
  title: string;
  url: string;
  date: Date;
  guid?: string;    // defaults to url
  html?: string;    // → <content:encoded>
  summary?: string; // → <description>
}

/** One collection's contribution to a multi-collection feed. */
export interface FeedSource {
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
}

// --- Helpers ---

/** Escape a string for safe embedding in XML text or attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert root-relative URLs in src/href attributes to absolute URLs for RSS */
function absolutizeUrls(html: string, origin: string): string {
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);
}

/**
 * Create an AstroContainer with the MDX renderer for server-side rendering.
 *
 * The Cloudflare adapter prerenders in workerd where `import.meta.url` is not a
 * valid URL, which causes `AstroContainer.create()` → `createManifest()` →
 * `new URL(import.meta.url)` to throw. We temporarily patch the global URL
 * constructor so invalid URLs fall back to `file://<cwd>/` (only used for the
 * container's internal `rootDir`, which isn't relevant for `renderToString`).
 */
async function createContainer() {
  const OrigURL = globalThis.URL;
  const SafeURL = class extends OrigURL {
    constructor(url: string | URL, base?: string | URL) {
      try {
        super(url, base);
      } catch {
        super('file:///tmp/astro-container/');
      }
    }
  };
  globalThis.URL = SafeURL as typeof URL;
  try {
    const container = await AstroContainer.create();
    container.addServerRenderer({ renderer: mdxRenderer });
    return container;
  } finally {
    globalThis.URL = OrigURL;
  }
}

/** Remove duplicate images from lightbox components for RSS feeds */
function removeLightboxDuplicates(html: string): string {
  const $ = load(html);

  // For each figure with lightbox, keep only the image/picture and remove button/container
  $('[data-image-lightbox]').each((_, figure) => {
    const $figure = $(figure);

    // Get the actual picture/img from inside the button
    const $button = $figure.find('[data-lightbox-trigger]');
    if ($button.length > 0) {
      const imageHtml = $button.html();
      if (!imageHtml) {
        throw Error('Failed to find lightbox trigger in page, has the layout changed?');
      }
      $button.replaceWith(imageHtml);
    }
  });

  // Remove all lightbox containers
  $('[data-lightbox-container]').remove();

  // Remove all script tags (not needed for RSS, and lightbox scripts shouldn't be there)
  $('script').remove();

  return $.html();
}

/** Render a single entry to absolute-URL HTML via the container */
async function renderEntryHtml(
  container: Awaited<ReturnType<typeof createContainer>>,
  entry: any,
  origin: string,
): Promise<string> {
  const { Content } = await render(entry);
  let html = await container.renderToString(Content);
  html = removeLightboxDuplicates(html);
  return absolutizeUrls(html, origin);
}

/** Convert a rendered collection entry into a FeedItem. */
async function entryToFeedItem(
  container: Awaited<ReturnType<typeof createContainer>>,
  entry: any,
  url: string,
  origin: string,
): Promise<FeedItem> {
  const html = await renderEntryHtml(container, entry, origin);
  return {
    title: entry.data.title,
    url,
    date: new Date(entry.data.date),
    summary: entry.data.summary || undefined,
    html,
  };
}

// --- Core builder ---

/**
 * Build an RSS 2.0 feed from a pre-normalised list of FeedItems.
 * Adds xmlns:content only when items need it.
 */
export function buildFeed(opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}): Response {
  const { title, description, selfPath, items } = opts;
  const site = opts.context.site!;

  const needsContent = items.some((i) => i.html);

  const ns = [
    needsContent ? 'xmlns:content="http://purl.org/rss/1.0/modules/content/"' : '',
    'xmlns:atom="http://www.w3.org/2005/Atom"',
  ]
    .filter(Boolean)
    .join(' ');

  const xmlItems = items.map((item) => {
    const guid = item.guid || item.url;
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.url}</link>
      <guid>${guid}</guid>
      ${item.summary ? `<description>${escapeXml(item.summary)}</description>` : ''}
      <pubDate>${item.date.toUTCString()}</pubDate>
      ${item.html ? `<content:encoded><![CDATA[${item.html}]]></content:encoded>` : ''}
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>
<rss version="2.0" ${ns}>
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${site.href}</link>
    <atom:link href="${site.origin}${selfPath}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-us</language>
${xmlItems.join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

// --- Collection feed builders ---

/** High-level helper for single-collection feeds (notes, weeknotes). */
export async function buildCollectionFeed(opts: {
  context: APIContext;
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
  title: string;
  description: string;
  selfPath: string;
}): Promise<Response> {
  const site = opts.context.site!;
  const container = await createContainer();
  const sorted = [...opts.entries].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const items = await Promise.all(
    sorted.map((entry) => {
      const url = opts.urlBuilder(entry, site.origin);
      return entryToFeedItem(container, entry, url, site.origin);
    }),
  );

  return buildFeed({
    context: opts.context,
    title: opts.title,
    description: opts.description,
    selfPath: opts.selfPath,
    items,
  });
}

/**
 * High-level helper for multi-collection feeds that combine entries from
 * multiple collections (e.g. the site-wide /rss.xml combining posts + weeknotes).
 */
export async function buildMultiCollectionFeed(opts: {
  context: APIContext;
  sources: FeedSource[];
  title: string;
  description: string;
  selfPath: string;
}): Promise<Response> {
  const site = opts.context.site!;
  const container = await createContainer();

  const allEntries = opts.sources.flatMap((source) =>
    source.entries.map((entry) => ({ entry, source })),
  );
  const sorted = allEntries.sort(
    (a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime(),
  );

  const items = await Promise.all(
    sorted.map(({ entry, source }) => {
      const url = source.urlBuilder(entry, site.origin);
      return entryToFeedItem(container, entry, url, site.origin);
    }),
  );

  return buildFeed({
    context: opts.context,
    title: opts.title,
    description: opts.description,
    selfPath: opts.selfPath,
    items,
  });
}
