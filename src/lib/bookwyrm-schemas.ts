import { z } from "astro/zod";

const activityStreamsContextSchema = z.array(
  z.union([z.string(), z.object({ Hashtag: z.string() })]),
);

const imageSchema = z.object({
  type: z.string(),
  url: z.string(),
  name: z.string(),
  "@context": activityStreamsContextSchema,
});

const fileLinkSchema = z.object({
  href: z.string(),
  mediaType: z.string(),
  attributedTo: z.string(),
  availability: z.string(),
});

export const optionalDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.date().optional(),
);

export const editionSchema = z.object({
  id: z.string(),
  type: z.string(),
  asin: z.string().optional(),
  goodreadsKey: z.string().optional(),
  inventaireId: z.string().optional(),
  isfdb: z.string().optional(),
  lastEditedBy: z.string().optional(),
  librarythingKey: z.string().optional(),
  openlibraryKey: z.string().optional(),
  title: z.string(),
  sortTitle: z.string(),
  subtitle: z.string().optional(),
  description: z.string(),
  languages: z.array(z.string()),
  series: z.string(),
  seriesNumber: z.string(),
  seriesBooks: z.array(z.unknown()),
  subjects: z.array(z.string()),
  subjectPlaces: z.array(z.unknown()),
  authors: z.array(z.string()),
  firstPublishedDate: optionalDateSchema,
  publishedDate: optionalDateSchema,
  fileLinks: z.array(fileLinkSchema),
  cover: imageSchema,
  work: z.string(),
  isbn10: z.string(),
  isbn13: z.string(),
  oclcNumber: z.string(),
  pages: z.number().optional(),
  physicalFormat: z.string(),
  physicalFormatDetail: z.string(),
  publishers: z.array(z.string()),
  editionRank: z.number(),
  "@context": activityStreamsContextSchema,
});

export const shelfSchema = z.object({
  id: z.string(),
  type: z.string(),
  totalItems: z.number(),
  first: z.string(),
  last: z.string(),
  name: z.string(),
  owner: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  "@context": activityStreamsContextSchema,
});

export const pageSchema = z.object({
  id: z.string(),
  type: z.string(),
  partOf: z.string(),
  orderedItems: z.array(editionSchema),
  next: z.string().optional(),
  prev: z.string().optional(),
  "@context": activityStreamsContextSchema,
});
