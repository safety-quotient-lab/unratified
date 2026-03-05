// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://unratified.org',
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
});