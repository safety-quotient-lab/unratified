import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.publishedDate).getTime() -
      new Date(a.data.publishedDate).getTime()
  );

  return rss({
    title: 'Unratified Blog',
    description:
      'Analysis, updates, and community contributions on ICESCR ratification and AI economics.',
    site: context.site!.toString(),
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: new Date(post.data.publishedDate),
      link: `/${post.id}/`,
      author: `${post.data.author.human.name}, with ${post.data.author.agent.name}`,
      categories: post.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
