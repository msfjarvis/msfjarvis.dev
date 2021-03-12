+++
categories = ["dart", "flutter", "android"]
date = 2021-02-25
description = "I've had the chance to explore Flutter (and Dart) at work for the past few weeks and I have opinions :tm:"
draft = true
slug = "my-flutter-experience"
tags = ["androiddev", "dart", "flutter", "kotlin"]
title = "My Flutter experience as an Android developer"
+++

Over the past month I've been helping Sasikanth and the rest of the [Simple] team at Obvious in building the mobile app for [Pause]. We chose Flutter as our framework to build it in, both out of organisational needs (wanting iOS and Android apps at the same time) as well as an experiment in evaluating how our teams feel about Flutter and if it's a viable option for us. It's been a fun journey so far, and there are some very pronounced differences between building native Android apps and using Flutter that were interesting to observe and adapt to.

## Hot reload is great! (when it works)

Not much to say there, it really is great! The lack of IDE support for previewing your UIs is more than made up by being able to press one key and see it on your device instead. The catch: it requires you to use a debug build which usually means janky performance (notably bad on Android, not so much on iOS). Release builds do not suffer from this, since they're compiled ahead-of-time.  I’ve also noticed that subsequent hot reloads seem to exacerbate the UI slowness to the point where 4-5 hot reloads in you will need to restart your app to have things move on the screen again.

However, I can say for a fact that being able to save your on your computer and seeing it on the device within seconds is amazing. I have also found that Flutter essentially never has build cache issues, so no more “let me do a clean build and see if that fixes it” which, while a *lot* less frequent now, continues to be a thing in Android.

## Widgets are easy to build and extend

The core and material libraries included in Flutter are great for building design systems at a rapid pace, and theming has been very easy in my experience compared to Android's XML-based approach and the often confusing distinctions between _themes_ and _styles_.

The explicit distinction between stateful and stateless widgets can feel welcome to some, but after having used [Jetpack Compose] for a few months, I feel that Flutter could be doing more to handle the differences by itself rather than punt it onto users.

## Dart is...eh

:warning: Hot take alert :warning:

Dart as a language still feels like it hasn't escaped its JavaScript roots. It has a lot of _implicit_ features that are not always desirable, such as [implicit interfaces] and most notably: [dynamic failsafe for type inference]. One can argue that the type system should simply fail compilation if type inference fails and ask for the user to annotate the type themselves. This is what a lot of languages do! However, Dart opted for a weird middle ground where it will sometimes generate an error and sometimes assume the type to be `dynamic`, which basically means "anything". This lack of consistency leaves the door open for a variety of subtle type related bugs that would be resolved by always throwing an error.

A lot of the Flutter APIs suffer significantly from this type unsafety. Anything that requires a `Navigator` result is implicitly typed to `dynamic`, and can fail at runtime for a variety of reasons. A simple real world example from our codebase:

```dart
final _logoutResult = await showDialog(context: context, child: LogoutDialog());
if (_logoutResult) {
  _startLogout();
}
```

What happened here was that while we did return boolean values from `LogoutDialog` when the yes/no buttons were tapped, we did not do that for when the dialog is dismissed by tapping outside it. I could not find an API within `AlertDialog` that would allow me to respond to this particular event, so I had to opt for simply working around the type system:

```dart
final bool _logoutResult = await showDialog(context: context, child: LogoutDialog()) ?? false;
if (_logoutResult) {
  _startLogout();
}
```

An explicit type and the 'if null' operator bandaid the situation for now.

Dart has support for generics, but you are free to omit them in declarations and in most cases, you guessed it, Dart will pepper in `dynamic`. This to me makes generics a real [footgun] in the language.

Extension functions exist in Dart, but in my experience IDEs are unable to offer autocomplete for them like I have come to expect from Kotlin. You'll first need to import the file defining your `extension` (Dart has a designated keyword for extension functions) before you can use them. This sours the experience for me as a Kotlin developer where I've come to expect my IDE to surface extension functions via completion suggestions.

I'm not usually one to argue about subjective aspects like syntax, but I have to say I found Dart's syntax to be rather convoluted. I'll just drop an example here and move on, since this is a really pedantic talking point.

