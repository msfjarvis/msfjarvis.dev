import type { OpenLibraryBook } from "../open-library-lookup";

export type PendingBook = OpenLibraryBook & {
  replace: boolean;
  overrides: Partial<OpenLibraryBook>;
};

const pending = new Map<string, PendingBook>();

export function setPendingBook(
  key: string,
  book: OpenLibraryBook,
  replace = false,
  overrides: Partial<OpenLibraryBook> = {},
): void {
  pending.set(key, { ...book, replace, overrides });
}

export function updatePendingBook(
  oldKey: string,
  book: OpenLibraryBook,
  override?: Partial<OpenLibraryBook>,
): void {
  const previous = pending.get(oldKey);
  pending.delete(oldKey);
  pending.set(book.bookTitle, {
    ...book,
    replace: previous?.replace ?? false,
    overrides: { ...previous?.overrides, ...override },
  });
}

export function getPendingBook(title: string): PendingBook | undefined {
  return pending.get(title);
}

export function removePendingBook(title: string): void {
  pending.delete(title);
}

export function consumePendingBook(title: string): PendingBook | undefined {
  const book = pending.get(title);
  if (book) pending.delete(title);
  return book;
}

export function applyPendingBook(
  data: Record<string, unknown>,
  pendingBook: PendingBook,
  isNew = true,
): Record<string, unknown> {
  const expanded = { ...data };
  const fields = [
    "bookTitle",
    "bookAuthors",
    "bookWork",
    "bookCover",
    "bookCoverAlt",
    "bookSeries",
    "bookSeriesNumber",
    "bookPublishedYear",
  ] as const;
  for (const field of fields) {
    const incoming = pendingBook[field];
    const existing = expanded[field];
    const empty =
      existing == null ||
      existing === "" ||
      (Array.isArray(existing) && existing.length === 0);
    if (field in pendingBook.overrides) {
      const override = pendingBook.overrides[field];
      if (override === "" || override === undefined) delete expanded[field];
      else expanded[field] = override;
    } else if (
      incoming !== undefined &&
      incoming !== "" &&
      (pendingBook.replace || (isNew && empty))
    ) {
      expanded[field] = incoming;
    }
  }
  return expanded;
}
