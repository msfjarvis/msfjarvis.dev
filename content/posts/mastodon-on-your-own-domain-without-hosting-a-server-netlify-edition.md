+++
categories = ["fediverse"]
date = 2022-11-16
summary = "A quick and easy way of creating a Fediverse identity on your own domain without an ActivityPub server"
slug = "mastodon-on-your-own-domain-without-hosting-a-server-netlify-edition"
tags = ["mastodon", "fediverse", "webfinger", "netlify"]
title = "Mastodon on your own domain without hosting a server, Netlify edition"
+++

## Preface

I recently came across [a blog post](https://blog.maartenballiauw.be/post/2022/11/05/mastodon-own-donain-without-hosting-server.html) from [Maarten Balliauw](https://mastodon.online/@maartenballiauw) that explained how they had managed to create an ActivityPub compatible identity for themselves, without hosting Mastodon or any other ActivityPub server.

I recommend going to their blog and reading the whole thing, but here's a TL;DR

- [ActivityPub](https://activitypub.rocks/) has the notion of an "actor" that sends messages
- This "actor" must be discoverable via a protocol called [WebFinger](https://webfinger.net)
- WebFinger is ridiculously easy to implement

For all practical purposes, WebFinger is essentially a JSON document that is served at `/.well-known/webfinger` from a domain and is used to identify "actors" across the Fediverse.

Maarten's approach to implementing this was to simply place the JSON document at `/.well-known/webfinger` on their domain `balliauw.be`, which allowed `@maarten@balliauw.be` to become a WebFinger-compatible identity that can be searched for on Mastodon and will return their actual `@maartenballiauw.be@mastodon.online` profile.

Maarten did however note that since they're relying on static hosting, they're unable to restrict what identities they can enforce as valid, and thus a search for `@anything@balliauw.be` will also return their `mastodon.online` identity.

## The implementation

I wanted to also set up something like this, but without the limitation Maarten had run into. Since my website runs on Netlify, I decided to try out using an [Edge Function](https://docs.netlify.com/edge-functions/overview/) to build this up.

Similar to Maarten, I first obtained my current Fediverse identity from the Mastodon server I am on: [androiddev.social](https://androiddev.social) (incredible props to [Mikhail](https://androiddev.social/@friendlymike) for making it a reality).

```json
➜ curl -s https://androiddev.social/.well-known/webfinger?resource=acct:msfjarvis@androiddev.social | jq .
{
  "subject": "acct:msfjarvis@androiddev.social",
  "aliases": [
    "https://androiddev.social/@msfjarvis",
    "https://androiddev.social/users/msfjarvis"
  ],
  "links": [
    {
      "rel": "http://webfinger.net/rel/profile-page",
      "type": "text/html",
      "href": "https://androiddev.social/@msfjarvis"
    },
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://androiddev.social/users/msfjarvis"
    },
    {
      "rel": "http://ostatus.org/schema/1.0/subscribe",
      "template": "https://androiddev.social/authorize_interaction?uri={uri}"
    }
  ]
}
```

With this in hand, now we can get started on wiring this up into our website.

First, create an Edge Function using the Netlify CLI. Here's the options I chose.

```
➜ yarn exec ntl functions:create --name webfinger1
? Select the type of function you'd like to create: Edge function (Deno)
? Select the language of your function: TypeScript
? Pick a template: typescript-json
? Name your function: webfinger
◈ Creating function webfinger
◈ Created netlify/edge-functions/webfinger/webfinger.ts
? What route do you want your edge function to be invoked on?: /.well-known/webfinger
◈ Function 'webfinger' registered for route `/.well-known/webfinger`. To change, edit your `netlify.toml` file.
```

Next, add the following code to the TypeScript file just created for you. I've added comments inline to explain what each part of the code does so you can customize it according to your needs.

```typescript
// Netlify Edge Functions run on Deno (https://deno.land), so imports use URLs rather than package names.
import { Status } from "https://deno.land/std@0.136.0/http/http_status.ts";
import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  // We obtain the value of the 'resource' query parameter so that we
  // can ensure a response is only sent for the identity we want.
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
    // I want to be searchable as `@harsh@msfjarvis.dev`, so I only
    // allow requests that set the resource query param to this value.
  } else if (resourceParam !== "acct:harsh@msfjarvis.dev") {
    return context.json(
      {
        error: "An invalid identity was requested",
      },
      {
        status: Status.BadRequest,
      }
    );
  } else {
    // Here's the JSON object we got earlier
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
```
And that's it! You can test it out as below to verify things work as expected.

```json
➜ curl -s https://msfjarvis.dev/.well-known/webfinger | jq .
{
  "error": "No 'resource' query parameter was provided"
}

➜ curl -s https://msfjarvis.dev/.well-known/webfinger?resource=acct:anything@msfjarvis.dev | jq .
{
  "error": "An invalid identity was requested"
}

➜ curl -s https://msfjarvis.dev/.well-known/webfinger?resource=acct:harsh@msfjarvis.dev | jq .
{
  "subject": "acct:msfjarvis@androiddev.social",
  "aliases": [
    "https://androiddev.social/@msfjarvis",
    "https://androiddev.social/users/msfjarvis"
  ],
  "links": [
    {
      "rel": "http://webfinger.net/rel/profile-page",
      "type": "text/html",
      "href": "https://androiddev.social/@msfjarvis"
    },
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://androiddev.social/users/msfjarvis"
    },
    {
      "rel": "http://ostatus.org/schema/1.0/subscribe",
      "template": "https://androiddev.social/authorize_interaction?uri={uri}"
    }
  ]
}
```

Thanks again to Maarten for doing the initial research for this and writing about it!
