import type { OpenLibraryBook } from "../open-library-lookup";

/**
 * The persisted CMS fields filled by an Open Library import. Keeping this list
 * beside the CMS field definitions prevents the importer from writing an
 * undeclared frontmatter property.
 */
export const openLibraryBookMetadataFieldNames = [
  "bookTitle",
  "bookAuthors",
  "bookWork",
  "bookCover",
  "bookCoverAlt",
  "bookSeries",
  "bookSeriesNumber",
  "bookPublishedYear",
] as const satisfies readonly (keyof OpenLibraryBook)[];

export const openLibraryBookMetadataFields = [
  {
    label: "Authors",
    name: "bookAuthors",
    widget: "list",
    required: false,
  },
  {
    label: "Open Library work",
    name: "bookWork",
    widget: "string",
    pattern: [
      "^(?:$|https://openlibrary\\.org/works/OL\\d+W)$",
      "Use a canonical HTTPS Open Library work URL.",
    ],
    required: false,
  },
  {
    label: "Cover",
    name: "bookCover",
    widget: "string",
    pattern: [
      "^(?:$|https://[^\\s]+|\\./[^\\s]+)$",
      "Use an https URL or a relative path beginning with ./",
    ],
    required: false,
  },
  {
    label: "Cover alt text",
    name: "bookCoverAlt",
    widget: "string",
    required: false,
  },
  {
    label: "Series",
    name: "bookSeries",
    widget: "string",
    required: false,
  },
  {
    label: "Series number",
    name: "bookSeriesNumber",
    widget: "string",
    required: false,
  },
  {
    label: "Published year",
    name: "bookPublishedYear",
    widget: "number",
    required: false,
  },
] as const;
