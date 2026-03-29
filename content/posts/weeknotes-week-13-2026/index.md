+++
title = "Weeknotes: Week #13 (2026)"
date = "2026-03-29T20:12:00+05:30"
lastmod = "2026-03-29T20:12:00+05:30"
summary = "A Flu is no joke..."
categories = [ "weeknotes" ]
tags = [ "health" ]
draft = true
deleted = false
+++

This week has been a bit of a roller coaster, was having a pretty normal week then got hit with a _nasty_ Flu to cap it off in the worst way possible.

### Boring tech stuff

I've been trying out [superpowers](https://github.com/obra/superpowers), which takes gaslighting-via-markdown (otherwise known as Agent Skills) to a logical extreme, forcing LLMs to behave like a very disciplined senior engineer.

I used this to change a longstanding misfeature in Claw that caused it to mark comments as unread when you first view a post, which is quite redundant. superpowers spent a solid hour on this, during which I also manually reviewed a spec and an implementation plan, but the [result](https://github.com/msfjarvis/compose-lobsters/commit/83db9bb8a8f7f1ae7dc3df305ab599f15fa7d512) is quite exhaustive and has robust test coverage which I definitely wouldn't have bothered with.

I also let it loose on our work codebase by feeding it a list of prior issues we had faced in a particularly brittle component and had it refactor the code to follow the popular ["functional core, imperative shell"](https://testing.googleblog.com/2025/10/simplify-your-code-functional-core.html) pattern and then unit test the core to prevent regressions along the bug categories we've been chasing for quite a while. That refactor ran even longer, but ultimately the result was again rather impressive. LLMs are (for the most part) really good at fixing tests, and superpowers forces the LLM to follow a red-green-refactor cycle for all changes which means it's always trying to fix tests.

I finally finished running the full gauntlet of [webmention.rocks](https://webmention.rocks) tests against my [WebMentions server](https://git.msfjarvis.dev/msfjarvis/acceptable-vibes/src/branch/main/webmentions-server). It exposed a few gaps in the implementation but I'm at 100% compliance now, the only remaining issue is now with my site not returning HTTP 410 for deleted posts because I don't really know how to make it happen.

### Boring not-tech stuff

I finished reading [Project Hail Mary](https://bookwyrm.social/book/102060/s/project-hail-mary), super good read. I hadn't realized Andy Weir also wrote The Martian! The book was great, the movie's promised to be even better but good lord has it been hard to find a way to watch it with the lack of IMAX screens.

The keyboard I had ordered last week arrived, completing the new set :)
