import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Per-lens framing strings rendered as intro panels above page body content. */
const lensFramingSchema = z.object({
  voter:      z.string().optional(),
  politician: z.string().optional(),
  developer:  z.string().optional(),
  educator:   z.string().optional(),
  researcher: z.string().optional(),
}).optional();

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
    lensFraming: lensFramingSchema,
  }),
});

const connection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/connection' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    relatedArticles: z.array(z.number()).default([]),
    order: z.number(),
    lensFraming: lensFramingSchema,
  }),
});

const evidence = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/evidence' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    lensFraming: lensFramingSchema,
  }),
});

const action = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/action' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    lensFraming: lensFramingSchema,
  }),
});

export const collections = { covenant, gap, connection, evidence, action };
