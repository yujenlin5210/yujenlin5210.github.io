import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string().optional().default("Untitled"),
    date: z.any().optional(),
    description: z.any().optional().transform(val => typeof val === 'string' ? val : (val ? JSON.stringify(val) : '')),
    cover: z.string().optional(),
    folder: z.string().optional(),
    organization: z.string().optional(),
    role: z.string().optional(),
    layout: z.string().optional(),
    category: z.any().optional(),
    tags: z.any().optional(),
    permalink: z.string().optional(),
    author: z.string().optional(),
    mathjax: z.boolean().optional(),
  })
});

const lab = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/lab" }),
  schema: z.object({
    title: z.string().optional().default("Untitled"),
    date: z.any().optional(),
    description: z.any().optional().transform(val => typeof val === 'string' ? val : (val ? JSON.stringify(val) : '')),
    cover: z.string().optional(),
    folder: z.string().optional(),
    organization: z.string().optional(),
    role: z.string().optional(),
    layout: z.string().optional(),
    category: z.any().optional(),
    tags: z.any().optional(),
    permalink: z.string().optional(),
    author: z.string().optional(),
    mathjax: z.boolean().optional(),
  })
});

export const collections = { projects, lab };
