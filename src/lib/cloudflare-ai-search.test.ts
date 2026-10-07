import {
  type SearchSourceDocument,
  prepareAiSearchDocuments,
  readAiSearchConfig,
  uploadAiSearchDocument,
} from "./cloudflare-ai-search.ts";
import assert from "node:assert/strict";
import test from "node:test";

const document = (
  relativePath: string,
  source: string,
  collection: SearchSourceDocument["collection"] = "posts",
): SearchSourceDocument => ({ collection, relativePath, source });

test("prepares stable collection-prefixed filenames for Markdown and MDX", () => {
  const prepared = prepareAiSearchDocuments(
    [
      document("a-post/index.md", "---\ntitle: A\n---\nBody"),
      document("book/index.mdx", "Book body", "books"),
    ],
    false,
  );

  assert.deepEqual(
    prepared.map(({ filename }) => filename),
    ["posts-a-post.md", "books-book.mdx"],
  );
});

test("excludes drafts unless enabled and always excludes deleted documents", () => {
  const documents = [
    document("published/index.md", "title: Published"),
    document("draft/index.md", "---\ndraft: true\n---\nDraft"),
    document("removed/index.mdx", "---\ndeleted: true\n---\nRemoved"),
  ];

  assert.deepEqual(
    prepareAiSearchDocuments(documents, false).map(({ filename }) => filename),
    ["posts-published.md"],
  );
  assert.deepEqual(
    prepareAiSearchDocuments(documents, true).map(({ filename }) => filename),
    ["posts-published.md", "posts-draft.md"],
  );
});

test("accepts fully absent configuration but rejects partial configuration", () => {
  assert.equal(readAiSearchConfig({}), undefined);
  assert.throws(
    () => readAiSearchConfig({ CLOUDFLARE_ACCOUNT_ID: "account" }),
    /configuration is incomplete/,
  );
});

test("uploads the source as multipart with a bearer token and stable filename", async () => {
  let request: Request | undefined;
  const config = {
    accountId: "account",
    namespace: "namespace",
    instanceId: "instance",
    apiToken: "secret",
  };
  const [prepared] = prepareAiSearchDocuments(
    [document("hello/index.mdx", "---\ntitle: Hello\n---\nBody")],
    false,
  );

  await uploadAiSearchDocument(config, prepared, async (input, init) => {
    request = new Request(input, init);
    return Response.json({ success: true }, { status: 200 });
  });

  assert.equal(
    request?.url,
    "https://api.cloudflare.com/client/v4/accounts/account/ai-search/namespaces/namespace/instances/instance/items",
  );
  assert.equal(request?.headers.get("authorization"), "Bearer secret");
  const form = await request?.formData();
  assert.equal((form?.get("file") as File).name, "posts-hello.mdx");
  assert.match(await (form?.get("file") as File).text(), /title: Hello/);
});

test("fails when Cloudflare rejects an upload", async () => {
  const [prepared] = prepareAiSearchDocuments(
    [document("hello/index.md", "Body")],
    false,
  );
  await assert.rejects(
    uploadAiSearchDocument(
      {
        accountId: "account",
        namespace: "namespace",
        instanceId: "instance",
        apiToken: "secret",
      },
      prepared,
      async () =>
        Response.json(
          { success: false, errors: ["invalid token"] },
          { status: 401 },
        ),
    ),
    /upload failed for posts-hello.md: \["invalid token"\]/,
  );
});

test("fails when Cloudflare reports a failed upload with a successful HTTP status", async () => {
  const [prepared] = prepareAiSearchDocuments(
    [document("hello/index.md", "Body")],
    false,
  );
  await assert.rejects(
    uploadAiSearchDocument(
      {
        accountId: "account",
        namespace: "namespace",
        instanceId: "instance",
        apiToken: "secret",
      },
      prepared,
      async () =>
        Response.json({ success: false, errors: ["index unavailable"] }),
    ),
    /index unavailable/,
  );
});
