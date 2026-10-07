import { load } from "js-yaml";

export const AI_SEARCH_COLLECTIONS = [
  "posts",
  "notes",
  "weeknotes",
  "games",
  "books",
] as const;

export type AiSearchCollection = (typeof AI_SEARCH_COLLECTIONS)[number];

export interface SearchSourceDocument {
  collection: AiSearchCollection;
  relativePath: string;
  source: string;
}

export interface AiSearchDocument extends SearchSourceDocument {
  filename: string;
}

export interface AiSearchConfig {
  accountId: string;
  namespace: string;
  instanceId: string;
  apiToken: string;
}

const configKeys = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_AI_SEARCH_NAMESPACE",
  "CLOUDFLARE_AI_SEARCH_INSTANCE_ID",
  "CLOUDFLARE_AI_SEARCH_API_TOKEN",
] as const;

export function readAiSearchConfig(
  env: Record<string, string | undefined>,
): AiSearchConfig | undefined {
  const values = configKeys.map((key) => env[key]?.trim() ?? "");
  if (values.every((value) => value === "")) return undefined;

  const missing = configKeys.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Cloudflare AI Search configuration is incomplete; missing ${missing.join(", ")}`,
    );
  }

  const [accountId, namespace, instanceId, apiToken] = values;
  if (!accountId || !namespace || !instanceId || !apiToken) return undefined;
  return { accountId, namespace, instanceId, apiToken };
}

function frontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const parsed: unknown = load(match[1]);
  if (parsed === undefined) return {};
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Content frontmatter must be a YAML mapping");
  }
  return parsed as Record<string, unknown>;
}

export function isSearchDocumentIncluded(
  document: SearchSourceDocument,
  includeDrafts: boolean,
): boolean {
  const metadata = frontmatter(document.source);
  return (
    metadata.deleted !== true && (includeDrafts || metadata.draft !== true)
  );
}

export function prepareAiSearchDocuments(
  documents: readonly SearchSourceDocument[],
  includeDrafts: boolean,
): AiSearchDocument[] {
  return documents
    .filter((document) => isSearchDocumentIncluded(document, includeDrafts))
    .map((document) => {
      const extension = document.relativePath.match(/\.(md|mdx)$/i)?.[1];
      if (!extension) {
        throw new Error(
          `Unsupported AI Search source file: ${document.relativePath}`,
        );
      }
      const id = document.relativePath
        .replace(/\\/g, "/")
        .replace(/\/index\.(?:md|mdx)$/i, "")
        .replace(/\.(?:md|mdx)$/i, "")
        .replaceAll("/", "-");
      return {
        ...document,
        filename: `${document.collection}-${id}.${extension.toLowerCase()}`,
      };
    });
}

export async function uploadAiSearchDocument(
  config: AiSearchConfig,
  document: AiSearchDocument,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const endpoint = new URL(
    `/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai-search/namespaces/${encodeURIComponent(config.namespace)}/instances/${encodeURIComponent(config.instanceId)}/items`,
    "https://api.cloudflare.com",
  );
  const form = new FormData();
  form.set(
    "file",
    new Blob([document.source], { type: "text/markdown" }),
    document.filename,
  );

  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiToken}` },
    body: form,
  });
  const body = (await response.json().catch(() => undefined)) as
    { success?: boolean; errors?: unknown[] } | undefined;
  if (!response.ok || body?.success === false) {
    const details = body?.errors?.length
      ? JSON.stringify(body.errors)
      : `${response.status} ${response.statusText}`;
    throw new Error(
      `Cloudflare AI Search upload failed for ${document.filename}: ${details}`,
    );
  }
}
