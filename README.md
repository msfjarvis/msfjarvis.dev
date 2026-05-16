# msfjarvis.dev

Source code for my website at [msfjarvis.dev](https://msfjarvis.dev). ~~It's built with [Hugo](https://github.com/gohugoio/hugo), deployed continuously to Netlify.~~ It's no powered by [Astro](https://astro.build), and built by [Cloudflare](https://cloudflare.com).

## Build-time environment variables

The WebMentions integration runs during `astro build`, so it reads configuration from the build environment, not from deployed Worker bindings.

Required variables:

- `WEBMENTION_WORKER_ORIGIN`
- `WEBMENTION_AUTH_TOKEN`

For local builds, export them before running `npm run build`.
For hosted deploys, configure them in the provider's build environment/secrets settings.

`wrangler.jsonc` `vars` configure Worker runtime bindings and are not available to the Astro build hook that sends WebMentions.
