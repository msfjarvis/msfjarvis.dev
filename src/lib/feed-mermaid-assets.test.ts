import { externalizeFeedMermaidSvgs } from "./feed-mermaid-assets.ts";
import { addMermaidSvgNamespace, concretizeMermaidSvgForFeeds } from "./feed-mermaid.ts";
import { Resvg } from "@resvg/resvg-js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect fill="var(--pele-bg)" stroke="var(--pele-accent)" width="100" height="40"/></svg>';
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const publicSiteUrl = "https://msfjarvis.dev";

test("normalizes Mermaid namespaces to exactly one SVG namespace", () => {
  const normalized = addMermaidSvgNamespace(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg"><g/></svg>',
  );
  assert.equal(
    (normalized.match(/\sxmlns=/g) ?? []).length,
    1,
    "the SVG root must contain one default namespace declaration",
  );
  assert.doesNotThrow(() => new Resvg(normalized).render());
});

test("externalizes parsed SVGs with a background and absolute public URLs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "feed-mermaid-assets-"));
  const clientDir = path.join(root, "client");
  const publicDir = path.join(root, "public");
  const unrelatedAsset = path.join(publicDir, "diagrams", "keep.svg");
  try {
    await mkdir(path.join(clientDir, "tags", "topic"), { recursive: true });
    await mkdir(path.dirname(unrelatedAsset), { recursive: true });
    await writeFile(unrelatedAsset, "pre-existing asset");
    await writeFile(path.join(clientDir, "rss.xml"), `<img src="${dataUrl}"/>`);
    await writeFile(path.join(clientDir, "tags", "topic", "atom.xml"), `<img src="${dataUrl}"/>`);
    await writeFile(
      path.join(clientDir, "tags", "topic", "feed.json"),
      JSON.stringify({ content_html: `<img src="${dataUrl}"/>` }),
    );

    const count = await externalizeFeedMermaidSvgs(clientDir, publicDir, publicSiteUrl);
    assert.equal(count, 1, "identical SVGs should share one content-addressed file");

    const expectedSvg = concretizeMermaidSvgForFeeds(svg, "dark");
    const hash = createHash("sha256").update(expectedSvg).digest("hex");
    const fileName = `${hash}.svg`;
    const asset = await readFile(path.join(clientDir, "diagrams", fileName), "utf8");
    assert.equal(asset, expectedSvg);
    assert.equal(
      (asset.match(/\sxmlns=/g) ?? []).length,
      1,
      "the generated SVG must contain exactly one namespace declaration",
    );
    assert.match(asset, /<rect width="100%" height="100%" fill="#1a1a1a"\/>/);
    assert.match(asset, /stroke="#c084b8"/);
    assert.doesNotThrow(() => new Resvg(asset).render(), "output must parse as SVG");
    assert.equal(
      await readFile(path.join(publicDir, "diagrams", fileName), "utf8"),
      asset,
      "the same asset must be written to public and the built client directory",
    );

    for (const feedPath of [
      path.join(clientDir, "rss.xml"),
      path.join(clientDir, "tags", "topic", "atom.xml"),
      path.join(clientDir, "tags", "topic", "feed.json"),
    ]) {
      const feed = await readFile(feedPath, "utf8");
      assert.ok(feed.includes(`${publicSiteUrl}/diagrams/${fileName}`));
      assert.doesNotMatch(feed, /data:image\/svg\+xml;base64/);
      assert.doesNotMatch(feed, /src=\\?"\/diagrams\//);
    }

    assert.equal(await readFile(unrelatedAsset, "utf8"), "pre-existing asset");
    assert.equal(await externalizeFeedMermaidSvgs(clientDir, publicDir, publicSiteUrl), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uses the configured draft origin for draft feed URLs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "feed-mermaid-drafts-"));
  const draftSiteUrl = "https://drafts.msfjarvis.dev";
  try {
    await writeFile(
      path.join(root, "feed.json"),
      JSON.stringify({ content_html: `<img src="${dataUrl}"/>` }),
    );
    await externalizeFeedMermaidSvgs(root, path.join(root, "public"), draftSiteUrl);

    const feed = await readFile(path.join(root, "feed.json"), "utf8");
    assert.ok(feed.includes(`${draftSiteUrl}/diagrams/`));
    assert.ok(!feed.includes(`${publicSiteUrl}/diagrams/`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
