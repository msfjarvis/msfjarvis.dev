import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import mdxRenderer from '@astrojs/mdx/server.js';
import { render } from 'astro:content';
import { load } from 'cheerio';

/** Escape a string for safe embedding in XML text or attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert root-relative URLs in src/href attributes to absolute URLs for RSS */
export function absolutizeUrls(html: string, origin: string): string {
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
        throw Error("Failed to find lightbox trigger in page, has the layout changed?")
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

/** Render entry content to HTML for inclusion in RSS feeds */
export async function renderEntryContentForRss(
  entry: any,
  origin: string,
): Promise<string> {
  const container = await createContainer();
  const { Content } = await render(entry);
  let html = await container.renderToString(Content);
  
  // Remove lightbox duplicates using proper HTML parsing
  html = removeLightboxDuplicates(html);
  
  return absolutizeUrls(html, origin);
}