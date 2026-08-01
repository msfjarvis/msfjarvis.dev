export type OpenLibraryBook = {
  bookTitle: string;
  bookAuthors: string[];
  bookWork: string;
  bookCover: string;
  bookCoverAlt: string;
  bookSeries: string;
  bookSeriesNumber: string;
  bookPublishedYear: number | undefined;
};

export type LookupOptions = {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  maxAuthors?: number;
};

const cache = new Map<string, Promise<OpenLibraryBook>>();
const WORK_PATH = /^\/(works)\/(OL\d+W)(?:\/[^/]*)*\/?$/i;
const EDITION_PATH = /^\/(books)\/(OL\d+M)(?:\/[^/]*)*\/?$/i;
const MAX_AUTHORS = 4;

export function parseOpenLibraryUrl(
  input: string,
):
  { kind: "work"; key: string } | { kind: "edition"; key: string } | undefined {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return undefined;
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "openlibrary.org" ||
    url.port !== ""
  )
    return undefined;
  const work = WORK_PATH.exec(url.pathname);
  if (work) return { kind: "work", key: work[2].toUpperCase() };
  const edition = EDITION_PATH.exec(url.pathname);
  if (edition) return { kind: "edition", key: edition[2].toUpperCase() };
  return undefined;
}

export function clearOpenLibraryCache(): void {
  cache.clear();
}

export async function lookupOpenLibraryBook(
  input: string,
  options: LookupOptions = {},
): Promise<OpenLibraryBook> {
  const parsed = parseOpenLibraryUrl(input);
  if (!parsed) {
    throw new Error("Enter an exact HTTPS Open Library work or edition URL.");
  }
  const canonical = `${parsed.kind}:${parsed.key}`;
  // Test/custom fetchers and non-default limits must never share production data.
  const canCache =
    options.fetch === undefined &&
    options.timeoutMs === undefined &&
    options.maxAuthors === undefined;
  if (canCache) {
    const cached = cache.get(canonical);
    if (cached) return cached;
    const request = lookup(parsed, options);
    cache.set(canonical, request);
    request.catch(() => cache.delete(canonical));
    return request;
  }
  return lookup(parsed, options);
}

async function lookup(
  parsed: NonNullable<ReturnType<typeof parseOpenLibraryUrl>>,
  options: LookupOptions,
): Promise<OpenLibraryBook> {
  const fetcher = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const deadline = Date.now() + timeoutMs;
  const edition =
    parsed.kind === "edition"
      ? await getJson(fetcher, `/books/${parsed.key}.json`, deadline)
      : undefined;
  const workKey =
    parsed.kind === "work" ? parsed.key : workKeyFromEdition(edition);
  const work = await getJson(fetcher, `/works/${workKey}.json`, deadline);
  const authors = await authorNames(
    work.authors,
    fetcher,
    deadline,
    options.maxAuthors ?? MAX_AUTHORS,
  );
  const editionCover = coverUrl(edition?.covers);
  const workCover = coverUrl(work.covers);
  const title = stringValue(edition?.title) || stringValue(work.title);
  const series = normalizeSeries(edition?.series ?? work.series);
  const year =
    publishedYear(edition?.publish_date) ??
    numberValue(work.first_publish_year);

  if (!title)
    throw new Error("Open Library returned a record without a title.");
  return {
    bookTitle: title,
    bookAuthors: authors,
    bookWork: `https://openlibrary.org/works/${workKey}`,
    bookCover: editionCover || workCover,
    bookCoverAlt: `Cover of ${title}`,
    bookSeries: series.name,
    bookSeriesNumber: series.number,
    bookPublishedYear: year,
  };
}

function workKeyFromEdition(edition: Record<string, any> | undefined): string {
  const key = edition?.works?.[0]?.key;
  if (typeof key !== "string")
    throw new Error("Open Library edition has no work identity.");
  const path = /^\/works\/(OL\d+W)\/?$/i.exec(key);
  if (path) return path[1].toUpperCase();
  const url = parseOpenLibraryUrl(key);
  if (url?.kind === "work") return url.key;
  throw new Error("Open Library edition has no work identity.");
}

async function authorNames(
  entries: unknown,
  fetcher: typeof globalThis.fetch,
  deadline: number,
  maxAuthors: number,
): Promise<string[]> {
  if (!Array.isArray(entries)) return [];
  const keys = entries
    .slice(0, Math.max(0, Math.min(maxAuthors, MAX_AUTHORS)))
    .map((entry) => (entry as any)?.author?.key ?? (entry as any)?.key)
    .filter(
      (key): key is string =>
        typeof key === "string" && /^\/authors\/OL\d+A$/i.test(key),
    );
  const names: string[] = [];
  for (const key of keys) {
    const author = await getJson(fetcher, `${key}.json`, deadline);
    const name = stringValue(author.name);
    if (name) names.push(name);
  }
  return names;
}

async function getJson(
  fetcher: typeof globalThis.fetch,
  path: string,
  deadline: number,
): Promise<Record<string, any>> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Open Library request timed out.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const response = await fetcher(`https://openlibrary.org${path}`, {
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Open Library request failed (${response.status}).`);
    return (await response.json()) as Record<string, any>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("Open Library request timed out.", { cause: error });
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("Open Library request timed out.", { cause: error });
    throw error instanceof Error
      ? error
      : new Error("Open Library request failed.");
  } finally {
    clearTimeout(timer);
  }
}

function coverUrl(covers: unknown): string {
  const id = Array.isArray(covers)
    ? covers.find((value) => Number.isInteger(value) && value > 0)
    : undefined;
  return id === undefined
    ? ""
    : `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
}

function normalizeSeries(value: unknown): { name: string; number: string } {
  const item = Array.isArray(value) ? value[0] : value;
  if (typeof item === "string") return { name: item, number: "" };
  if (item && typeof item === "object")
    return {
      name: stringValue((item as any).name),
      number: stringValue((item as any).number),
    };
  return { name: "", number: "" };
}

function publishedYear(value: unknown): number | undefined {
  const match =
    typeof value === "string" &&
    /(?:^|\D)((?:1[0-9]{3}|20[0-9]{2}|21[0-9]{2}))(?:\D|$)/.exec(value);
  return match ? Number(match[1]) : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : value == null
      ? ""
      : String(value).trim();
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
