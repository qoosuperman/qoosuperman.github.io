import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');
  return rss({
    title: 'Anthony Chao',
    description: "Anthony's Blog, about Ruby / Rails / Devops",
    site: context.site!,
    items: posts
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description ?? post.data.subtitle ?? '',
        link: `/article/${post.id}/`,
      })),
  });
}
