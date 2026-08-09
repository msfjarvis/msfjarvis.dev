import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { gunzipSync } from "node:zlib";

const DEFAULT_DESTINATION = "src/content/books";
const READING_SHELVES = new Set(["read", "reading", "stopped-reading"]);
const BOOKWYRM_COVER_ORIGIN =
  "https://bookwyrm-social.sfo3.digitaloceanspaces.com/";

function archiveEntryName(buffer, offset) {
  return buffer
    .subarray(offset, offset + 100)
    .toString("utf8")
    .replace(/\0.*$/, "");
}

function archiveEntrySize(buffer, offset) {
  const size = buffer
    .subarray(offset + 124, offset + 136)
    .toString("utf8")
    .replace(/\0.*$/, "")
    .trim();
  return size ? Number.parseInt(size, 8) : 0;
}

/** Returns `archive.json` from a BookWyrm account-export tarball. */
export function extractArchiveJson(archive) {
  const contents = gunzipSync(archive);
  for (let offset = 0; offset + 512 <= contents.length;) {
    const name = archiveEntryName(contents, offset);
    if (!name) break;
    const size = archiveEntrySize(contents, offset);
    if (!Number.isSafeInteger(size) || size < 0)
      throw new Error(`Invalid tar entry size for ${name}`);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > contents.length)
      throw new Error(`Truncated tar entry: ${name}`);
    if (name === "archive.json")
      return contents.subarray(contentStart, contentEnd);
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  throw new Error("BookWyrm account export does not contain archive.json");
}

export function parseBookwyrmExport(contents) {
  const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  const json = buffer.subarray(0, 1).toString("utf8") === "{";
  try {
    const exportData = JSON.parse(
      (json ? buffer : extractArchiveJson(buffer)).toString("utf8"),
    );
    if (!Array.isArray(exportData.books))
      throw new Error("archive.json has no books array");
    return exportData;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("BookWyrm archive.json is invalid JSON", {
        cause: error,
      });
    throw error;
  }
}

export function normalizeTitleSlug(title) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug)
    throw new Error(
      `Cannot generate a slug for title ${JSON.stringify(title)}`,
    );
  return slug;
}

function displayAuthors(authors) {
  return (Array.isArray(authors) ? authors : [])
    .map((author) =>
      typeof author === "string"
        ? author
        : typeof author?.name === "string"
          ? author.name
          : undefined,
    )
    .filter(
      (author) =>
        typeof author === "string" &&
        author.length > 0 &&
        !/^https?:\/\//i.test(author),
    );
}

function yearOf(value) {
  if (!value) return undefined;
  const match = String(value).match(/^(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

function timestamp(value, field) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)))
    throw new Error(`Invalid BookWyrm ${field}: ${JSON.stringify(value)}`);
  return value;
}

function shelfIdentifier(shelf) {
  if (!shelf || typeof shelf.id !== "string")
    throw new Error("BookWyrm book has a shelf without an ID");
  try {
    return new URL(shelf.id).pathname.split("/").at(-1);
  } catch {
    throw new Error(`Invalid BookWyrm shelf ID: ${shelf.id}`);
  }
}

export function selectReadingShelf(shelves) {
  const matchingShelves = (Array.isArray(shelves) ? shelves : [])
    .map(shelfIdentifier)
    .filter((shelf) => READING_SHELVES.has(shelf));
  if (matchingShelves.length === 0) return undefined;
  if (matchingShelves.length > 1)
    throw new Error(
      `BookWyrm book belongs to multiple reading shelves: ${matchingShelves.join(", ")}`,
    );
  return matchingShelves[0];
}

