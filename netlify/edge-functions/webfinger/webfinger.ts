import { Status } from "https://deno.land/std@0.136.0/http/http_status.ts";
import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const re = /acct:(.*)@msfjarvis.dev/;
  const url = new URL(request.url);
  const resourceParam = url.searchParams.get("resource");
  if (resourceParam === null) {
    return context.json(
      {
        error: "No 'resource' query parameter was provided",
      },
      {
        status: Status.BadRequest,
      }
    );
  } else if (resourceParam.match(re) === null) {
    return context.json(
      {
        error: "This domain only works for @msfjarvis.dev requests",
      },
      {
        status: Status.BadRequest,
      }
    );
  } else {
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
          template: "https://androiddev.social/authorize_interaction?uri={uri}",
        },
      ],
    });
  }
};
