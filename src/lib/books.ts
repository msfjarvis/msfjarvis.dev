import { z } from "astro/zod";

const httpsUrl = z
  .url()
  .refine(
    (value) => new URL(value).protocol === "https:",
    "URL must use https",
  );

const readingTimestamp = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
      ) && !Number.isNaN(Date.parse(value)),
    "Timestamp must be an ISO 8601 date-time with an offset",
  );

export const bookSchema = z
  .object({
    bookTitle: z.string().trim().min(1),
    bookAuthors: z.array(z.string()),
    bookWork: httpsUrl,
    bookCover: httpsUrl.optional(),
    bookCoverAlt: z.string().optional(),
    bookSeries: z.string().optional(),
    bookSeriesNumber: z.string().optional(),
    bookPublishedYear: z.number().int().optional(),
    readingShelf: z.enum(["read", "reading", "stopped-reading"]),
    readingStartedAt: readingTimestamp.optional(),
    readingFinishedAt: readingTimestamp.optional(),
    readingStoppedAt: readingTimestamp.optional(),
    readingLastReadAt: readingTimestamp.optional(),
  })
  .superRefine((book, context) => {
    if (book.readingFinishedAt && book.readingStoppedAt) {
      context.addIssue({
        code: "custom",
        message: "A book cannot be both finished and stopped",
        path: ["readingStoppedAt"],
      });
    }
    const lastReadAt =
      book.readingFinishedAt ?? book.readingStoppedAt ?? book.readingStartedAt;
    if (book.readingLastReadAt !== lastReadAt) {
      context.addIssue({
        code: "custom",
        message:
          "readingLastReadAt must equal the finished, stopped, or started timestamp",
        path: ["readingLastReadAt"],
      });
    }
  });

export type Book = z.infer<typeof bookSchema>;

export type BookEntry = { data: Book; id: string };

/** Sorts the catalog once, newest reading activity first; undated books sort last. */
export function orderBooks<T extends BookEntry>(books: readonly T[]): T[] {
  return [...books].sort((left, right) => {
    const leftLastReadAt = left.data.readingLastReadAt;
    const rightLastReadAt = right.data.readingLastReadAt;
    if (leftLastReadAt && rightLastReadAt) {
      const order = Date.parse(rightLastReadAt) - Date.parse(leftLastReadAt);
      if (order) return order;
    } else if (leftLastReadAt) {
      return -1;
    } else if (rightLastReadAt) {
      return 1;
    }
    return left.id.localeCompare(right.id);
  });
}

export function partitionBooks<T extends BookEntry>(books: readonly T[]) {
  const ordered = orderBooks(books);
  return {
    currentlyReading: ordered.filter(
      (book) => book.data.readingShelf === "reading",
    ),
    finishedReading: ordered.filter(
      (book) => book.data.readingShelf === "read",
    ),
    stoppedReading: ordered.filter(
      (book) => book.data.readingShelf === "stopped-reading",
    ),
  };
}