```dart
// Given MyWidget1...
class MyWidget1 {
  final String param1;
  final int param2;

  MyWidget1(this.param1, this.param2);
}

// ... it can only be initialised as:
final widget = new MyWidget1("Param 1", 2);

// However, if I slightly change the constructor...
class MyWidget2 {
  final String param1;
  final int param2;

  MyWidget2(this.param1, {this.param2});
}

//... it can now only be initialised with an explicit name for param2
final widget1 = new MyWidget2("Param 1", param2: 2);

// The braces in the constructor also change the meaning of the parameters
final widget2 = new MyWidget2("Param 1");

// This code will compile fine, because parameters inside braces are optional.
// You can change that by annotating the parameter with @required.
```

The language also does not support [sum types], which makes modeling a variety of real-world situations much harder. There are community developed libraries to fill in some of these gaps ([sum_types]), but they involve codegen, which is another pain-point.

## Flutter tooling is (for the most part) great

I'll say this upfront: having the `flutter` CLI is amazing. It encapsulates a lot of functionality that is usually all over the place and puts them into a easily accessible interface. I absolutely love it.

That being said, there are some gripes I have with one specific tooling aspect: codegen. Coming from the JVM ecosystem, I have a certain degree of expectations about code generation. It should be transparent in that I should not have to explicitly run it, and the generated code must not be a part of my source tree. Flutter does both in ways that feel _wrong_ to me. Again, my distaste stems from what I've experienced in the JVM ecosystem.

To run codegen tasks in Flutter you need to call into a package called `build_runner` that performs the actual codegen. This amounts to the `flutter pub run build_runner build` command in the terminal. I have not found any support for doing this from the IDE in either of the first party plugins offered for Visual Studio Code and IntelliJ IDEA respectively. Once this is done, you'll find that your source tree is now littered with `*.g.dart` files. Now you have the decision to make of whether or not to check them into version control. The official [`build_runner` docs] recommend that you **don't** do it for applications, **do** it for published libraries, and check the specific code generators you're using on what their authors recommend you do. Much more involved than the JVM answer of "no".

Switching between Flutter versions is also an experience, to say the least. `flutter upgrade` works great, but when you attempt to rollback you'll find options lacking. Why would you want to rollback? Well, [Flutter 2.0] brings significant changes both to Flutter itself and the underlying Dart language, which means that all dependencies need to be updated as well. There are ways to disable new features like sound nullsafety to allow for the upgrade to happen without waiting for dependencies, but since null safety has been such a pain point personally, I want to be able to leverage it fully when I upgrade. For rolling back, your option is to either just delete and redownload the version you want, or in a slightly easier way, open a terminal in `$FLUTTER_DIR` and check `git reflog` for the previous state and `git reset --hard` to it. Flutter does insist on redownloading the Dart SDK each time you move between versions which I find extremely wasteful and avoidable, but that's how it is for now.

## Closing notes.

While this is a rant-esque post, I do find Flutter to be a generally pleasant way to build cross-platform apps. With the web target reaching stable in [Flutter 2.0], it is now an even more lucrative option for new projects to become available on multiple platforms with a single team. However as an Android developer, I will still be leaning towards [Jetpack Compose] for Android-only projects. Maybe the reasons for that can form another blogpost in the future :)

[Simple]: https://simple.org
[Pause]: https://getpause.com
[Jetpack Compose]: https://d.android.com/jetpack/compose
[Implicit interfaces]: https://dart.dev/guides/language/language-tour#implicit-interfaces
[Dynamic failsafe for type inference]: https://dart.dev/guides/language/effective-dart/design#type-inference
[Sum types]: https://chadaustin.me/2015/07/sum-types/
[sum_types]: https://pub.dev/packages/sum_types
[`build_runner` docs]: https://pub.dev/packages/build_runner#source-control
[Flutter 2.0]: https://medium.com/flutter/whats-new-in-flutter-2-0-fe8e95ecc65
[footgun]: https://en.wiktionary.org/wiki/footgun#:~:text=footgun%20(plural%20footguns),shooting%20themselves%20in%20the%20foot.
