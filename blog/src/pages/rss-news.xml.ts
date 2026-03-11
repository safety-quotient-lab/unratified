import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

// Google News feed — voter guide series only.
// A post appears here when it carries the "voter-guide" tag.
// Add that tag to any post written primarily for a voter/constituent audience.
// Submit https://blog.unratified.org/rss-news.xml to Google News Publisher Center.
export async function GET(context: APIContext) {
  const posts = await getCollection(
    'posts',
    ({ data }) => !data.draft && data.tags.includes('voter-guide'),
  );
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.publishedDate).getTime() -
      new Date(a.data.publishedDate).getTime(),
  );

  return rss({
    title: 'Unratified — Voter Guide',
    description:
      'Policy analysis and civic guides on ICESCR ratification, economic rights, and AI-era labor protections — written for voters and constituents.',
    site: context.site!.toString(),
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: new Date(post.data.publishedDate),
      link: `/${post.id}/`,
      author: [post.data.author.human?.name, post.data.author.tool.name, ...post.data.author.model.map(m => m.name), ...post.data.author.agent.map(a => a.name)].filter(Boolean).join(' · '),
      categories: post.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
