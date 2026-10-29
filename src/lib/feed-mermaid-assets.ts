import { concretizeMermaidSvgForFeeds } from "./feed-mermaid.ts";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FEED_FILE = /(?:rss\.xml|atom\.xml|feed\.json)$/;
const EMBEDDED_SVG = /data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g;

/**
 * Replace prerendered feed SVG data URLs with stable, standalone dark-theme
 * SVG assets. Run after Astro has generated the client output so the resulting
 * files are included in the Cloudflare assets directory.
 */
export async function externalizeFeedMermaidSvgs(
  clientDir: string,
  publicDir: string,
  siteUrl: string,
): Promise<number> {
  const diagramDir = path.join(clientDir, "diagrams");
  const feeds = await findFeedFiles(clientDir);
  const assets = new Map<string, string>();

  for (const feedPath of feeds) {
    const original = await readFile(feedPath, "utf8");

    const updated = original.replace(EMBEDDED_SVG, (_dataUrl, base64: string) => {
      const originalSvg = Buffer.from(base64, "base64").toString("utf8");
      const darkSvg = concretizeMermaidSvgForFeeds(originalSvg, "dark");
      const hash = createHash("sha256").update(darkSvg).digest("hex");
      const fileName = `${hash}.svg`;
      assets.set(fileName, darkSvg);

      return `${siteUrl.replace(/\/$/, "")}/diagrams/${fileName}`;
    });

    if (updated !== original) await writeFile(feedPath, updated);
  }

  if (assets.size > 0) {
    const publicDiagramDir = path.join(publicDir, "diagrams");
    await Promise.all(
      [diagramDir, publicDiagramDir].map((directory) => mkdir(directory, { recursive: true })),
    );
    await Promise.all(
      [...assets].flatMap(([fileName, svg]) =>
        [diagramDir, publicDiagramDir].map((directory) =>
          writeFile(path.join(directory, fileName), svg),
        ),
      ),
    );
  }

  return assets.size;
}

async function findFeedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory() && entry.name !== "diagrams") {
        return findFeedFiles(fullPath);
      }

      return entry.isFile() && FEED_FILE.test(entry.name) ? [fullPath] : [];
    }),
  );

  return nested.flat();
}
