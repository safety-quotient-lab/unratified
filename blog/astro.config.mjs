// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blog.unratified.org',
  integrations: [mdx(), svelte(), sitemap({
    serialize(item) {
      item.lastmod = new Date().toISOString();
      return item;
    },
  })],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  vite: {
    resolve: {
      alias: {
        '@main': new URL('../src', import.meta.url).pathname,
      },
    },
  },
});
