+++
categories = ["kotlin", "android", "teachingkotlin"]
date = "2019-09-23T12:00:00+05:30"
devLink = "https://dev.to/msfjarvis/teachingkotlin-part-1-classes-and-objects-and-everything-in-between-5bn0"
lastmod = "2019-09-23T12:00:00+05:30"
slug = "teaching-kotlin--classes-and-objects"
summary = "Part 1 of my #TeachingKotlin, this post goes over Kotlin classes, objects and how things like finality and staticity vary between Java and Kotlin."
tags = []
title = "#TeachingKotlin Part 1 - Classes and Objects and everything in between"
+++

Classes in Kotlin closely mimic their Java counterparts in implementation, with some crucial changes that I will attempt to outline here.

Let's declare two identical classes in Kotlin and Java as a starting point. We'll be making changes to them alongside to show how different patterns are implemented in the two languages.

Java:

```java
class Person {
  private final String name;

  public Person(String name) {
    this.name = name;
  }
}
```

Kotlin:

```kotlin
class Person(val name: String)
```

The benefits of using Kotlin immediately start showing! But let's go over this in a sysmetatic fashion and break down each aspect of what makes Kotlin so great.

## Constructors and parameters

Kotlin uses a very compact syntax for describing primary constructors. With some clever tricks around default values, we can create many constructors out of a single one!

Notice the `val` in the parameter name. It's a concise syntax for declaring variables and initializing them from the constructor itself. Like any other property, they can be mutable (`var`) or immutable (`val`). If you remove the `val` in our `Person` constructor, you will not have a `name` variable available on its instance, i.e., `Person("Person 1").name` will not resolve.

The primary constructor cannot have any code so Kotlin provides something called 'initializer blocks' to allow you to run initialization code from your constructor. Try running the code below in the [Kotlin playground](https://play.kotlinlang.org/)

```kotlin
class Person(val name: String) {
  init {
    println("Invoking constructor!")
  }
}

val _unused = Person("Matt")
```

Moving on, let's add an optional age parameter to our classes, with a default value of 18. To make it convenient to see how different constructors affect values, we're also including an implementation of the `toString` method for some classing print debugging.

Java:

```java
class Person {

  private final String name;
  private int age = 18;

  public Person(String name) {
    this.name = name;
  }

  public Person(String name, int age) {
    this(name);
    this.age = age;
  }

  @Override
  public String toString() {
    return "Name=" + name + ",age=" + Integer.toString(age);
  }
}
```

Kotlin:

```kotlin
class Person(val name: String, val age: Int = 18) {
  override fun toString() : String {
    // I'll go over string templates in a future post, hold me to it :)
    return "Name=$name,age=$age"
  }
}
```

Lots of new things here! Let's break them down.

Kotlin has a feature called 'default parameters', that allows you to specify default values for parameters, thus making them optional when creating an instance of the class.

An important note here is that constructors with default values don't directly work with Java if you're writing a library or any code that would require to interop with Java. Use the Kotlin `@JvmOverloads` annotation to handle that for you.

```kotlin
class Person @JvmOverloads constructor(val name: String, val age: Int = 18) {
  override fun toString() : String {
    return "Name=$name,age=$age"
  }
}
```

Doing this will generate constructors similar to how we previously wrote in Java, to allow both Kotlin and Java callers to work.

## Finality of classes

In Kotlin, all classes are final by default, and cannot be inherited while Java defaults to extensible classes. The `open` keyword marks Kotlin classes as extensible, and the `final` keyword does the opposite on Java.

Java:

```java
public class Man extends Person { /* Class body */ } // Valid in Java
```

Kotlin:

```kotlin
class Man(val firstName: String) : Person(firstName) // Errors!
```

Trying it out in the Kotlin REPL

```kotlin
> > > class Person @JvmOverloads constructor(val name: String, val age: Int = 18) {
> > > ... override fun toString() : String {
> > > ...   return "Name=$name,age=$age"
> > > ... }
> > > }
> > > class Man(val firstName: String) : Person(firstName)
> > > error: this type is final, so it cannot be inherited from
> > > class Man(val firstName: String) : Person(firstName)
                                         ^
```

Makes sense, since that's default for Kotlin. Let's add the `open` keyword to our definition of `Person` and try again.

```kotlin
> > > open class Person @JvmOverloads constructor(val name: String, val age: Int = 18) {
> > > ... override fun toString() : String {
> > > ...   return "Name=$name,age=$age"
> > > ... }
> > > }
> > > class Man(val firstName: String) : Person(firstName)
> > > println(Man("Henry"))
> > > Name=Henry,age=18
```

And everything works as we'd expect it to. This is a behavior change that is confusing and undesirable to a lot of people, so Kotlin provides a compiler plugin to mark all classes as `open` by default. Check out the [`kotlin-allopen`](https://kotlinlang.org/docs/reference/compiler-plugins.html#all-open-compiler-plugin) page for more information about how to configure the plugin for your needs.

## Static utils classes

Everybody knows that you don't have a real project until you have a `StringUtils` class. Usually it'd be a `public static final` class with a bunch of static methods. While Kotlin has a sweeter option of [extension functions and properties](https://kotlinlang.org/docs/tutorials/kotlin-for-py/extension-functionsproperties.html), for purposes of comparison we'll stick with the old Java way of doing things.

Here's a small function I use to convert Android's URI paths to human-readable versions.

Java:

```java
public static final class StringUtils {
  public static String normalizePath(final String str) {
    return str.replace("/document/primary:", "/sdcard/");
  }
}
```

Kotlin:

```kotlin
object StringUtils {
  // I'll cover this declaration style too. It's just the first post!
  fun normalizePath(str: String): String = str.replace("/document/primary:", "/sdcard/")
}
```

A recurring pattern with Kotlin is concise code, as you can see in this case.

That's all for this one! Let me know in the comments about what you'd prefer to be next week's post about or if you feel I missed something in this one and I'll definitely try to make it happen :)
