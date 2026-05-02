// astro.config.mjs
// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://msfjarvis.dev',
  integrations: [mdx(), sitemap()],
  adapter: cloudflare({
    imageService: 'compile',
  }),
});