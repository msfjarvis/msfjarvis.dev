import * as fs from "node:fs/promises";
import path from "node:path";

export function getImagePath({ url, site }: { url: URL; site: URL }): URL {
  const pathname = url.pathname;
  const imagePath =
    pathname === "/404/" || pathname === "/500/"
      ? `${pathname.slice(0, -1)}.png`
      : pathname.endsWith("/")
        ? `${pathname}index.png`
        : `${pathname}.png`;
  return new URL(imagePath.slice(1), site);
}

export async function getPageHtmlPath({
  dir,
  page,
}: {
  dir: string;
  page: string;
}): Promise<string> {
  const decodedPath = decodeURIComponent(page);
  const normalizedPath = decodedPath.replace(/^\/+/, "");
  const pagePath = normalizedPath.endsWith("/")
    ? normalizedPath.slice(0, -1)
    : normalizedPath;
  const candidates = [
    path.join(dir, pagePath, "index.html"),
    path.join(dir, `${pagePath}.html`),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next supported Astro output layout.
    }
  }

  throw new Error(`Could not find built HTML for page ${page}`);
}