export function selectReadthrough(readthroughs) {
  const candidates = (Array.isArray(readthroughs) ? readthroughs : []).map(
    (readthrough) => {
      const startedAt = timestamp(readthrough.start_date, "start_date");
      const finishedAt = timestamp(readthrough.finish_date, "finish_date");
      const stoppedAt = timestamp(readthrough.stopped_date, "stopped_date");
      if (finishedAt && stoppedAt)
        throw new Error(
          "BookWyrm read-through has both finish_date and stopped_date",
        );
      if (
        startedAt &&
        ((finishedAt && Date.parse(finishedAt) < Date.parse(startedAt)) ||
          (stoppedAt && Date.parse(stoppedAt) < Date.parse(startedAt)))
      ) {
        throw new Error("BookWyrm read-through ends before it starts");
      }
      const lastReadAt = finishedAt ?? stoppedAt ?? startedAt;
      if (!lastReadAt)
        throw new Error("BookWyrm read-through has no reading timestamp");
      return { startedAt, finishedAt, stoppedAt, lastReadAt };
    },
  );
  if (candidates.length === 0)
    throw new Error("BookWyrm book has no read-throughs");
  return candidates.sort(
    (left, right) =>
      Date.parse(right.lastReadAt) - Date.parse(left.lastReadAt) ||
      Date.parse(right.startedAt ?? right.lastReadAt) -
        Date.parse(left.startedAt ?? left.lastReadAt),
  )[0];
}

