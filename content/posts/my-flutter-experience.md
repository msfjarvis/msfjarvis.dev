+++
categories = ["dart", "flutter", "android"]
date = 2021-02-25
description = "I've had the chance to explore Flutter (and Dart) at work for the past few weeks and I have opinions :tm:"
draft = true
slug = "my-flutter-experience"
tags = ["androiddev", "dart", "flutter", "kotlin"]
title = "My Flutter experience as an Android developer"
+++

Over the past month I've been helping Sasikanth and the rest of the engineering team at Obvious in building the mobile app for [Pause]. We chose Flutter as our framework to build it in, both out of organisational needs (wanting iOS and Android apps quickly) as well as a chance to evaluate how our teams feel about Flutter and if it's a viable option for us. It's been a fun journey so far, and there are some very pronounced differences between building native Android apps and using Flutter that were interesting to observe and adapt to.

## Hot reload is great! (when it works)

Not much to say there, it really is great! The lack of IDE support for previewing your UIs is more than made up by being able to press one key and see it on your device instead. The catch: it requires you to use a debug build which usually means janky performance (notably bad on Android, not so much on iOS). Release builds do not suffer from this, since they're compiled ahead-of-time. I’ve also noticed that subsequent hot reloads seem to exacerbate the UI slowness to the point where 4-5 hot reloads in you will need to restart your app to have things move on the screen again.

However, I can say for a fact that hitting save on your code and seeing it on the device within seconds is amazing. I have also found that Flutter essentially never has build cache issues, which although rare, do still happen with native Android development.

## Widgets are straightforward to build and easy to theme

The core and material libraries included in Flutter are great for building design systems at a rapid pace, and theming has been very easy in my experience compared to Android's XML-based approach and the often confusing distinctions between _themes_ and _styles_.

The explicit distinction between stateful and stateless widgets can feel welcome to some, but after having used [Jetpack Compose] for a few months, I feel that Flutter could be doing more to handle the differences by itself rather than punt it onto users. I'm not entirely convinced that nobody's been confused between `StatefulWidget` and `StatelessWidget`, because 'state' by itself is a difficult concept to internalize without guidance.

# Documentation feels awfully lacking in core concepts

On the subject of state, Flutter has a [5 part document] that ends with a list of 12 different libraries and APIs which are your options for doing state management. That is insane! In comparison, [state in Jetpack Compose] is a detailed single page overview that explains each new term you will encounter, the core APIs for what you want to do with state, and enlists common mistakes that admittedly I too have made when I first tried Compose. These are good docs!

Flutter also glosses over side effects, which I find particularly distressing. Thinking declaratively means that individual units must be free of side effects, yet there are times when a side effect is necessary and you want a structured way of dispatching one. Flutter mentions side effects a total of two times on its website, on the [architectural overview] page, and doesn't actually explain how to dispatch one. Contrast that with the Compose [Lifecycle and side-effects] documentation which explains everything you'd want to know on the topic. Again, good docs!

Thinking in declarative and functional terms is not immediately straightforward for everyone, and while Jetpack Compose had a very clear goal of onboarding Android developers which may have driven their excellent documentation around these concepts, Flutter too needs to come to grips with the reality that a) not everyone's first foray into application programming will be Dart, and b) Developers from other platforms will have more questions than "What is the exact 1:1 mapping of everything from X to Flutter?". There's a good reason Compose docs include the '[Thinking in Compose]' page and it's about time Flutter had a documentation revamp that addresses onboarding of core concepts such as functional programming.

## Dart is...eh

:warning: Hot take alert :warning:

Dart as a language still feels like it hasn't escaped its JavaScript roots. It has a lot of rather undesirable features enabled by default, such as [implicit interfaces] and most notably: [dynamic as a fallback for type inference]. One can argue that the type system should simply fail compilation if type inference fails and ask for the user to annotate the type themselves. This is what a lot of languages do! However, Dart opted for a weird middle ground where it will sometimes generate an error and sometimes assume the type to be `dynamic`, which basically means "anything". This lack of consistency leaves the door open for a variety of subtle type related bugs that would be resolved by always throwing an error.

A lot of the Flutter APIs suffer significantly from this type unsafety. Anything that requires a `Navigator` result is implicitly typed to `dynamic`, and can fail at runtime for a variety of reasons. A simple real world example from our codebase:

```dart
final _logoutResult = await showDialog(context: context, child: LogoutDialog());
if (_logoutResult) {
  _startLogout();
}
```

What you're looking at appears obvious at first glance. We expect `showDialog` to return a `bool`, and use that to determine whether or not to start the logout flow. However, there's a catch. Since `Navigator` results are untyped, you can easily encounter a situation where type inference fails at _runtime_ and trigger a crash because `_logoutResult` can no longer be coerced as a boolean value. Flutter's `AlertDialog` does not provide a way of adding a dismiss listener, so we can't actually send a value back when it is dismissed by tapping outside the view and thus `_logoutResult` became `null`. In the end, I had to opt for simply working around the type system:

