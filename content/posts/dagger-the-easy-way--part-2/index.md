+++
categories = ["android"]
date = 2020-03-06
summary = "Let's extend the \"scope\" of these tutorials :)"
devLink = "https://dev.to/msfjarvis/dagger-the-easy-way-part-2-4p4m"
slug = "dagger-the-easy-way--part-2"
socialImage = "uploads/dagger_made_easy_social.webp"
tags = ["dagger", "tutorial"]
title = "Dagger the easy way - Part 2"
+++

Welcome back! In this post I'm taking a bit of detour from my planned schedule to write about **scoping**. We'll _definitely_ cover constructor injection in the next part :)

> All the code from this post is available on GitHub: [msfjarvis/dagger-the-easy-way](https://github.com/msfjarvis/dagger-the-easy-way/commits/part-2)

Dagger 2 provides `@Scope` as a mechanism to handle scoping. Scoping allows you to keep an object instance for the duration of your scope. This means that no matter how many times the object is requested from Dagger, it returns the same instance.

## Default scopes

In the previous tutorial, we looked at _two_ scopes, namely `@Singleton` and `@Reusable`. Singleton does what its name suggests, and "caches" the dependency instance for the lifecycle of the `@Component`, and Reusable tells Dagger that while we'd prefer that a cached instance be used, we're fine if Dagger needs to create another one. The new Dagger 2 [user guide](https://dagger.dev/users-guide) does a pretty good job differentiating between Singleton, Reusable and unscoped dependencies which I'll reproduce here.

```java
// It doesn't matter how many scoopers we use, but don't waste them.
@Reusable
class CoffeeScooper {
  @Inject CoffeeScooper() {}
}

@Module
class CashRegisterModule {
  @Provides
  // DON'T DO THIS! You do care which register you put your cash in.
  // Use a specific scope instead.
  @Reusable
  static CashRegister badIdeaCashRegister() {
    return new CashRegister();
  }
}

// DON'T DO THIS! You really do want a new filter each time, so this
// should be unscoped.
@Reusable
class CoffeeFilter {
  @Inject CoffeeFilter() {}
}
```

## Why do we need scopes

I'll do a small demo to show the difference between unscoped and singleton dependencies, then we'll move on to defining our own scopes.

```kotlin
// AppComponent.kt

data class Counter(val name: String)

@Component(modules = [AppModule::class])
interface AppComponent {
  fun getCounter(): Counter
}

@Module
class AppModule {
  private var index = 0

  @Provides
  fun provideCounter(): Counter {
    index++
    return Counter("Counter $index")
  }
}
```

These dependencies are all unscoped, along with the `AppComponent`. Knowing what we do about unscoped elements in a Dagger graph, predict the output of the following code:

```kotlin
class CounterApplication : Application() {
  private val TAG = "CounterApplication"

  override fun onCreate() {
    super.onCreate()
    val appComponent = DaggerAppComponent.builder()
      .appModule(AppModule())
      .build()
    Log.d(TAG, appComponent.getCounter().name)
    Log.d(TAG, appComponent.getCounter().name)
  }
}
```

Running this on a device will print the following in your logcat

```kotlin
D/CounterApplication: Counter 1
D/CounterApplication: Counter 2
```

Totally expected, because unscoped dependencies have no lifecycle in the component, and hence are created every time you ask for one. Let's make them all into Singletons and see how that changes things.

```diff
 data class Counter(val name: String)

+@Singleton
 @Component(modules = [AppModule::class])
 interface AppComponent {
   fun getCounter(): Counter
@@ -12,6 +13,7 @@ class AppModule {
   private var index = 0

   @Provides
+  @Singleton
   fun provideCounter(): Counter {
     index++
     return Counter("Counter $index")
```

Running the same code again, we get

```kotlin
D/CounterApplication: Counter 1
D/CounterApplication: Counter 1
```

Notice that we were handed the same instance. This is the power of scoping. It lets us have singletons within the defined scope.

Like Arun mentioned in the [additional notes](/posts/dagger-the-easy-way--part-1/#setting-up-the-object-graph) for the previous article, ensuring a singleton Component stays that way is the user's job. If you initialize the component again within the same scope, the new component instance will have a new set of instances. That is part of why we store our component in the [Application](https://developer.android.com/reference/android/app/Application.html) class, because it is the singleton for our apps.

## Creating our own scopes

In its most basic form, a scope is an annotation class that itself has two annotations, `@Scope` and `@Retention`. Assuming we follow an MVP architecture (purely for nomenclature purposes, scoping is not necessarily tied to your architecture), let's create a scope for our `CounterPresenter`.

```kotlin
@Scope
@Retention(AnnotationRetention.RUNTIME)
annotation class CounterScreenScope
```

Putting this annotation together with our presenter and our component, we finally get this:

```kotlin
@Scope
@Retention(AnnotationRetention.RUNTIME)
annotation class CounterScreenScope

data class Counter(val name: String)
class CounterPresenter(val counter: Counter)

@Module
class CounterScreenModule {
  @Provides
  @CounterScreenScope
  fun provideCounterPresenter(counter: Counter): CounterPresenter {
    return CounterPresenter(counter)
  }
}

@CounterScreenScope
@Subcomponent(modules = [CounterScreenModule::class])
interface CounterScreenComponent {
  fun inject(counterActivity: MainActivity)
}

@Singleton
@Component(modules = [AppModule::class])
interface AppComponent {
  fun counterScreenComponent(counterScreenModule: CounterScreenModule): CounterScreenComponent
}

@Module
class AppModule {
  private var index = 0
  @Provides
  fun getCounter(): Counter {
    index++
    return Counter("Counter $index")
  }
}
```

Phew, a lot happened there. Let's break it down.

```kotlin
class CounterPresenter(val counter: Counter)
```

This is simply a class that represents our presenter. We don't care much for implementation details here, so the class does nothing.

```kotlin
@Module
class CounterScreenModule {
  @Provides
  @CounterScreenScope
  fun provideCounterPresenter(counter: Counter): CounterPresenter {
    return CounterPresenter(counter)
  }
}
```

`CounterScreenModule` holds the provider method for our presenter. The method is annotated with `@CounterScreenScope` to indicate that we want to scope its lifetime to our screen. Rather than being an `object` like our `AppModule`, it's a `class` because we need to instantiate it manually later.

```kotlin
@Singleton
@Component(modules = [AppModule::class])
interface AppComponent {
  fun counterScreenComponent(counterScreenModule: CounterScreenModule): CounterScreenComponent
}
```

To our `AppComponent`, we've simply added a method to provide the `CounterScreenComponent`.

```kotlin
@CounterScreenScope
@Subcomponent(modules = [CounterScreenModule::class])
interface CounterScreenComponent {
  fun inject(counterActivity: MainActivity)
}
```

`CounterScreenComponent` is a [Subcomponent](https://dagger.dev/api/latest/dagger/Subcomponent.html). In simple, OOP terms, it's a Component that inherits from another Component. A Subcomponent can only have one parent, and the Subcomponent doesn't get to pick who, much like real life :P

The parent Component is responsible for ensuring that all the dependencies of a Subcomponent are available, other than modules.

## Putting it all together

After setting up our Dagger graph, instantiating everything becomes pretty easy.

```kotlin
class MainActivity : AppCompatActivity() {

  @Inject
  lateinit var presenter: CounterPresenter

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
      setContentView(R.layout.activity_main)

      val appComponent = DaggerAppComponent.builder()
        .appModule(AppModule())
        .build()

      val counterScreenComponent = appComponent
        .counterScreenComponent(CounterScreenModule())
      counterScreenComponent.inject(this)
      Log.d(TAG, presenter.counter.name)
  }

  companion object {
    private const val TAG = "MainActivity"
  }
}
```

Thanks to how our graph is laid out, it is very easy to get subcomponent instances from our parent components.

## Alternative initialization

We can also use a `@Subcomponent.Factory` for `CounterScreenComponent` to initialize it in a fashion similar to our `AppComponent` from the previous part. The diff from this change goes something like this:

```diff
diff --git app/src/main/java/dev/msfjarvis/daggertutorial/MainActivity.kt app/src/main/java/dev/msfjarvis/daggertutorial/MainActivity.kt
index 4271d151da6e..425e8358902c 100644
--- app/src/main/java/dev/msfjarvis/daggertutorial/MainActivity.kt
+++ app/src/main/java/dev/msfjarvis/daggertutorial/MainActivity.kt
@@ -23,7 +23,8 @@ class MainActivity : AppCompatActivity() {
             .build()

         val counterScreenComponent = appComponent
-            .counterScreenComponent(CounterScreenModule())
+            .counterScreenComponentFactory
+            .create(CounterScreenModule())
         counterScreenComponent.inject(this)
         Log.d(TAG, presenter.counter.name)
     }
diff --git app/src/main/java/dev/msfjarvis/daggertutorial/di/AppComponent.kt app/src/main/java/dev/msfjarvis/daggertutorial/di/AppComponent.kt
index 2fb831771ee8..72acea6f6f43 100644
--- app/src/main/java/dev/msfjarvis/daggertutorial/di/AppComponent.kt
+++ app/src/main/java/dev/msfjarvis/daggertutorial/di/AppComponent.kt
@@ -1,5 +1,6 @@
 package dev.msfjarvis.daggertutorial.di

+import dagger.BindsInstance
 import dagger.Component
 import dagger.Module
 import dagger.Provides
@@ -28,12 +29,16 @@ class CounterScreenModule {
 @Subcomponent(modules = [CounterScreenModule::class])
 interface CounterScreenComponent {
     fun inject(counterActivity: MainActivity)
+    @Subcomponent.Factory
+    interface Factory {
+        fun create(@BindsInstance counterScreenModule: CounterScreenModule): CounterScreenComponent
+    }
 }

 @Singleton
 @Component(modules = [AppModule::class])
 interface AppComponent {
-    fun counterScreenComponent(counterScreenModule: CounterScreenModule): CounterScreenComponent
+    val counterScreenComponentFactory: CounterScreenComponent.Factory
 }

 @Module
```

## Closing Notes

That's it for this tutorial! Scoping is a rather complex concept, and it took me a long (really, really long) time to grasp its concepts and put this together. Its perfectly fine to not understand it immediately, take your time, and refer to one of the reference articles that I used (listed below) to see if maybe their explanations work better for you. Dagger away!

### References

- [Dagger 2: Scopes and Subcomponents](https://medium.com/tompee/dagger-2-scopes-and-subcomponents-d54d58511781)
- [Dagger User's Guide](https://dagger.dev/users-guide)
- [Dependency injection with Dagger 2 - Custom scopes](https://mirekstanek.online/dependency-injection-with-dagger-2-custom-scopes/)
