import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lensFramingSchema = z.object({
  voter:      z.string().optional(),
  politician: z.string().optional(),
  developer:  z.string().optional(),
  educator:   z.string().optional(),
  researcher: z.string().optional(),
}).optional();

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.object({
      human: z.object({
        name: z.string(),
        url: z.string().url(),
      }),
      tool: z.object({
        name: z.string(),
        url: z.string().url(),
      }),
      model: z.object({
        name: z.string(),
      }),
      agent: z.object({
        name: z.string(),
        projectUrl: z.string().url(),
      }),
    }),
    tags: z.array(z.string()).default([]),
    lensFraming: lensFramingSchema,
    draft: z.boolean().default(false),
    reviewStatus: z.enum(["reviewed", "unreviewed"]).default("unreviewed"),
    relatedArticles: z.array(z.number()).default([]),
  }),
});

export const collections = { posts };
