// astro.config.mjs
// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

const isDrafts = process.env.INCLUDE_DRAFTS === 'true';
const siteUrl = isDrafts ? 'https://drafts.msfjarvis.dev' : 'https://msfjarvis.dev';

export default defineConfig({
  site: siteUrl,
  output: 'server',
  integrations: [mdx(), sitemap()],
  adapter: cloudflare({
    imageService: 'compile',
  }),
  vite: {
    server: {
      watch: {
        ignored: ['**/.direnv/**', '**/node_modules/**'],
      },
    },
  },
});