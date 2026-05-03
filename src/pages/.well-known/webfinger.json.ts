import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const resourceParam = url.searchParams.get("resource");

  if (resourceParam === null) {
    return new Response(
      JSON.stringify({
        error: "No 'resource' query parameter was provided",
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } else if (resourceParam !== "acct:harsh@msfjarvis.dev") {
    return new Response(
      JSON.stringify({
        error: "An invalid identity was requested",
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(
    JSON.stringify({
      subject: "acct:msfjarvis@androiddev.social",
      aliases: [
        "https://androiddev.social/@msfjarvis",
        "https://androiddev.social/users/msfjarvis",
      ],
      links: [
        {
          rel: "http://webfinger.net/rel/profile-page",
          type: "text/html",
          href: "https://androiddev.social/@msfjarvis",
        },
        {
          rel: "self",
          type: "application/activity+json",
          href: "https://androiddev.social/users/msfjarvis",
        },
        {
          rel: "http://ostatus.org/schema/1.0/subscribe",
          template: "https://androiddev.social/authorize_interaction?uri={uri}",
        },
      ],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
