---
title: Building a Webmentions server on top of the Cloudflare Developer Platform
date: '2026-04-04T16:25:00+05:30'
summary: Recounting the journey of adding Webmentions support to this site.
tags:
  - cloudflare
  - netlify
  - workers
  - d1
categories:
  - open source
  - dev
draft: true
---

Over the past 3-4 months I've become a regular participant at the [IndieWebClub](https://blr.indiewebclub.org/) meet up, which has meant slowly IndieWeb-ifying my website. I've implemented support for [MicroFormats2](https://microformats.org/), ensured my RSS feeds are compliant (mostly), enabled [IndieAuth](https://indieauth.com/) support and finally arrived at [Webmentions](https://indieweb.org/Webmention).

These required a server component to handle incoming and outgoing Webmentions, which meant I had a decision to make about the tech stack. At work I had been keeping an eye on the Developer Platform demos, and realizing that my mental model of Cloudflare's offerings in the space was several years out-of-date. I decided that I would build the server component using only Cloudflare primitives, and try to make sure it all fit into the free tier in case someone else felt brave enough to take my slop for a spin.

I spent a few days getting re-familiarized with Cloudflare Workers and the additional Workers-adjacent features that had released in the 5-6 years since I last used Workers: Durable Objects, the D1 database, Workflows, Queues — the works. I settled on combining Workers, D1 and Queues for this project. Workers receives the request, puts it into a Queue to be processed asynchronously, and D1 maintained a record of all incoming Webmentions and associated metadata.

I was still using [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent) when I started working on this, so I had it drive Claude and spit out a very bare bones and buggy [initial implementation](https://git.msfjarvis.dev/msfjarvis/acceptable-vibes/commit/b9458ca933fedc5178f490535b9fb0cb7754532c?files=webmentions-server). It was able to receive Webmentions in a very narrow set of formats and do not much else. I continued [iterating](https://git.msfjarvis.dev/msfjarvis/acceptable-vibes/compare/b9458ca933fedc5178f490535b9fb0cb7754532c...177dce783c67df79b98ad992906866625635c20c?files=webmentions-server) on this for 3-4 days, where it was finally at a point that I could leave it alone and not hate how it looked on my site. During this time I also exercised it against the [webmention.rocks](https://webmention.rocks) test suite and found multiple deficiencies.

As is common the field of LLMs, in the 2 weeks since I last tinkered with this I discovered yet another "framework" claiming to make LLMs better. [Superpowers](https://github.com/obra/superpowers) teaches LLMs to do software engineering instead of agentic engineering — gather requirements, write a spec, write a plan, follow the test-driven development workflow of red-green-refactor, and review often.

> The commits I link to are all authored by "Sisyphus" because I was too lazy to change it to match the latest LLM fad I was trying out. The basic idea behind it is that LLMs like to commit changes themselves and I'm not going to claim authorship on shit I didn't write.

Not being particularly happy with the current state of the Webmentions server, I decided to throw all the existing code away and rewrite it following the W3C draft closely and have extensive tests from the very beginning. The result of it was [this commit](https://git.msfjarvis.dev/msfjarvis/acceptable-vibes/commit/5f32a78aea9a3847c543db125a6eeee993f69239?files=webmentions-server) which rewrote all of this code in-place. I then started taking this through the webmention.rocks test suite and identifying any gaps in sanitizing/normalizing inputs and such.

Getting the receiving part working was relatively straightforward, the outgoing Webmentions are what really stumped me for a bit. The server did have support for them, but I did not have a very straightforward way to let it know when to send them. I solved this by using [Netlify Build Plugins](https://docs.netlify.com/extend/install-and-use/build-plugins/). I had a false start here by first looking at [Netlify Extensions](https://developers.netlify.com/sdk/get-started/introduction) instead which didn't seem to be supported anymore. A build plugin is capable of executing post-build steps and gather data about changed paths, so it could dispatch requests to my Webmentions server whenever I put up a new post or edited an existing one.

Getting the build plugin working was a challenge due to the rather slow iteration times of a full Netlify build, but in 4-5 days I had a version which worked perfectly. The main problem I faced after the extension <> build plugin kerfuffle was the lack of persistent state. I couldn't figure this out so I ultimately chose to make the server component idempotent and instead have the extension be [fully stateless](https://git.msfjarvis.dev/msfjarvis/acceptable-vibes/commit/cfcbd742d9475a758b7947c0c3edcf7ca940edd3?files=netlify-webmentions-extension).

Testing outgoing Webmentions revealed a bunch of gaps around how my implementation parsed mine and others' web pages. The Webmentions spec leaves out some things such as what to do when a page declares more than one Webmentions server which are scenarios covered by webmention.rocks. They were immensely helpful in arriving at an implementation that could handle a lot of real world pages without immediately choking.
