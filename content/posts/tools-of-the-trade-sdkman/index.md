+++
date = 2020-09-02
summary = "Bringing this series back on popular demand, we're here to talk about SDKMAN!"
categories = ["tools-of-the-trade"]
slug = "tools-of-the-trade-sdkman"
title = "Tools of the trade: SDKMAN!"
tags = ["sdkman", "cli-tools"]
+++

In the fourth post of [this series](/categories/tools-of-the-trade/), we're talking about [SDKMAN!](https://sdkman.io).

## What is SDKMAN?

SDKMAN is a **SDK** **Man**ager. By employing its CLI, you can install a plethora of JVM-related tools and SDKs to your computer, without ever needing root access.

## Why do I use it?

Since I primarily work with [Kotlin](https://kotlinlang.org/), having an up-to-date copy of the Kotlin compiler becomes helpful for quickly testing code samples with its inbuilt REPL (**R**ead **E**valuate **P**rint **L**oop). I also use [Gradle](https://gradle.org) as my build tool of choice, and tend to stay up-to-date with their releases in my projects. Finally, to run all these Java-based tools, you're gonna need Java itself. Linux distros tend to package very outdated versions of the JDK which becomes a hindrance when building standalone JVM apps that I want to use the latest Java APIs in. SDKMAN allows you to install Java from multiple sources including AdoptOpenJDK, Azulsystems' Zulu and many more.

The real kicker here is the fact that you can keep multiple versions of the same thing installed. Using Java 14 everywhere but a specific project breaks over Java 8? Just install it alongside!

To make this side-by-side ability even more useful, SDKMAN let's you create a `.sdkmanrc` file in a directory, and it will switch your currently active version of any installed tool to the version specified in the file. People following the series from the beginning might recall this sounds awfully like direnv, because it is. However, SDKMAN is noticeably slow when executing these changes, presumably because its tearing down an existing symlink and creating a new one. For that reason, SDKMAN ships with the `sdk_auto_env` feature (automatically parse `.sdkmanrc` when you change directories) off by default, requiring you to manually type `sdk env` each time you enter a directory where you have a `.sdkmanrc`.

Since the auto env feature matches what direnv does, I just use it directly. So, rather than doing this:

```bash
# .sdkmanrc
java=8.0.262-zulu
```

I do:

```bash
# .envrc
# In bash, doing `${VARIABLE/src/dest}` replaces `src` with
# `dest` in `${VARIABLE}`, but you still need to write it
# back manually (hence the `export`).
export JAVA_HOME="${JAVA_HOME/current/8.0.262-zulu}"
```

for the same end result, but a lot faster.

And that's really it! SDKMAN's pretty neat, but for the most part it just stays out of your way and thus there's not a lot to talk about it. The next post's gonna be much more hands-on :-)

This was part 4 of the [Tools of the trade](/categories/tools-of-the-trade/) series.
