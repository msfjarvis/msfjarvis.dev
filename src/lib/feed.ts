import { experimental_AstroContainer as AstroContainer } from "astro/container";
import mdxRenderer from "@astrojs/mdx/server.js";
import { render } from "astro:content";
import { load } from "cheerio";
import type { APIContext } from "astro";
import { AUTHOR_NAME, SITE_URL } from "../consts";

/** Maximum number of entries to include in any feed. */
const FEED_MAX_ENTRIES = 40;

// --- Types ---

/** Supported feed format param values (match the [format] page param). */
export type FeedFormat = "rss.xml" | "atom.xml" | "feed.json";

/** Normalised item shape used by all serializers. */
export interface FeedItem {
  title: string;
  url: string;
  date: Date;
  guid?: string; // defaults to url
  html?: string;
  summary?: string;
}

/** One collection's contribution to a multi-source feed. */
export interface FeedSource {
  entries: any[];
  urlBuilder: (entry: any, origin: string) => string;
}

/** A function that turns pre-built FeedItems into an HTTP Response. */
export type FeedSerializer = (opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}) => Response;

/** Config passed to createFeedEndpoint. */
export interface FeedEndpointConfig {
  /**
   * Called once per GET request to return the sources for this feed.
   * context is provided in case the implementation needs site/request info,
   * but most implementations will just call getCollection() here.
   */
  getSources: (context: APIContext) => Promise<FeedSource[]>;
  title: string;
  description: string;
  /**
   * Given a format filename (e.g. "atom.xml"), return the canonical
   * self-path for this feed (e.g. "/notes/atom.xml").
   */
  selfPath: (format: FeedFormat) => string;
}

// --- XML helpers ---

/** Escape a string for safe embedding in XML text or attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert root-relative URLs in src/href attributes to absolute URLs. */
function absolutizeUrls(html: string, origin: string): string {
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);
}

// --- AstroContainer helpers ---

/**
 * Create an AstroContainer with the MDX renderer for server-side rendering.
 *
 * The Cloudflare adapter prerenders in workerd where `import.meta.url` is not a
 * valid URL, which causes `AstroContainer.create()` → `createManifest()` →
 * `new URL(import.meta.url)` to throw. We temporarily patch the global URL
 * constructor so invalid URLs fall back to `file://<cwd>/`.
 */
