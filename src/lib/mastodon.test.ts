import assert from "node:assert/strict";
import test from "node:test";

import { fetchMastodonStatus } from "./mastodon.ts";

const statusUrl = "https://infosec.exchange/@0xabad1dea/116900098449254586";

test("normalizes HTTP status URLs before fetching", async () => {
  let requestedUrl = "";
  const status = await fetchMastodonStatus({
    url: `http://${statusUrl.slice("https://".length)}`,
    fetchImpl: async (input) => {
      requestedUrl = String(input);
      return validStatus();
    },
  });

  assert.equal(status.canonicalUrl, statusUrl);
  assert.equal(requestedUrl, "https://infosec.exchange/api/v1/statuses/116900098449254586");
});

test("ignores query strings and fragments on status URLs", async () => {
  let requestedUrl = "";
  const status = await fetchMastodonStatus({
    url: `${statusUrl}?utm_source=site#post`,
    fetchImpl: async (input) => {
      requestedUrl = String(input);
      return validStatus();
    },
  });

  assert.equal(status.canonicalUrl, statusUrl);
  assert.equal(requestedUrl, "https://infosec.exchange/api/v1/statuses/116900098449254586");
});

test("blocks redirects with a Cloudflare-compatible fetch policy", async () => {
  let requestedInit: RequestInit | undefined;
  await fetchMastodonStatus({
    url: statusUrl,
    fetchImpl: async (_, init) => {
      requestedInit = init;
      return validStatus();
    },
  });

  assert.equal(requestedInit?.redirect, "manual");
  await assert.rejects(
    fetchMastodonStatus({
      url: statusUrl,
      fetchImpl: async () => new Response(null, { status: 302 }),
    }),
    /302/,
  );
});

test("rejects unsupported status URLs", async () => {
  await assert.rejects(
    fetchMastodonStatus({
      url: "https://infosec.exchange/@0xabad1dea/not-a-status-id",
      fetchImpl: async () => validStatus(),
    }),
    /Invalid Mastodon status URL/,
  );
});

test("keeps local account attribution fully qualified", async () => {
  const status = await fetchMastodonStatus({
    url: statusUrl,
    fetchImpl: async () => validStatus({ account: { display_name: "Ada", acct: "ada" } }),
  });

  assert.equal(status.author.account, "@ada@infosec.exchange");
});

test("normalizes status content and usable attachments", async () => {
  const status = await fetchMastodonStatus({
    url: statusUrl,
    fetchImpl: async () =>
      validStatus({
        content: "<p>Hello <strong>world</strong><br>again</p><p>Next</p>",
        media_attachments: [
          {
            type: "image",
            url: "https://cdn.example/image.png",
            description: "An image",
          },
          { type: "video", url: "https://cdn.example/video.mp4", description: "A video" },
        ],
      }),
  });

  assert.deepEqual(status.paragraphs, ["Hello world\nagain", "Next"]);
  assert.deepEqual(status.images, [{ url: "https://cdn.example/image.png", alt: "An image" }]);
  assert.deepEqual(status.attachments, [
    { url: "https://cdn.example/video.mp4", label: "A video" },
  ]);
});

test("uses the requested URL instead of validating the API URL", async () => {
  const status = await fetchMastodonStatus({
    url: statusUrl,
    fetchImpl: async () => validStatus({ url: "not a URL" }),
  });

  assert.equal(status.canonicalUrl, statusUrl);
});

test("omits invalid media and uses safe fallbacks for usable attachments", async () => {
  const status = await fetchMastodonStatus({
    url: statusUrl,
    fetchImpl: async () =>
      validStatus({
        media_attachments: [
          { type: "image", url: "javascript:alert(1)" },
          { type: "image", url: "https://cdn.example/image.png", description: 42 },
          { type: "video", url: "data:video/mp4;base64,AA==" },
          { type: "unknown", url: "https://cdn.example/file.bin", description: 42 },
        ],
      }),
  });

  assert.deepEqual(status.images, [
    { url: "https://cdn.example/image.png", alt: "https://cdn.example/image.png" },
  ]);
  assert.deepEqual(status.attachments, [
    { url: "https://cdn.example/file.bin", label: "https://cdn.example/file.bin" },
  ]);
});

test("accepts any parseable timestamp", async () => {
  const status = await fetchMastodonStatus({
    url: statusUrl,
    fetchImpl: async () => validStatus({ created_at: "2026-07-11 12:00:00Z" }),
  });

  assert.equal(status.createdAt, "2026-07-11T12:00:00.000Z");
});

test("rejects an unusable timestamp", async () => {
  await assert.rejects(
    fetchMastodonStatus({
      url: statusUrl,
      fetchImpl: async () => validStatus({ created_at: "not a date" }),
    }),
    /created_at/,
  );
});

test("wraps fetch rejection with the request context and original cause", async () => {
  const cause = new Error("offline");
  await assert.rejects(
    fetchMastodonStatus({
      url: statusUrl,
      fetchImpl: async () => {
        throw cause;
      },
    }),
    (error: unknown) =>
      error instanceof Error &&
      /Mastodon status request failed/.test(error.message) &&
      error.cause === cause,
  );
});

test("throws on HTTP, invalid JSON, and malformed status payloads", async () => {
  await assert.rejects(
    fetchMastodonStatus({
      url: statusUrl,
      fetchImpl: async () => new Response("gone", { status: 404 }),
    }),
    /404/,
  );
  await assert.rejects(
    fetchMastodonStatus({ url: statusUrl, fetchImpl: async () => new Response("not json") }),
    /JSON/i,
  );
  await assert.rejects(
    fetchMastodonStatus({ url: statusUrl, fetchImpl: async () => new Response("{}") }),
    /content/,
  );
});

const validStatus = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      url: statusUrl,
      content: "<p>ok</p>",
      created_at: "2026-07-11T12:00:00.000Z",
      account: { display_name: "Ada", acct: "ada@infosec.exchange" },
      media_attachments: [],
      ...overrides,
    }),
  );
