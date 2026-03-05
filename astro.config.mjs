import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

/** @type {import('unified').PluggableList} */
const rehypePlugins = [
  rehypeSlug,
  [rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: { className: ['heading-anchor'], ariaLabel: 'Link to this section' },
    content: { type: 'text', value: '#' },
  }],
];

// https://astro.build/config
export default defineConfig({
  site: 'https://unratified.org',
  integrations: [
    mdx({ rehypePlugins }),
    svelte(),
    sitemap({
      serialize(item) {
        item.lastmod = new Date().toISOString();
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
    rehypePlugins,
  },
});