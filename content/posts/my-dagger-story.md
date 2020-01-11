+++
categories = ["android"]
date = 2020-01-11T21:25:25Z
description = "Dagger is not the easiest tool to get on board with but it's almost worth the effort. Here's the story of my journey to not hating Dagger."
slug = "my-dagger-story"
tags = ["android", "dagger"]
title = "My Dagger Story"

+++
[Dagger](https://dagger.dev) is infamous for very good reasons. It's complicated to use, the documentation is an absolute shitshow, and simpler 'alternatives' exist. While [Koin](http://insert-koin.io/) and to a lesser extent [Kodein](https://kodein.org/di/) do the job, they're still service locators at their core and don't automatically inject dependencies like Dagger does.

## Background

Before I start, some introductions. I'm the sole developer of [Viscerion](https://play.google.com/store/apps/details?id=me.msfjarvis.viscerion), an Android client for [WireGuard](https://www.wireguard.com/). It is a fully [open source](https://github.com/msfjarvis/viscerion) project just like the upstream Android client which served as the base for it. I forked Viscerion as a playground project that'd let me learn new Android tech in an unencumbered way and be something that I'd actually use, hence guaranteeing some level of sustained interest. I do still contribute major fixes back upstream, so put down your pitchforks :P

Like I said before, Viscerion is a learning endeavour, so I decided to learn. I rewrote most of the app in Kotlin, implemented some UI changes to make the app more friendlier to humans and added a couple features here and there.

And then I decided to tackle the Dependency Injection monster.

## The beginnings

The dependency injection story always begins with the search for a library that does it for you. You look at Dagger, go to the documentation, look up what a Thermosiphon is, then scratch Dagger off the list and move on. Kotlin users will then end up on one of [Koin](http://insert-koin.io/) or [Kodein](https://kodein.org/di/) and that'll be the end of their story.

That was mine as well! Before Viscerion was forked, the app used to have Dagger (albeit sorely underused as I can tell now that I know a fair bit about it) but then it was [swapped out](https://github.com/WireGuard/wireguard-android/commit/712b6c6f600ef6eb683d356a6e9a05e9415b7e12) for singleton access from the Application class. I really, really wanted to try out the fancy 'Dependency Injection' thing everybody loved so I did some searching around, went through the aforementioned motions and [settled on Koin](https://github.com/msfjarvis/viscerion/pull/131).

It was great! I could get any dependency anywhere and that allowed me to write all kinds of hot garbage, and garbage I wrote. But despite all that, I still really wanted to give Dagger another shot. I tried multiple times to make it work, the remains of which have been force pushed away long since. Then I came across [Fred Porciúncula](https://twitter.com/tfcporciuncula)'s [dagger-journey](https://github.com/tfcporciuncula/dagger-journey) repository and the accompanying talk that tried to fill the usability gap that Dagger's documentation never could. He was largely successful in being able to teach me how to use Dagger, and the first "proper" attempt I made at using Dagger was [largely decent](https://github.com/msfjarvis/viscerion/pull/196/files). I was still missing a lot of knowledge that made me [slip back into my hate-train](https://github.com/msfjarvis/viscerion/pull/196#issuecomment-557907972).

## The turning point

Around mid-December 2019, [Arun](https://twitter.com/arunkumar_9t2) released the 0.1 version of his Dagger 2 dependency graph visualizer, [Scabbard](https://arunkumar.dev/introducing-scabbard-a-tool-to-visualize-dagger-2-dependency-graphs/). It looked **awesome**. I [retweeted it](https://twitter.com/MSF_Jarvis/status/1210856668310863872) and shoved in my residual Dagger hate for good measure because isn't that what the internet is for. I was [confident](https://twitter.com/MSF_Jarvis/status/1210866037056397312) that Dagger shall never find a place in my code and my friend [Sasikanth](https://twitter.com/its_sasikanth) (super smart dude, definitely worth following) was [hell-bent on ensuring otherwise](https://twitter.com/MSF_Jarvis/status/1210935581288517632?s=20).

Together, we dug up my previous efforts and I started [a PR](https://github.com/msfjarvis/viscerion/pull/214) so he could review it and help me past the point I dropped out last time. He helped [me on GitHub](https://github.com/msfjarvis/viscerion/pull/214#pullrequestreview-336919368), privately on Telegram and together in about 2 days Viscerion was completely Koin-free and ready to kill. I put down my thoughts about the migration briefly [on the PR](https://github.com/msfjarvis/viscerion/pull/214#issuecomment-569541678), which I'll reproduce and expand on below.

> * Dagger is ridiculously complex without a human to guide you around.

I will die on this hill. Without Sasikanth's help I would have never gotten around to even _trying_ Dagger again.

> * Koin's service locator pattern makes it far too easy to write bad code because you can inject anything anywhere.

Again, very strong opinion that I will continue to have. I overlooked a clean way of implementing a feature and went for a quick and dirty version because Koin allowed me the freedom to do it. Dagger forced me to re-evaluate my code and I ended up being able to extract all Android dependencies from that package and move it into a separate module.

> * Dagger can feel like a lot of boilerplate but some clever techniques can mitigate that.

Because the Dagger documentation wasn't helpful, I didn't realise that a `Provides` annotated method and an `@Inject`ed constructor was an either-or situation and I didn't need to write both for a class to be injectable. Sasikanth [with the rescue again](https://github.com/msfjarvis/viscerion/pull/214#discussion_r361800427).

> * Writing `inject` methods for every single class can feel like a drag because it is.

[I mean\...](https://github.com/msfjarvis/viscerion/blob/4a40f3692e62939d3b4c3693efe41ad03fb5f330/app/src/main/java/com/wireguard/android/di/AppComponent.kt#L69-L101)

> * Injecting into Kotlin `object`s appears to be a no-go. I opted to [refactor out the staticity where possible](https://github.com/msfjarvis/viscerion/pull/214/commits/9eb532521f51d0f7bb66a2a78aa1fc5688128a22), [pass injected dependencies to the function](https://github.com/msfjarvis/viscerion/commit/e23f878140d4bda9e2c54d6c2684e07994066fd6#diff-28007a5799b03e7b556f5bb942754031) or [fall back to \'dirty\' patterns](https://github.com/msfjarvis/viscerion/pull/214/commits/fc54ec6bb8e99ec639c6617765e814e12d91ea1a#diff-74f75ab44e1cd2909c4ec4d704bbbab7R65) as needed. Do what you feel like.

I have no idea if that's even a good ability to begin with, so I chose to change myself rather than fight the system.

> * I still do not _love_ Dagger. Fuck you Google.

This, I probably don't subscribe to anymore. Dagger was horrible to get started with, but I can now claim passing knowledge and familiarity with it, enough to be able to use it for simple projects and be comfortable while doing so.

## To summarize

Like RxJava, Dagger has become an industry standard of sorts and a required skill at a lot of Android positions, so eventually you might wind up needing to learn it anyway, so why wait? Dagger is not _terrible_, just badly presented. Learning from existing code is always helpful, and that was part of how I learned. Use my PR, and tweet me questions at [@MSF_Jarvis](https://twitter.com/MSF_Jarvis) and I'll do my best to help you like I was helped and hopefully we'll both learn something new :)