# Webmentions integration

The Webmentions integration is split into two, incoming and outgoing. The SoT for both lives in a separate service, this repo only contains the code to submit outgoing URLs when running `astro build` and a small API shim to parse received Webmentions and present it as an API.

## Build-time environment variables

- `WEBMENTION_WORKER_ORIGIN`
- `WEBMENTION_AUTH_TOKEN`

For local builds, export them before running `npm run build`.
For hosted deploys, configure them in the provider's build environment/secrets settings.

`wrangler.jsonc`'s `vars` configure Worker runtime bindings and are not available to the Astro build hook that sends Webmentions, hence are not the place to configure these.