function coverUrl(cover) {
  if (!cover?.url || typeof cover.url !== "string") return undefined;
  if (/^https:\/\//i.test(cover.url)) return cover.url;
  if (cover.url.startsWith("images/"))
    return new URL(cover.url, BOOKWYRM_COVER_ORIGIN).toString();
  return undefined;
}

async function downloadCover(sourceUrl, fetch) {
  if (!sourceUrl) return undefined;
  const response = await fetch(sourceUrl);
  if (!response.ok)
    throw new Error(
      `Failed to download cover (${response.status} ${response.statusText}): ${sourceUrl}`,
    );
  return {
    filename: `cover${extname(new URL(sourceUrl).pathname)}`,
    contents: Buffer.from(await response.arrayBuffer()),
  };
}

/** Projects one book from BookWyrm's authenticated account export. */
export function projectBook(source) {
  const edition = source?.edition;
  if (
    !edition ||
    typeof edition.id !== "string" ||
    typeof edition.title !== "string" ||
    typeof edition.work !== "string"
  ) {
    throw new Error(
      "BookWyrm export book is missing edition ID, title, or work URL",
    );
  }
  const readingShelf = selectReadingShelf(source.shelves);
  if (!readingShelf) return undefined;

  const reading = selectReadthrough(source.readthroughs);
  if (readingShelf === "read" && !reading.finishedAt)
    throw new Error(`${edition.title}: read shelf entry has no finish_date`);
  if (readingShelf === "reading" && (reading.finishedAt || reading.stoppedAt))
    throw new Error(`${edition.title}: reading shelf entry has ended`);
  if (readingShelf === "stopped-reading" && !reading.stoppedAt)
    throw new Error(
      `${edition.title}: stopped-reading shelf entry has no stopped_date`,
    );

  const book = {
    bookTitle: edition.title,
    bookAuthors: displayAuthors(source.authors ?? edition.authors),
    bookWork: edition.work,
    bookCover: undefined,
    bookCoverAlt: undefined,
    bookSeries: undefined,
    bookSeriesNumber: undefined,
    bookPublishedYear: undefined,
    readingShelf,
    readingStartedAt: reading.startedAt,
    readingFinishedAt: reading.finishedAt,
    readingStoppedAt: reading.stoppedAt,
    readingLastReadAt: reading.lastReadAt,
  };
  const bookCover = coverUrl(edition.cover);
  if (bookCover) {
    book.bookCover = bookCover;
    book.bookCoverAlt = edition.cover.name || `Cover of ${edition.title}`;
  }
  if (edition.series) book.bookSeries = edition.series;
  if (edition.seriesNumber)
    book.bookSeriesNumber = String(edition.seriesNumber);
  const publishedYear =
    yearOf(edition.publishedDate) ?? yearOf(edition.firstPublishedDate);
  if (publishedYear !== undefined) book.bookPublishedYear = publishedYear;
  return book;
}

function yamlString(value) {
  return JSON.stringify(value);
}

export function renderMdx(book) {
  const lines = ["---", `bookTitle: ${yamlString(book.bookTitle)}`];
  if (book.bookAuthors.length) {
    lines.push("bookAuthors:");
    for (const author of book.bookAuthors)
      lines.push(`  - ${yamlString(author)}`);
  } else {
    lines.push("bookAuthors: []");
  }
  lines.push(`bookWork: ${yamlString(book.bookWork)}`);
  if (book.bookCover !== undefined) {
    lines.push(`bookCover: ${yamlString(book.bookCover)}`);
    lines.push(`bookCoverAlt: ${yamlString(book.bookCoverAlt)}`);
  }
  if (book.bookSeries !== undefined)
    lines.push(`bookSeries: ${yamlString(book.bookSeries)}`);
  if (book.bookSeriesNumber !== undefined)
    lines.push(`bookSeriesNumber: ${yamlString(book.bookSeriesNumber)}`);
  if (book.bookPublishedYear !== undefined)
    lines.push(`bookPublishedYear: ${book.bookPublishedYear}`);
  lines.push(`readingShelf: ${book.readingShelf}`);
  if (book.readingStartedAt !== undefined)
    lines.push(`readingStartedAt: ${yamlString(book.readingStartedAt)}`);
  if (book.readingFinishedAt !== undefined)
    lines.push(`readingFinishedAt: ${yamlString(book.readingFinishedAt)}`);
  if (book.readingStoppedAt !== undefined)
    lines.push(`readingStoppedAt: ${yamlString(book.readingStoppedAt)}`);
  lines.push(`readingLastReadAt: ${yamlString(book.readingLastReadAt)}`, "---");
  return `${lines.join("\n")}\n`;
}

async function isPopulated(directory) {
  try {
    return (await readdir(directory, { recursive: true })).length > 0;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function catalogOrder(left, right) {
  return (
    Date.parse(right.readingLastReadAt) - Date.parse(left.readingLastReadAt) ||
    left.bookWork.localeCompare(right.bookWork)
  );
}

export async function importReadingCatalog({
  exportPath,
  exportData,
  destination = DEFAULT_DESTINATION,
  force = false,
  fetch = globalThis.fetch,
  fs = { mkdir, readFile, writeFile, isPopulated },
} = {}) {
  if (!exportData && !exportPath)
    throw new Error("Provide a BookWyrm account export with --export");
  const data = exportData ?? parseBookwyrmExport(await fs.readFile(exportPath));
  const sourceIds = new Set();
  const books = data.books
    .map((source) => {
      const book = projectBook(source);
      if (!book) return undefined;
      if (sourceIds.has(source.edition.id))
        throw new Error(`Duplicate BookWyrm source item: ${source.edition.id}`);
      sourceIds.add(source.edition.id);
      return book;
    })
    .filter(Boolean)
    .sort(catalogOrder);

  const usedSlugs = new Set();
  const entries = books.map((book) => {
    const base = normalizeTitleSlug(book.bookTitle);
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
    usedSlugs.add(slug);
    return { slug, shelf: book.readingShelf, book };
  });

  if ((await fs.isPopulated(destination)) && !force) {
    throw new Error(
      `Refusing to overwrite populated destination: ${destination} (use --force)`,
    );
  }
  if (!fetch) throw new Error("No fetch implementation is available");
  const entriesWithCovers = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      cover: await downloadCover(entry.book.bookCover, fetch),
    })),
  );
  await fs.mkdir(destination, { recursive: true });
  let writtenCount = 0;
  for (const entry of entriesWithCovers) {
    await fs.mkdir(join(destination, entry.slug), { recursive: true });
    if (entry.cover) {
      await fs.writeFile(
        join(destination, entry.slug, entry.cover.filename),
        entry.cover.contents,
      );
    }
    await fs.writeFile(
      join(destination, entry.slug, "index.mdx"),
      renderMdx({
        ...entry.book,
        bookCover: entry.cover ? `./${entry.cover.filename}` : undefined,
      }),
      "utf8",
    );
    writtenCount += 1;
  }
  if (writtenCount !== sourceIds.size)
    throw new Error("Written count does not match source count");
  return {
    count: entries.length,
    shelves: Object.fromEntries(
      [...READING_SHELVES].map((shelf) => [
        shelf,
        entries.filter((entry) => entry.shelf === shelf).length,
      ]),
    ),
  };
}

function parseArgs(args) {
  const options = { destination: DEFAULT_DESTINATION, force: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--force") options.force = true;
    else if (arg === "--export") options.exportPath = args[++index];
    else if (arg === "--output") options.destination = args[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importReadingCatalog(parseArgs(process.argv.slice(2)))
    .then(({ count }) => console.log(`Imported ${count} books.`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
