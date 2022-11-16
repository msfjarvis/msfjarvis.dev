import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const resourceParam = url.searchParams.get("resource");
  context.log(`resourceParam=${resourceParam}`);
  if (resourceParam === null) {
    return context.json({
      error: "No 'resource' query parameter was provided",
    });
  } else {
    const re = /acct:(.*)@msfjarvis.dev/;
    if (resourceParam.match(re) !== null) {
      return context.json({
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
            template:
              "https://androiddev.social/authorize_interaction?uri={uri}",
          },
        ],
      });
    } else {
      return context.json({
        error: "This domain only works for @msfjarvis.dev requests",
      });
    }
  }
};