async function createContainer() {
  const OrigURL = globalThis.URL;
  const SafeURL = class extends OrigURL {
    constructor(url: string | URL, base?: string | URL) {
      try {
        super(url, base);
      } catch {
        super("file:///tmp/astro-container/");
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

/** Remove duplicate images from lightbox components for feeds. */
function removeLightboxDuplicates(html: string): string {
  const $ = load(html);
  $("[data-image-lightbox]").each((_, figure) => {
    const $figure = $(figure);
    const $button = $figure.find("[data-lightbox-trigger]");
    if ($button.length > 0) {
      const imageHtml = $button.html();
      if (!imageHtml) {
        throw Error("Failed to find lightbox trigger in page, has the layout changed?");
      }
      $button.replaceWith(imageHtml);
    }
  });
  $("[data-lightbox-container]").remove();
  $("script").remove();
  return $.html();
}

/** Render a single entry to absolute-URL HTML via the container. */
async function renderEntryHtml(
  container: Awaited<ReturnType<typeof createContainer>>,
  entry: any,
  origin: string,
): Promise<string> {
  const { Content } = await render(entry);
  let html = await container.renderToString(Content);
  html = removeLightboxDuplicates(html);
  const $doc = load(html);
  html = $doc("body").html() ?? html;
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

// --- Internal item builder ---

/**
 * Sort, slice, and render a flat list of FeedSources into FeedItems.
 * Shared by all serializers via createFeedEndpoint.
 */
async function buildFeedItems(
  sources: FeedSource[],
  container: Awaited<ReturnType<typeof createContainer>>,
  origin: string,
): Promise<FeedItem[]> {
  const allEntries = sources.flatMap((source) =>
    source.entries.map((entry) => ({ entry, source })),
  );
  const sorted = allEntries
    .sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime())
    .slice(0, FEED_MAX_ENTRIES);

  return Promise.all(
    sorted.map(({ entry, source }) => {
      const url = source.urlBuilder(entry, origin);
      return entryToFeedItem(container, entry, url, origin);
    }),
  );
}

// --- Serializers ---

/** Produce an RSS 2.0 response. */
export function rssSerializer(opts: {
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
    needsContent ? 'xmlns:content="http://purl.org/rss/1.0/modules/content/"' : "",
    'xmlns:atom="http://www.w3.org/2005/Atom"',
  ]
    .filter(Boolean)
    .join(" ");

  const xmlItems = items.map((item) => {
    const guid = item.guid || item.url;
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid>${escapeXml(guid)}</guid>
      ${item.summary ? `<description>${escapeXml(item.summary)}</description>` : ""}
      <pubDate>${item.date.toUTCString()}</pubDate>
      ${item.html ? `<content:encoded><![CDATA[${item.html.replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>` : ""}
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>
<rss version="2.0" ${ns}>
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(site.href)}</link>
    <atom:link href="${escapeXml(`${site.origin}${selfPath}`)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-us</language>
${xmlItems.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Produce an Atom 1.0 response. */
export function atomSerializer(opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}): Response {
  const { title, description, selfPath, items } = opts;
  const site = opts.context.site!;

  const updated = items.length > 0 ? items[0].date.toISOString() : new Date().toISOString();

  const entries = items
    .map(
      (item) => `  <entry>
    <id>${escapeXml(item.url)}</id>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.url)}"/>
    <published>${item.date.toISOString()}</published>
    <updated>${item.date.toISOString()}</updated>
    ${item.summary ? `<summary>${escapeXml(item.summary)}</summary>` : ""}
    ${item.html ? `<content type="html"><![CDATA[${item.html.replace(/]]>/g, "]]]]><![CDATA[>")}]]></content>` : ""}
  </entry>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(`${site.origin}${selfPath}`)}</id>
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link rel="self" href="${escapeXml(`${site.origin}${selfPath}`)}"/>
  <link rel="alternate" href="${escapeXml(site.href)}"/>
  <author><name>${escapeXml(AUTHOR_NAME)}</name></author>
  <updated>${updated}</updated>
${entries}
</feed>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}

/** Produce a JSON Feed 1.1 response. */
export function jsonFeedSerializer(opts: {
  title: string;
  description: string;
  selfPath: string;
  context: APIContext;
  items: FeedItem[];
}): Response {
  const { title, description, selfPath, items } = opts;
  const site = opts.context.site!;

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title,
    description,
    home_page_url: site.href,
    feed_url: `${site.origin}${selfPath}`,
    authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
    items: items.map((item) => ({
      id: item.url,
      url: item.url,
      title: item.title,
      date_published: item.date.toISOString(),
      ...(item.summary ? { summary: item.summary } : {}),
      ...(item.html ? { content_html: item.html } : {}),
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });
}

// --- Factory ---

const FEED_SERIALIZERS: Record<FeedFormat, FeedSerializer> = {
  "rss.xml": rssSerializer,
  "atom.xml": atomSerializer,
  "feed.json": jsonFeedSerializer,
};

/**
 * Create Astro endpoint exports for a feed that serves all three formats
 * from a single [format].ts page file.
 *
 * Usage:
 *   export const { getStaticPaths, GET } = createFeedEndpoint({ ... });
 */
export function createFeedEndpoint(config: FeedEndpointConfig): {
  getStaticPaths: () => Array<{ params: { format: FeedFormat } }>;
  GET: (context: APIContext) => Promise<Response>;
} {
  return {
    getStaticPaths() {
      return (Object.keys(FEED_SERIALIZERS) as FeedFormat[]).map((format) => ({
        params: { format },
      }));
    },
    async GET(context: APIContext): Promise<Response> {
      const format = context.params.format as FeedFormat;
      const serializer = FEED_SERIALIZERS[format];
      if (!serializer) return new Response("Not found", { status: 404 });
      const site = context.site!;
      const sources = await config.getSources(context);
      const container = await createContainer();
      const items = await buildFeedItems(sources, container, site.origin);
      return serializer({
        context,
        title: config.title,
        description: config.description,
        selfPath: config.selfPath(format),
        items,
      });
    },
  };
}