```dart
final bool _logoutResult = await showDialog(context: context, child: LogoutDialog()) ?? false;
if (_logoutResult) {
  _startLogout();
}
```

This specific problem has been kind of resolved by Flutter 2.0's null-safety features, which marks the result of `showDialog` as nullable and thus enforces the caller to handle the null case. However, because Flutter 2.0 is such a huge breaking change, we can't fully migrate to it until our dependencies do and that has been a challenge so far.

Dart has support for generics, but you are free to omit them when calling methods or instantiating classes and in most cases, you guessed it, Dart will pepper in `dynamic`. This to me makes generics a real [footgun] in the language.

Extension functions exist in Dart, but in my experience IDEs are unable to offer autocomplete for them. You'll first need to import the file defining your `extension` (Dart has a designated keyword for extension functions) before your IDE can autocomplete them. This sours the experience for me as a Kotlin developer, where I've come to expect my IDE to surface extension functions via completion suggestions pretty much every time.

The language also does not support [sum types], like Kotlin does with `sealed` classes, making the modeling of a variety of real-world situations slightly harder. There are community developed libraries to fill in some of these gaps ([sum_types]), but they involve codegen, which is another pain-point.

## Flutter tooling is (for the most part) great

I'll say this upfront: having the `flutter` CLI is amazing. It encapsulates a lot of functionality that is usually all over the place and puts them into a easily accessible interface. I absolutely love it.

That being said, there are some gripes I have with one specific tooling aspect: codegen. Coming from the JVM ecosystem, I have a certain degree of expectations about code generation. It should be transparent in that I should not have to explicitly run it, and the generated code must not be a part of my source tree. Flutter does both in ways that feel _wrong_ to me. Again, my distaste stems from what I've experienced in the JVM ecosystem.

To run codegen tasks in Flutter you need to call into a package called `build_runner` that performs the actual codegen. This amounts to the `flutter pub run build_runner build` command in the terminal. I have not found any support for doing this from the IDE in either of the first party plugins offered for Visual Studio Code and IntelliJ IDEA respectively. Once this is done, you'll find that your source tree is littered with `*.g.dart` files. Now you have a decision to make: whether or not to check them into version control. The official [`build_runner` docs] recommend that you **don't** do it for applications, **do** it for published libraries, and always check the documentation of the specific code generators you're using on what their authors recommend. Much more involved than the JVM answer of "no".

Switching between Flutter versions is also an experience, to say the least. `flutter upgrade` works great, but when you attempt to rollback you'll find options lacking. Why would you want to rollback? As we briefly mentioned above, [Flutter 2.0] brings significant changes both to Flutter itself and the underlying Dart language, which means that all dependencies need to be updated as well. There are ways to disable new features like sound nullsafety to allow for the upgrade to happen without waiting for dependencies, but since null safety has been such a pain point personally, I want to be able to leverage it fully when I upgrade. For rolling back, the most straightforward option is to just redownload the SDK or make a copy before updating.

## Closing notes.

While this is a rant-esque post, I do find Flutter to be a generally pleasant way to build cross-platform apps. With the web target reaching stable in [Flutter 2.0], it is now an even more lucrative option for new projects to become available on multiple platforms with a single team. However, I will still be leaning towards [Jetpack Compose] for Android-only projects. Maybe the reasons for that can form another blogpost in the future :)

[Simple]: https://simple.org
[Pause]: https://getpause.com
[Jetpack Compose]: https://d.android.com/jetpack/compose
[Implicit interfaces]: https://dart.dev/guides/language/language-tour#implicit-interfaces
[Dynamic as a fallback for type inference]: https://dart.dev/guides/language/effective-dart/design#type-inference
[Sum types]: https://chadaustin.me/2015/07/sum-types/
[sum_types]: https://pub.dev/packages/sum_types
[`build_runner` docs]: https://pub.dev/packages/build_runner#source-control
[Flutter 2.0]: https://medium.com/flutter/whats-new-in-flutter-2-0-fe8e95ecc65
[footgun]: https://en.wiktionary.org/wiki/footgun#:~:text=footgun%20(plural%20footguns),shooting%20themselves%20in%20the%20foot.
[5 part document]: https://flutter.dev/docs/development/data-and-backend/state-mgmt
[state in Jetpack Compose]: https://d.android.com/jetpack/compose/state
[architectural overview]: https://flutter.dev/docs/resources/architectural-overview
[lifecycle and side-effects]: https://d.android.com/jetpack/compose/lifecycle
[thinking in compose]: https://developer.android.com/jetpack/compose/mental-model
