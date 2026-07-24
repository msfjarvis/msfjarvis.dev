import type { Loader } from "astro/loaders";
import type { z } from "astro/zod";
import { shelfSchema, pageSchema, editionSchema } from "./bookwyrm-schemas.ts";

export function bookwyrmLoader(options: { profileUrl: string }) {
  const bookwyrmProfileUrl = new URL(options.profileUrl);
  return {
    name: "feed-loader",
    load: async ({ store }) => {
      const baseUrl = `${bookwyrmProfileUrl}/books/read`;
      const shelfUrl = `${baseUrl}.json`;

      const shelfResponse = await fetch(shelfUrl);
      if (!shelfResponse.ok) {
        throw new Error(`Failed to fetch shelf data: ${shelfResponse.statusText}`);
      }

      const shelfData = shelfSchema.parse(await shelfResponse.json());
      const totalPages = parseInt(new URL(shelfData.last).searchParams.get("page") ?? "0");
      type Book = z.infer<typeof editionSchema>;
      const books: Book[] = [];

      for (let page = 1; page <= totalPages; page++) {
        const pageUrl = `${baseUrl}.json?page=${page}`;
        const response = await fetch(pageUrl);
        if (!response.ok) {
          throw new Error(`Error fetching page ${page}: ${response.statusText}`);
        }

        const data = pageSchema.parse(await response.json());
        if (data.orderedItems) {
          books.push(...data.orderedItems);
        }
      }

      // Astro sorts collection entries by ID, so prefix each BookWyrm ID with its shelf position.
      // This retains BookWyrm's newest-first order after the content store is serialized.
      store.clear();
      books.forEach((book, index) => {
        store.set({ id: `${String(index).padStart(8, "0")}:${book.id}`, data: book });
      });
    },
    schema: editionSchema,
  } satisfies Loader;
}
