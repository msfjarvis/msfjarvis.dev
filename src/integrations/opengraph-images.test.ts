import {
  extractOpenGraphDetails,
  sanitizeHtml,
} from "./opengraph-images-local.ts";
import { getImagePath, getPageHtmlPath } from "./opengraph-images-paths.ts";
import { getPagePathname } from "./opengraph-images.ts";
import { JSDOM } from "jsdom";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const metadata = (overrides: Record<string, string> = {}) => {
  const values = {
    title: "Title",
    url: "https://example.test/post/",
    type: "article",
    image: "https://example.test/post/index.png",
    description: "Description",
    ...overrides,
  };
  return new JSDOM(
    Object.entries(values)
      .map(
        ([name, content]) =>
          `<meta property="og:${name}" content="${content}">`,
      )
      .join(""),
  ).window.document;
};

test("extracts required Open Graph metadata and a distinct description", () => {
  assert.deepEqual(extractOpenGraphDetails(metadata()), {
    title: "Title",
    url: "https://example.test/post/",
    type: "article",
    image: "https://example.test/post/index.png",
    description: "Description",
  });
});

test("throws with the names of missing and empty required metadata", () => {
  const document = new JSDOM(
    '<meta property="og:title" content=" "><meta property="og:url" content=""><meta property="og:type" content="article">',
  ).window.document;
  assert.throws(
    () => extractOpenGraphDetails(document),
    /og:title, og:url, og:image/,
  );
});

test("omits an empty or title-identical description", () => {
  for (const description of ["", "Title"]) {
    const details = extractOpenGraphDetails(metadata({ description }));
    assert.equal(details.description, undefined);
  }
});

test("maps directory, file, and error page URLs to generated image URLs", () => {
  const site = new URL("https://drafts.example.test/base/");
  assert.equal(
    getImagePath({ url: new URL("https://dev.example.test/posts/foo/"), site })
      .href,
    "https://drafts.example.test/base/posts/foo/index.png",
  );
  assert.equal(
    getImagePath({ url: new URL("https://dev.example.test/about"), site }).href,
    "https://drafts.example.test/base/about.png",
  );
  assert.equal(
    getImagePath({ url: new URL("https://dev.example.test/404/"), site }).href,
    "https://drafts.example.test/base/404.png",
  );
  assert.equal(
    getImagePath({ url: new URL("https://dev.example.test/500/"), site }).href,
    "https://drafts.example.test/base/500.png",
  );
});

test("maps the root and every supported collection directory", () => {
  const site = new URL("https://example.test/");
  for (const pathname of [
    "/",
    "/posts/foo/",
    "/notes/foo/",
    "/weeknotes/foo/",
  ]) {
    assert.equal(
      getImagePath({
        url: new URL(`${pathname}?preview=true#heading`, site),
        site,
      }).href,
      `https://example.test${pathname}index.png`,
    );
  }
});

test("preserves URL encoding and the origin of the supplied draft site", () => {
  const image = getImagePath({
    url: new URL("http://localhost:4321/posts/café/"),
    site: new URL("https://drafts.example.test/"),
  });
  assert.equal(image.origin, "https://drafts.example.test");
  assert.equal(image.pathname, "/posts/caf%C3%A9/index.png");
});

test("maps directory OpenGraph image paths back to page paths", () => {
  assert.equal(getPagePathname("/posts/example/index.png"), "/posts/example/");
  assert.equal(getPagePathname("/notes/example/index.png"), "/notes/example/");
  assert.equal(getPagePathname("/posts/example.png"), undefined);
  assert.equal(getPagePathname("/posts/example/index.webp"), undefined);
});

test("finds directory-index and flat built HTML output", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "og-html-path-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, "posts", "directory"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "posts", "directory", "index.html"),
    "directory",
  );
  await fs.writeFile(path.join(dir, "posts", "flat.html"), "flat");

  assert.equal(
    await getPageHtmlPath({ dir, page: "posts/directory/" }),
    path.join(dir, "posts", "directory", "index.html"),
  );
  assert.equal(
    await getPageHtmlPath({ dir, page: "posts/flat/" }),
    path.join(dir, "posts", "flat.html"),
  );
});

test("finds Unicode output paths and reports missing built HTML", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "og-html-path-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, "posts", "café"), { recursive: true });
  await fs.writeFile(path.join(dir, "posts", "café", "index.html"), "unicode");
  assert.equal(
    await getPageHtmlPath({ dir, page: "posts/caf%C3%A9/" }),
    path.join(dir, "posts", "café", "index.html"),
  );
  await assert.rejects(getPageHtmlPath({ dir, page: "missing/" }), /missing/);
});

test("removes embedded styles and scripts before parsing generated page HTML", () => {
  const html = sanitizeHtml(
    `<head><style>body { color: red }</style><script>run()</script>${metadata().head.innerHTML}</head>`,
  );
  assert.doesNotMatch(html, /<style|<script/i);
  assert.equal(
    extractOpenGraphDetails(new JSDOM(html).window.document).title,
    "Title",
  );
});
