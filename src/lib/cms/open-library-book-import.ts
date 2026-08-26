import type { OpenLibraryBook } from "../open-library-lookup";
import { openLibraryBookMetadataFieldNames } from "./open-library-book-fields.ts";

export function applyImportedBook(
  data: Record<string, unknown>,
  importedBook: OpenLibraryBook,
): Record<string, unknown> {
  const { bookImport: _bookImport, ...expanded } = data;
  for (const field of openLibraryBookMetadataFieldNames) {
    const incoming = importedBook[field];
    if (incoming !== undefined && incoming !== "") expanded[field] = incoming;
  }
  return expanded;
}

export function isImportedBook(value: unknown): value is OpenLibraryBook {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<OpenLibraryBook>;
  return (
    typeof book.bookTitle === "string" &&
    Array.isArray(book.bookAuthors) &&
    typeof book.bookCover === "string" &&
    typeof book.bookCoverAlt === "string" &&
    typeof book.bookSeries === "string" &&
    typeof book.bookSeriesNumber === "string" &&
    (book.bookPublishedYear === undefined ||
      typeof book.bookPublishedYear === "number")
  );
}
