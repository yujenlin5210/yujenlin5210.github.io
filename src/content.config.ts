import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { normalizeOptionalDateInput } from './utils/content';

const dateField = z
  .union([z.string(), z.date()])
  .optional()
  .transform((value, ctx) => {
    try {
      return normalizeOptionalDateInput(value, 'frontmatter date');
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'Invalid frontmatter date.',
      });
      return z.NEVER;
    }
  });

const linkField = z.object({
  text: z.string(),
  url: z.string(),
});

const optionalStringField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => value ?? undefined);

const descriptionField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => value ?? '');

const baseSchema = z.object({
  title: z.string().optional().default('Untitled'),
  date: dateField,
  description: descriptionField,
  cover: optionalStringField,
  folder: optionalStringField,
  organization: optionalStringField,
  role: optionalStringField,
  layout: optionalStringField,
  categories: optionalStringField,
  slogan: optionalStringField,
  'landing-slogan': optionalStringField,
  'title-cover': optionalStringField,
  tags: z.array(z.string()).optional().default([]),
  links: z.array(linkField).optional().default([]),
  permalink: optionalStringField,
  author: optionalStringField,
  mathjax: z.boolean().optional().default(false),
  animation: optionalStringField,
  hidden: z.boolean().optional().default(false),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: baseSchema
});

const lab = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/lab" }),
  schema: baseSchema.extend({
    hideCover: z.boolean().optional().default(false),
  })
});

export const collections = { projects, lab };
