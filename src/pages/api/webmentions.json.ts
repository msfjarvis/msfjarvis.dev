import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("target");
  if (!target) {
    return new Response(JSON.stringify({ error: "Missing target parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(
      `https://webmentions-server.tiger-shark.workers.dev/webmentions?target=${encodeURIComponent(target)}`,
    );
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Webmention API error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch webmentions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
