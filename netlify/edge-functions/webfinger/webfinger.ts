import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  context.log(request.url);
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
};
