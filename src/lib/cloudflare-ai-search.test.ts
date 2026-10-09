import {
  type SearchSourceDocument,
  changedAiSearchDocuments,
  prepareAiSearchDocuments,
  readAiSearchConfig,
  reconcileAiSearchDocuments,
  uploadAiSearchDocument,
} from "./cloudflare-ai-search.ts";
import assert from "node:assert/strict";
import test from "node:test";

const SITE = "https://msfjarvis.dev";
const document = (
  relativePath: string,
  source: string,
  collection: SearchSourceDocument["collection"] = "posts",
): SearchSourceDocument => ({ collection, relativePath, source });
const config = {
  accountId: "account",
  namespace: "namespace",
  instanceId: "instance",
  apiToken: "secret",
};

test("prepares canonical URL filenames and indexing metadata", () => {
  const prepared = prepareAiSearchDocuments(
    [
      document("a-post/index.md", "---\ntitle: A\nsummary: Desc\n---\nBody"),
      document(
        "hello/index.mdx",
        "---\nbookTitle: Book title\n---\nBook body",
        "books",
      ),
    ],
    false,
    SITE,
  );

  assert.deepEqual(
    prepared.map(({ filename }) => filename),
    [
      "https://msfjarvis.dev/posts/a-post/",
      "https://msfjarvis.dev/reading/hello/",
    ],
  );
  assert.deepEqual(
    {
      title: prepared[0]?.metadata.title,
      description: prepared[0]?.metadata.description,
      site: prepared[0]?.metadata.site,
      collection: prepared[0]?.metadata.collection,
    },
    {
      title: "A",
      description: "Desc",
      site: "msfjarvis.dev",
      collection: "posts",
    },
  );
  assert.match(prepared[0]?.metadata.sourceHash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(prepared[1]?.metadata.title, "Book title");
});

test("uploads only added or changed documents based on indexed source hashes", () => {
  const prepared = prepareAiSearchDocuments(
    [
      document("same/index.md", "Unchanged"),
      document("changed/index.md", "Updated"),
      document("new/index.md", "New"),
    ],
    false,
    SITE,
  );
  const [same, changed, added] = prepared;
  assert.ok(same && changed && added);

  const selected = changedAiSearchDocuments(
    prepared,
    [
      {
        key: same.filename,
        metadata: JSON.stringify({
          site: "msfjarvis.dev",
          sourceHash: same.metadata.sourceHash,
        }),
      },
      {
        key: changed.filename,
        metadata: { site: "msfjarvis.dev", sourceHash: "old-hash" },
      },
    ],
    SITE,
  );

  assert.deepEqual(
    selected.map(({ filename }) => filename),
    [changed.filename, added.filename],
  );
});

test("excludes drafts unless enabled and always excludes deleted documents", () => {
  const documents = [
    document("published/index.md", "title: Published"),
    document("draft/index.md", "---\ndraft: true\n---\nDraft"),
    document("removed/index.mdx", "---\ndeleted: true\n---\nRemoved"),
  ];

  assert.deepEqual(
    prepareAiSearchDocuments(documents, false, SITE).map(
      ({ filename }) => filename,
    ),
    ["https://msfjarvis.dev/posts/published/"],
  );
  assert.deepEqual(
    prepareAiSearchDocuments(documents, true, SITE).map(
      ({ filename }) => filename,
    ),
    [
      "https://msfjarvis.dev/posts/published/",
      "https://msfjarvis.dev/posts/draft/",
    ],
  );
});

test("rejects canonical URLs longer than Cloudflare's filename limit", () => {
  assert.throws(
    () =>
      prepareAiSearchDocuments(
        [document(`${"x".repeat(120)}.md`, "Body")],
        false,
        SITE,
      ),
    /exceeds 128 characters/,
  );
});

test("accepts fully absent configuration but rejects partial configuration", () => {
  assert.equal(readAiSearchConfig({}), undefined);
  assert.throws(
    () => readAiSearchConfig({ CLOUDFLARE_ACCOUNT_ID: "account" }),
    /configuration is incomplete/,
  );
});

test("uploads Markdown with canonical filename, metadata, and bearer token", async () => {
  let request: Request | undefined;
  const [prepared] = prepareAiSearchDocuments(
    [document("hello/index.mdx", "---\ntitle: Hello\n---\nBody")],
    false,
    SITE,
  );
  assert.ok(prepared);

  await uploadAiSearchDocument(config, prepared, async (input, init) => {
    request = new Request(input, init);
    return Response.json({ success: true }, { status: 200 });
  });

  assert.equal(request?.headers.get("authorization"), "Bearer secret");
  const form = await request?.formData();
  const file = form?.get("file") as File;
  assert.equal(file.name, "https://msfjarvis.dev/posts/hello/");
  assert.equal(file.type, "text/markdown");
  assert.match(await file.text(), /title: Hello/);
  assert.deepEqual(
    JSON.parse(String(form?.get("metadata"))),
    prepared.metadata,
  );
});

test("fails when Cloudflare rejects an upload, including HTTP-success API errors", async () => {
  const [prepared] = prepareAiSearchDocuments(
    [document("hello/index.md", "Body")],
    false,
    SITE,
  );
  assert.ok(prepared);
  await assert.rejects(
    uploadAiSearchDocument(config, prepared, async () =>
      Response.json(
        { success: false, errors: ["invalid token"] },
        { status: 401 },
      ),
    ),
    /invalid token/,
  );
  await assert.rejects(
    uploadAiSearchDocument(config, prepared, async () =>
      Response.json({ success: false, errors: ["index unavailable"] }),
    ),
    /index unavailable/,
  );
});

test("paginates built-in items and deletes only stale managed URLs", async () => {
  const [desired] = prepareAiSearchDocuments(
    [document("current/index.md", "Body")],
    false,
    SITE,
  );
  assert.ok(desired);
  const requests: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url);
    if (init?.method === "DELETE") return Response.json({ success: true });
    const page = Number(url.searchParams.get("page"));
    const items =
      page === 1
        ? Array.from({ length: 50 }, (_, i) => ({
            id: `id-${i}`,
            key: `other-${i}`,
            metadata: {},
          }))
        : [
            {
              id: "stale",
              key: "https://msfjarvis.dev/posts/old/",
              metadata: { site: "msfjarvis.dev" },
            },
            { id: "legacy", key: "posts-old.md", metadata: {} },
            {
              id: "foreign-legacy",
              key: "posts-foreign.md",
              metadata: { site: "elsewhere.test" },
            },
            {
              id: "other-site",
              key: "https://elsewhere.test/posts/old/",
              metadata: { site: "elsewhere.test" },
            },
            { id: "unrelated", key: "misc-item", metadata: {} },
            {
              id: "current",
              key: desired.filename,
              metadata: { site: "msfjarvis.dev" },
            },
          ];
    return Response.json({
      success: true,
      result: items,
      result_info: { page, per_page: 50, total_count: 56 },
    });
  };

  await reconcileAiSearchDocuments(config, [desired], SITE, fetcher);
  assert.deepEqual(
    requests.slice(0, 2).map((url) => url.searchParams.get("page")),
    ["1", "2"],
  );
  assert.ok(
    requests
      .slice(0, 2)
      .every((url) => url.searchParams.get("source") === "builtin"),
  );
  assert.deepEqual(
    requests
      .filter(
        (url) =>
          url.pathname.endsWith("/stale") || url.pathname.endsWith("/legacy"),
      )
      .map((url) => url.pathname.split("/").at(-1)),
    ["stale", "legacy"],
  );
  assert.equal(
    requests.filter(
      (url) =>
        url.pathname.endsWith("/other-site") ||
        url.pathname.endsWith("/unrelated") ||
        url.pathname.endsWith("/foreign-legacy"),
    ).length,
    0,
  );
});

test("fails reconciliation on list and delete API errors", async () => {
  await assert.rejects(
    reconcileAiSearchDocuments(config, [], SITE, async () =>
      Response.json({ success: false, errors: ["list failed"] }),
    ),
    /list failed/,
  );
  await assert.rejects(
    reconcileAiSearchDocuments(config, [], SITE, async (input, init) => {
      if (init?.method === "DELETE")
        return Response.json({ success: false, errors: ["delete failed"] });
      return Response.json({
        success: true,
        result: [{ id: "old", key: "posts-old.md", metadata: {} }],
        result_info: { page: 1, per_page: 50, total_count: 1 },
      });
    }),
    /delete failed/,
  );
});
