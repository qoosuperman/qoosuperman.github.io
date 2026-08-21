import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    pattern: '*.md',
    // read Hexo's post folder in place, so `hexo generate` keeps working
    // during the transition and no post has to be moved or duplicated
    base: '../source/_posts',
    // slug = filename minus .md, which is what Hexo used — keeps the
    // existing /article/<slug>/ URLs alive
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z
    .object({
      title: z.string(),
      date: z.coerce.date(),
      updateDate: z.coerce.date().optional(),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      'header-img': z.string().optional(),
      og_image: z.string().optional(),
      catalog: z.boolean().optional(),
      toc_nav_num: z.boolean().optional(),
      top: z.union([z.number(), z.boolean()]).optional(),
    })
    .transform(({ 'header-img': headerImg, ...rest }) => ({
      ...rest,
      headerImg,
    })),
});

export const collections = { posts };
