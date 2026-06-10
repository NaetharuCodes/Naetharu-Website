import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const basePostSchema = z.object({
  title:       z.string(),
  description: z.string(),
  pubDate:     z.coerce.date(),
  tags:        z.array(z.string()).default([]),
  draft:       z.boolean().default(false),
  videoId:     z.string().optional(),
  pathway:      z.string().optional(),
  pathwayOrder: z.number().optional(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: basePostSchema,
});

const devops = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tutorials/devops' }),
  schema: basePostSchema,
});

const microsoftAzure = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tutorials/microsoft-azure' }),
  schema: basePostSchema,
});

const scriptsAndAutomation = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tutorials/scripts-and-automation' }),
  schema: basePostSchema,
});

const other = defineCollection({
  // keep existing tutorials folder as "other" so current files continue to work
  loader: glob({ pattern: '**/*.md', base: './src/content/tutorials' }),
  schema: basePostSchema,
});

export const collections = {
  blog,
  devops,
  'microsoft-azure': microsoftAzure,
  'scripts-and-automation': scriptsAndAutomation,
  other,
};
