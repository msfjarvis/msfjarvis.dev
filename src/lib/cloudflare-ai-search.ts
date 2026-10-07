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
  metadata: {
    title: string;
    description: string;
    site: string;
    collection: AiSearchCollection;
  };
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
  "CLOUDFLARE_API_TOKEN",
] as const;

const LEGACY_KEY_PREFIXES = [
  "posts-",
  "notes-",
  "weeknotes-",
  "games-",
  "books-",
];
const PAGE_SIZE = 50;

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

function contentString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function canonicalUrl(
  siteUrl: string,
  collection: AiSearchCollection,
  path: string,
): string {
  const id = path
    .replace(/\\/g, "/")
    .replace(/\/index\.(?:md|mdx)$/i, "")
    .replace(/\.(?:md|mdx)$/i, "");
  const route = collection === "books" ? "reading" : collection;
  return new URL(`/${route}/${id}/`, siteUrl).href;
}

export function prepareAiSearchDocuments(
  documents: readonly SearchSourceDocument[],
  includeDrafts: boolean,
  siteUrl: string,
): AiSearchDocument[] {
  const site = new URL(siteUrl).host;
  return documents
    .filter((document) => isSearchDocumentIncluded(document, includeDrafts))
    .map((document) => {
      if (!/\.(md|mdx)$/i.test(document.relativePath)) {
        throw new Error(
          `Unsupported AI Search source file: ${document.relativePath}`,
        );
      }
      const url = canonicalUrl(
        siteUrl,
        document.collection,
        document.relativePath,
      );
      if (url.length > 128) {
        throw new Error(
          `Cloudflare AI Search filename exceeds 128 characters: ${url}`,
        );
      }
      const content = frontmatter(document.source);
      return {
        ...document,
        filename: url,
        metadata: {
          title:
            contentString(content.title) ??
            contentString(content.bookTitle) ??
            document.relativePath.replace(/\.(md|mdx)$/i, ""),
          description:
            contentString(content.summary) ??
            contentString(content.subtitle) ??
            contentString(content.description) ??
            "",
          site,
          collection: document.collection,
        },
      };
    });
}

function itemsEndpoint(config: AiSearchConfig): URL {
  return new URL(
    `/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai-search/namespaces/${encodeURIComponent(config.namespace)}/instances/${encodeURIComponent(config.instanceId)}/items`,
    "https://api.cloudflare.com",
  );
}

interface CloudflareResponse {
  success?: boolean;
  errors?: unknown[];
  result?: unknown;
  result_info?: { total_count?: number; per_page?: number };
}

async function responseBody(
  response: Response,
  action: string,
): Promise<CloudflareResponse> {
  const body = (await response.json().catch(() => undefined)) as
    CloudflareResponse | undefined;
  if (!response.ok || body?.success === false) {
    const details = body?.errors?.length
      ? JSON.stringify(body.errors)
      : `${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare AI Search ${action} failed: ${details}`);
  }
  return body ?? {};
}

export async function uploadAiSearchDocument(
  config: AiSearchConfig,
  document: AiSearchDocument,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (document.filename.length > 128) {
    throw new Error(
      `Cloudflare AI Search filename exceeds 128 characters: ${document.filename}`,
    );
  }
  const form = new FormData();
  form.set(
    "file",
    new Blob([document.source], { type: "text/markdown" }),
    document.filename,
  );
  form.set("metadata", JSON.stringify(document.metadata));

  const response = await fetcher(itemsEndpoint(config), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiToken}` },
    body: form,
  });
  await responseBody(response, `upload for ${document.filename}`);
}

interface ManagedItem {
  id?: string;
  key?: string;
  metadata?: { site?: unknown };
}

function isManagedItem(item: ManagedItem, site: string): boolean {
  if (typeof item.metadata?.site === "string") {
    return item.metadata.site === site;
  }
  return (
    typeof item.key === "string" &&
    LEGACY_KEY_PREFIXES.some((prefix) => item.key!.startsWith(prefix))
  );
}

export async function reconcileAiSearchDocuments(
  config: AiSearchConfig,
  documents: readonly AiSearchDocument[],
  siteUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const endpoint = itemsEndpoint(config);
  const site = new URL(siteUrl).host;
  const desired = new Set(documents.map(({ filename }) => filename));
  const managed: ManagedItem[] = [];
  for (let page = 1; ; page += 1) {
    const listUrl = new URL(endpoint);
    listUrl.searchParams.set("source", "builtin");
    listUrl.searchParams.set("page", String(page));
    listUrl.searchParams.set("per_page", String(PAGE_SIZE));
    const response = await fetcher(listUrl, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    const body = await responseBody(response, "list");
    const result = body.result as ManagedItem[] | undefined;
    const items = Array.isArray(result) ? result : [];
    managed.push(...items);
    const totalCount = body.result_info?.total_count;
    if (
      (totalCount !== undefined && page * PAGE_SIZE >= totalCount) ||
      (totalCount === undefined && items.length < PAGE_SIZE)
    )
      break;
  }

  for (const item of managed) {
    if (!isManagedItem(item, site) || !item.key || desired.has(item.key))
      continue;
    if (!item.id)
      throw new Error(
        `Cloudflare AI Search item ${item.key} has no id for deletion`,
      );
    const response = await fetcher(
      new URL(`${endpoint.href}/${encodeURIComponent(item.id)}`),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${config.apiToken}` },
      },
    );
    await responseBody(response, `delete for ${item.key}`);
  }
}
