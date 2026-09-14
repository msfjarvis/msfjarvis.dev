import {
  collectMastodonUrls,
  extractMastodonUrls,
  refreshMastodonSnapshots,
} from "./refresh-mastodon-snapshots.mjs";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const statusUrl = "https://infosec.exchange/@0xabad1dea/116900098449254586";

test("extracts live direct and expression-wrapped MastodonPost URLs", () => {
  assert.deepEqual(
    extractMastodonUrls(`
      <MastodonPost url="${statusUrl}" />
      <MastodonPost
        url={"${statusUrl}?utm_source=site#post"}
      />
      \`<MastodonPost url="https://example.test/@ada/1" />\`
      \`\`<MastodonPost url="https://example.test/@ada/2" />\`\`
      \`\`\`mdx
      <MastodonPost url="https://example.test/@ada/3" />
      \`\`\`
      {/* <MastodonPost url="https://example.test/@ada/4" /> */}
      <!-- <MastodonPost url="https://example.test/@ada/5" /> -->
    `),
    [statusUrl, `${statusUrl}?utm_source=site#post`],
  );
});

test("rejects MastodonPost URLs that the refresh command cannot snapshot", () => {
  assert.throws(
    () => extractMastodonUrls("<MastodonPost url={postUrl} />"),
    /must provide url as a string literal/,
  );
});

test("writes deterministic snapshots for every MDX and Astro embed", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "mastodon-snapshots-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceDirectory = join(directory, "src");
  const outputPath = join(directory, "mastodon-snapshots.ts");
  const astroStatusUrl =
    "https://infosec.exchange/@0xabad1dea/116946074763792559";
  await mkdir(join(sourceDirectory, "content", "nested"), { recursive: true });
  await writeFile(
    join(sourceDirectory, "content", "nested", "post.mdx"),
    `<MastodonPost url={"http://${statusUrl.slice("https://".length)}"} />`,
  );
  await writeFile(
    join(sourceDirectory, "page.astro"),
    `<MastodonPost url="${astroStatusUrl}" />`,
  );

  assert.deepEqual(await collectMastodonUrls(sourceDirectory), [
    statusUrl,
    astroStatusUrl,
  ]);
  assert.equal(
    await refreshMastodonSnapshots({
      sourceDirectory,
      outputPath,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            content: "<p>Saved post</p>",
            created_at: "2026-07-11T12:00:00.000Z",
            account: { display_name: "Ada", acct: "ada@infosec.exchange" },
            media_attachments: [],
          }),
        ),
    }),
    2,
  );

  const output = await readFile(outputPath, "utf8");
  assert.match(output, /mastodonSnapshots/);
  assert.match(output, /"canonicalUrl": "https:\/\/infosec\.exchange/);
  assert.doesNotMatch(output, /utm_source/);
});
