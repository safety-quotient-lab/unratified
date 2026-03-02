// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  site: 'https://unratified.org',
  integrations: [mdx(), svelte()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});