import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title:       z.string(),
  description: z.string(),
  pubDate:     z.coerce.date(),
  tags:        z.array(z.string()).default([]),
  draft:       z.boolean().default(false),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: postSchema,
});

const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tutorials' }),
  schema: postSchema,
});

export const collections = { blog, tutorials };
