+++
categories = ["android"]
date = 2020-01-17T20:37:05+05:30
draft = true
slug = "dagger-the-easy-way--part-1"
tags = ["android", "dagger", "tutorial"]
title = "Dagger the easy way - Part 1"
description = "Dagger is universally intimidating to beginners and I want to change it."
+++

This is not your average coding tutorial. I'm going to show you how to write real-world Dagger code and skip all the shit about the implementation details of everything we're using and how Dagger does what it does with the code we give it to work with. If you're interested in that, read up elsewhere after this is done or just [poke me on Twitter](https://twitter.com/MSF_Jarvis) that you really, really wanna know the theoretical aspect of this and I'll grumble and consider it.

With that out of the way, onwards to the actual content. We're going to be building a very simple app that does just one thing, checks if this is the app's first run, and show a Toast with some text depending on whether it was the first run or not. Nothing super fancy here, but with some overkill abstraction I'll hopefully be able to demonstrate a straightforward and understandable use of Dagger.

I've setup a repository at [msfjarvis/dagger-the-easy-way](https://github.com/msfjarvis/dagger-the-easy-way) that shows every logical collection of changes in its own separate commit, and also a PR to go from no DI to Dagger so you can browse changes in bulk as well.

## The mandatory theory

I know what I said, but this is just necessary. Bear with me.

### `Component`

A Component defines an interface that Dagger constructs to know the entry points where dependencies can be injected. It can also hold the component factory that instructs Dagger how to construct said component. A Component _also_ holds the list of modules.

### `Module`

A Module is any logical unit that contributes to Dagger's object graph. In simpler terms, any `class` or `object` that has declarations which tell Dagger how to construct a particular dependency, is annotated with `@Module`.

## Getting Started

To get started, clone the `boilerplate` branch of my repository which contains all the useless grunt work already done for you. Use `git clone --branch boilerplate https://github.com/msfjarvis/dagger-the-easy-way` if you're unfamiliar with branch selection during clone.

The repo in this stage is very bare - it has the usual boilerplate and just one class, `MainActivity`. We're going to make this a bit more interesting shortly.

Switch to the `part-1` branch, which has a bit more in terms of commit history and code. This is what we're going to work with.

## Setting up the things

Remember `Component` and `Module`? It's gonna come in handy here. 

Start off with [adding the Dagger dependencies](https://github.com/msfjarvis/dagger-the-easy-way/commit/f86208b89cee2c05becd4341e1b209dc2479aa2f), then add an **empty** Component and Module, which we did [here](https://github.com/msfjarvis/dagger-the-easy-way/commit/f1604adb4e99f342b213cefa9fada21efb6f49a2).

```kotlin
@Singleton
@Component(modules = [AppModule::class])
interface AppComponent {

}

@Module
object AppModule {

}
```

What we're doing here, is marking our `AppComponent` as a 'singleton', to indicate that it needs to only be constructed _once_ for the lifecycle of the application. We're also annotating it with `@Component` for obvious reasons, and adding our module to it to indicate that they're going together. This is empty right now but that's going to change soon.

If you check `MainActivity`, you'll notice that we're using [SharedPreferences](https://developer.android.com/reference/android/content/SharedPreferences.html). To demonstrate the use of Dagger, I'm going to replace that usage with one provided through Dagger. For that to happen though, Dagger needs to know how to create a `SharedPreferences`. Let's get that going!

```kotlin
@Module
object AppModule {

    @Provides
    @Reusable
    fun provideSharedPrefs(context: Context): SharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
}
```

Breaking this down: `Provides` tells Dagger to bind the return value of the method to the object graph, and `Reusable` tells Dagger that you want to use one copy of this as many times as you can, but it's _okay_ to create a new instance if that's not possible.

If you pay attention to the [commit](https://github.com/msfjarvis/dagger-the-easy-way/commit/f1a60ffaf6f07f8654bde27fbd65bef08c248f4e) for this step, you'll see that we're also adding preferences to the `AppComponent`. This is just one of the many different patterns one can use with Dagger, and I'm using it just for the simplicity. We'll look into another pattern for the next part!

