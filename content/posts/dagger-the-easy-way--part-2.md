+++
categories = ["android"]
date = 2020-01-31T11:18:15+05:30
draft = true
slug = "dagger-the-easy-way--part-2"
tags = ["android", "dagger", "tutorial"]
title = "Dagger the easy way - Part 2"
description = "Let's extend the \"scope\" of these tutorials :)"
+++

Welcome back! In this post I'm taking a bit of detour from my planned schedule to write about **scoping**. We'll _definitely_ cover constructor injection in the next part :)

Dagger 2 provides `@Scope` as a mechanism to handle scoping. Scoping allows you to keep an object instance for the duration of your scope.

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

I'll do a small demo to show the difference between unscoped and singleton dependencies, then we'll move on to defining our own scopes.

```kotlin
// AppComponent.kt

data class Warrior(val name: String)

@Component(modules = [AppModule::class])
interface AppComponent {
  fun getWarrior(): Warrior
}

@Module
class AppModule {
  private var index = 0

  @Provides
  fun provideWarrior(): Warrior {
    index++
    return Warrior("Warrior $index")
  }
}
```

These dependencies are all unscoped, along with the `AppComponent`. Knowing what we do about unscoped elements in a Dagger graph, predict the output of the following code:

```kotlin
class WarriorApplication : Application() {
  private val TAG = "WarriorApplication"

  override fun onCreate() {
    super.onCreate()
    val appComponent = DaggerAppComponent.builder()
      .appModule(AppModule())
      .build()
    Log.d(TAG, appComponent.getWarrior().name)
    Log.d(TAG, appComponent.getWarrior().name)
  }
}
```

Running this on a device will print the following in your logcat

```html
D/WarriorApplication: Warrior 1 D/WarriorApplication: Warrior 2
```

Totally expected, because unscoped dependencies have no lifecycle in the component, and hence are created every time you ask for one. Let's make them all into Singletons and see how that changes things.

```diff
 data class Warrior(val name: String)

+@Singleton
 @Component(modules = [AppModule::class])
 interface AppComponent {
   fun getWarrior(): Warrior
@@ -12,6 +13,7 @@ class AppModule {
   private var index = 0

   @Provides
+  @Singleton
   fun provideWarrior(): Warrior {
     index++
     return Warrior("Warrior $index")
```

Running the same code again, we get

```html
D/WarriorApplication: Warrior 1
D/WarriorApplication: Warrior 1
```

Notice that we were handed the same instance. This is the power of scoping. It lets us have singletons within the defined scope.

Like Arun mentioned in the [additional notes](/posts/dagger-the-easy-way-part-1/#setting-up-the-object-graph) for the previous article, ensuring a singleton Component stays that way is the user's job. If you initialize the component again within the same scope, you'll get a new set of dependencies. That is part of why we store our component in the [Application](https://developer.android.com/reference/android/app/Application.html) class, because it is the singleton for our apps.

### References

- [Dagger 2: Scopes and Subcomponents](https://medium.com/tompee/dagger-2-scopes-and-subcomponents-d54d58511781)
- [Dagger user's guide](https://dagger.dev/users-guide)
