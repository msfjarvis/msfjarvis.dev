import {
  AI_SEARCH_COLLECTIONS,
  changedAiSearchDocuments,
  listAiSearchItems,
  prepareAiSearchDocuments,
  readAiSearchConfig,
  reconcileAiSearchDocuments,
  uploadAiSearchDocument,
} from "../lib/cloudflare-ai-search.ts";
import type {
  AiSearchConfig,
  SearchSourceDocument,
} from "../lib/cloudflare-ai-search.ts";
import type { AstroIntegration } from "astro";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function readCollectionSources(
  contentDir: string,
): Promise<SearchSourceDocument[]> {
  const documents: SearchSourceDocument[] = [];

  for (const collection of AI_SEARCH_COLLECTIONS) {
    const collectionDir = path.join(contentDir, collection);
    const visit = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await visit(filePath);
        } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
          documents.push({
            collection,
            relativePath: path.relative(collectionDir, filePath),
            source: await readFile(filePath, "utf8"),
          });
        }
      }
    };
    await visit(collectionDir);
  }

  return documents;
}

export default function cloudflareAiSearch(siteUrl: string): AstroIntegration {
  let rootDir: string;
  let config: AiSearchConfig | undefined;

  return {
    name: "cloudflare-ai-search",
    hooks: {
      "astro:config:setup": ({ config: astroConfig }) => {
        rootDir = fileURLToPath(astroConfig.root);
        config = readAiSearchConfig(process.env);
      },
      "astro:build:done": async ({ logger }) => {
        if (!config) {
          logger.info(
            "Cloudflare AI Search indexing skipped; no Cloudflare AI Search configuration is set",
          );
          return;
        }

        const sources = await readCollectionSources(
          path.join(rootDir, "src/content"),
        );
        const documents = prepareAiSearchDocuments(
          sources,
          process.env.INCLUDE_DRAFTS === "true",
          siteUrl,
        );
        const existingItems = await listAiSearchItems(config);
        const changedDocuments = changedAiSearchDocuments(
          documents,
          existingItems,
          siteUrl,
        );
        for (const document of changedDocuments) {
          await uploadAiSearchDocument(config, document);
        }
        await reconcileAiSearchDocuments(
          config,
          documents,
          siteUrl,
          fetch,
          existingItems,
        );
        logger.info(
          `Cloudflare AI Search indexed ${changedDocuments.length} changed source files`,
        );
      },
    },
  };
}
