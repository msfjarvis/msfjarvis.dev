import { z } from "astro/zod";
import type { OpenLibraryBook } from "../open-library-lookup";
import { openLibraryBookMetadataFieldNames } from "./open-library-book-fields.ts";

export type CmsValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | CmsValue[]
  | { [key: string]: CmsValue };

export type CmsData = { [key: string]: CmsValue };

const importedBookSchema = z
  .object({
    bookTitle: z.string(),
    bookAuthors: z.array(z.string()),
    bookCover: z.string(),
    bookCoverAlt: z.string(),
    bookSeries: z.string(),
    bookSeriesNumber: z.string(),
    bookPublishedYear: z.number().optional(),
  })
  .refine((book) => Object.hasOwn(book, "bookPublishedYear"));

export function applyImportedBook(data: CmsData, importedBook: OpenLibraryBook): CmsData {
  const { bookImport: _bookImport, ...expanded } = data;

  for (const field of openLibraryBookMetadataFieldNames) {
    const incoming = importedBook[field];

    if (incoming !== undefined && incoming !== "") expanded[field] = incoming;
  }

  return expanded;
}

export function isImportedBook(value: CmsValue | undefined): value is OpenLibraryBook {
  const result = importedBookSchema.safeParse(value);

  return result.success;
}
