import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const covenant = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/covenant' }),
  schema: z.object({
    title: z.string(),
    articleNumber: z.number(),
    rightName: z.string(),
    summary: z.string(),
    aiConnection: z.string(),
    legalText: z.string(),
    pivotal: z.boolean().default(false),
    order: z.number(),
  }),
});

const gap = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/gap' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
});

const connection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/connection' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    relatedArticles: z.array(z.number()).default([]),
    order: z.number(),
  }),
});

const evidence = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/evidence' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
});

const action = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/action' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
});

export const collections = { covenant, gap, connection, evidence, action };
