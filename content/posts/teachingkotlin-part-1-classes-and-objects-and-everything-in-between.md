+++
categories = ["kotlin", "dev", "android", "teachingkotlin"]
date = "2019-09-23T18:00:00+05:30"
draft = true
slug = "teaching-kotlin--classes-and-objects"
tags = ["android", "teachingkotlin", "kotlin"]
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

Let's add an optional age parameter to our classes, with a default value of 18. To make it convenient to see how different constructors affect values, we're also including an implementation of the `toString` method for some classing print debugging.

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
        // I know how cool this looks. I'll explore string templating differences in a future post, hold me to it :)
        return "Name=$name,age=$age"
    }
}
```

Lots of new things here! Let's break them down.

Kotlin has a feature called 'default parameters`, that allows you to specify default values for parameters, thus making them optional when creating an instance of the class.

Let's take these for a spin on [repl.it](https://repl.it)!

{% replit @msfjarvis/ButteryYellowgreenTraining %}

{% @msfjarvis/DarkcyanDisfiguredDatalogs %}

Both work perfectly well, but you know which one you'd enjoy writing more ;)

An important note here is that constructors with default values don't directly work with Java if you're writing a library or any code that would require to interop with Java. Use the Kotlin `@JvmOverloads` annotation to handle that for you.

```kotlin
class Person @JvmOverloads constructor(val name: String, val age: Int = 18) {
    override fun toString() : String {
        return "Name=$name,age=$age"
    }
}
```

Doing this will generate constructors similar to how we previously wrote in Java, to allow both Kotlin and Java callers to work.
