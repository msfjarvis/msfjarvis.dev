+++
categories = []
date = 2019-12-29T21:19:25+05:30
draft = true
slug = "my-dagger-lessons"
tags = []
title = "My Dagger lessons"
+++


[Dagger] is infamous for very good reasons. It's complicated to use, the documentation is an absolute shitshow, and simpler 'alternatives' exist. While [Koin] and to a lesser extent [Kodein] do the job, they're still service locators at their core and don't automatically inject dependencies like Dagger does.

## Background

Before I start, some introductions. I'm Harsh, the solo developer of [Viscerion](https://play.google.com/store/apps/details?id=me.msfjarvis.viscerion), an Android client for [WireGuard](https://www.wireguard.com/). It is a fully [open source](https://github.com/msfjarvis/viscerion) project just like the upstream Android client which served as the base for it. I forked Viscerion as a playground project that'd let me learn new Android tech in an unencumbered way and be something that I'd actually use, hence guaranteeing some level of sustained interest. I do still contribute major fixes back upstream, so put down your pitchforks :P

Like I said before, Viscerion is a learning endeavour, so I decided to learn. I rewrote most of the app in Kotlin, implemented some UI changes to make the app more friendlier to humans and added a couple features here and there. 

And then I decided to tackle the Dependency Injection monster.

## Step 1: "Ooh that looks good!"

The dependency injection story always begins with the search for a library that does it for you. You look at Dagger, go to the documentation, have to look up what a Thermosiphon is, and then you scratch Dagger off the list and move on. Kotlin users will end up on one of [Koin] or [Kodein] and that'll be the end of their story.


[Dagger]: https://dagger.dev
[Koin]: http://insert-koin.io/
[Kodein]: https://kodein.org/di/

<!--
What I know now that I didn't before.

1. `@Inject` and `@Provides` is an either-or situation
2. Injecting into a Kotlin `object` seems to be a problematic affair
3. The initial boiler plate is still really, really annoying.

Takeaways from this effort:

- Dagger is ridiculously complex without a human to guide you around.
- Koin's service locator pattern makes it far too easy to write bad code because you can inject anything anywhere.
- Dagger can feel like a lot of boilerplate but some clever techniques can mitigate that.
- Writing `inject` methods for every single class can feel like a drag because it is.
- Injecting into Kotlin `object`s appears to be a no-go. I opted to [refactor out the staticity where possible](https://github.com/msfjarvis/viscerion/pull/214/commits/9eb532521f51d0f7bb66a2a78aa1fc5688128a22), [pass injected dependencies to the function](https://github.com/msfjarvis/viscerion/commit/e23f878140d4bda9e2c54d6c2684e07994066fd6#diff-28007a5799b03e7b556f5bb942754031) or [fall back to 'dirty' patterns](https://github.com/msfjarvis/viscerion/pull/214/commits/fc54ec6bb8e99ec639c6617765e814e12d91ea1a#diff-74f75ab44e1cd2909c4ec4d704bbbab7R65) as needed. Do what you feel like.
- I still do not _love_ Dagger. Fuck you Google.
-->