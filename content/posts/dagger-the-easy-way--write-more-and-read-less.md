+++
categories = ["android"]
date = 2020-01-14T01:54:58+05:30
draft = true
slug = "dagger-the-easy-way--write-more-and-read-less"
tags = ["android", "dagger", "tutorial"]
title = "Dagger the easy way - write more and read less"
description = "This is not going to be very great but it'll teach you enough to use Dagger so why the hell not."
+++

This is not your average coding tutorial. I'm going to show you how to write real-world Dagger code and skip all the shit about the implementation details of everything we're using and how Dagger does what it does with the code we give it to work with. If you're interested in that, read up elsewhere after this is done or just [poke me on Twitter](https://twitter.com/MSF_Jarvis) that you really, really wanna know the theoretical aspect of this and I'll grumble and consider it.

With that out of the way, onwards to the actual content. We're going to be building a very simple app that does just one thing, checks if this is the app's first run, and show a Toast with some text depending on whether it was the first run or not. Nothing super fancy here, but with some overkill abstraction I'll hopefully be able to demonstrate a straightforward and understandable use of Dagger.

I've setup a repository at [msfjarvis/dagger-the-easy-way](https://github.com/msfjarvis/dagger-the-easy-way) that shows every logical collection of changes in its own separate commit, and also a PR to go from no DI to Dagger so you can browse changes in bulk as well.

## The mandatory theory

I know, I know, I said there won't be any theoretical things here but some parts just have to be explained.

### `Component`

A Component defines an interface that Dagger constructs to know the entry points where dependencies can be injected. It also holds the component factory that instructs Dagger how to construct said component. A Component *also* holds the list of modules.

### `Module`

A Module is any logical unit that contributes to Dagger's object graph. In simpler terms, any `class` or `object` that has methods which tell Dagger how to construct a particular dependency, is annotated with `@Module`. Here's a simple code example (that we'll be using later as well).

```kotlin
@Module
object AppModule {

    @Reusable
    @Provides
    fun getSharedPrefs(context: Context): SharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
}
```

You'll notice some additional annotations here that I haven't covered yet. These will be explained as we write some code later in this tutorial.

## Getting Started

To get started, clone the `boilerplate` branch of my repository which contains all the useless grunt work already done for you. Use `git clone --branch boilerplate https://github.com/msfjarvis/dagger-the-easy-way` if you're unfamiliar with branch selection during clone.

The repo in this stage is very bare - it has the usual boilerplate and just one class, `MainActivity`.

// TODO: Write the sample project and populate this further.
