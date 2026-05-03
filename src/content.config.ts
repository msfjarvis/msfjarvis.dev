import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  lastmod: z.coerce.date().optional(),
  slug: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  aliases: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
  deleted: z.boolean().optional().default(false),
});

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/index.{md,mdx}' }),
  schema: postSchema,
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/index.{md,mdx}' }),
  schema: postSchema,
});

const weeknotes = defineCollection({
  loader: glob({ base: './src/content/weeknotes', pattern: '**/index.{md,mdx}' }),
  schema: postSchema,
});

export const collections = { posts, notes, weeknotes };
