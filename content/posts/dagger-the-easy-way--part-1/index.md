+++
categories = ["android"]
date = "2020-01-20T12:00:00+05:30"
devLink = "https://dev.to/msfjarvis/dagger-the-easy-way-part-1-3l7b"
lastmod = "2020-01-20T12:00:00+05:30"
slug = "dagger-the-easy-way--part-1"
summary = "Dagger is universally intimidating to beginners and I want to change it."
tags = ["dagger", "tutorial"]
title = "Dagger the easy way - Part 1"
+++

> Updated on 22 Jan 2020 with some additional comments from [@arunkumar_9t2](https://twitter.com/arunkumar_9t2). Look out for them as block quotes similar to this one.

This is not your average coding tutorial. I'm going to show you how to write actual Dagger code and skip all the scary and off-putting parts about the implementation details of the things we're using and how Dagger does everything under the hood.

With that out of the way, onwards to the actual content. We're going to be building a very simple app that does just one thing, show a Toast with some text depending on whether it was the first run or not. Nothing super fancy here, but with some overkill abstraction I'll hopefully be able to demonstrate a straightforward and understandable use of Dagger.

I've setup a repository at [msfjarvis/dagger-the-easy-way](https://github.com/msfjarvis/dagger-the-easy-way) that shows every logical collection of changes in its own separate commit, and also a PR to go from no DI to Dagger so you can browse changes in bulk as well.

## The mandatory theory

I know what I said, but this is just necessary. Bear with me.

### `Component`

A Component defines an interface that Dagger constructs to know the entry points where dependencies can be injected. It can also hold the component factory that instructs Dagger how to construct said component. A Component _also_ holds the list of modules.

### `Module`

A Module is any logical unit that contributes to Dagger's object graph. In simpler terms, any `class` or `object` that has declarations which tell Dagger how to construct a particular dependency, is annotated with `@Module`.

> _Arun's notes_
>
> Modules should be mentioned first here, as they're the smallest units of a Dagger setup, and Components build upon them. An alternate definition for a module can also be this: if we draw a graph, methods in @Module classes become the nodes and @Component is the holder of those nodes.

## Getting Started

To get started, clone the repository which contains all the useless grunt work already done for you. Use `git clone https://github.com/msfjarvis/dagger-the-easy-way` if you're unfamiliar with branch selection during clone.

The repo in this stage is very bare - it has the usual boilerplate and just one class, `MainActivity`. We're going to make this a bit more interesting shortly.

Switch to the `part-1` branch, which has a bit more in terms of commit history and code. This is what we're going to work with.

## Setting up the object graph

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

> _Arun's notes_
>
> Annotating with @Singleton is only effective when configured properly. For this to be a singleton, you need to ensure you're creating this only once and that's your responsibility to fulfill. This is part of scoping and is a great topic to be covered in part 2.

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

If you pay attention to the [commit](https://github.com/msfjarvis/dagger-the-easy-way/commit/f1a60ffaf6f07f8654bde27fbd65bef08c248f4e) for this step, you'll see that we're also adding preferences to the `AppComponent`. This is just one of the many different patterns one can use with Dagger, and I'm using it just for the simplicity. We'll look into another way of doing this for the next part.

## Initializing our component

Now for Dagger to know when to create this graph, it needs to be able to know how to initialize the `Component` we wrote earlier. For this, we'll be adding a factory that constructs the `AppComponent`. Since we need a Context to be able to create `SharedPreferences`, we'll make our factory accept a context parameter.

> _Arun's notes_
>
> Worth nothing that the reason we create a factory method accepting Context instead of letting Dagger provide is because we don't have hold of Context during compile time. The instance is created by Android system and given to us which we then use Factory to give it to dagger.

Here's how the finished `AppComponent` looks like with the factory method.

```kotlin
@Singleton
@Component(modules = [AppModule::class])
interface AppComponent {

    @Component.Factory
    interface Factory {
        fun create(@BindsInstance applicationContext: Context): AppComponent
    }

    val preferences: SharedPreferences
}
```

The `BindsInstance` annotation tells Dagger that we'll be providing our own Context and that it does not have to know how to create one.

As the parameter name suggests, we'll be using an application-scoped Context for this, so let's initialize the Component in an Application class. We'll be accessing our dependencies through this initialized component, and the Application class is always initialized first so that let's us avoid any situation where we try to refer to the component and find that it's null.

Create an Application class, make it extend `android.app.Application`, and add it to the manifest ( [Reference commit](https://github.com/msfjarvis/dagger-the-easy-way/commit/25d4dc223bfafd40ac9801e23ca9b09526ed9362)).

Now we'll be adding our component here. Since we'll be accessing it from other classes, we'll make it static. The Application class lives as long as our process does, so we're safe from a life-cycle perspective. Here's the finished `ExampleApplication` class.

```kotlin
class ExampleApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        component = DaggerAppComponent.factory().create(this)
    }
    companion object {
        lateinit var component: AppComponent
    }
}
```

> _Arun's notes_
>
> Nit: I like to do something like [this](https://github.com/arunkumar9t2/scabbard/blob/004116cf6a548022982c7869d7758725c18991f8/scabbard-sample/src/main/java/dev/arunkumar/scabbard/App.kt#L10). The reason is, since it is a val, it will not be editable and also lazy being lazy means it will cached.

Notice the `DaggerAppComponent` class that did not exist before. This is a Dagger generated version of our `AppComponent` interface that is suitable for instantiation. This class holds the factory method we created before, and returns an instance of `AppComponent` that let's us access the dependencies we installed into the component. When we initialize our component, Dagger also intelligently creates all the dependencies in our graph. Now all that's left for us is to use the dependencies we declared in our app.

## Injecting dependencies

Head on over to `MainActivity` now. Notice that we initialize a `SharedPreferences` object there, which can be replaced with the one we asked Dagger to create for us. Let's do that!

```diff
 class MainActivity : AppCompatActivity() {

+    private val prefs = ExampleApplication.component.preferences
+
     override fun onCreate(savedInstanceState: Bundle?) {
         super.onCreate(savedInstanceState)
         setContentView(R.layout.activity_main)
-        val prefs: SharedPreferences = PreferenceManager.getDefaultSharedPreferences(this)
         if (prefs.getBoolean("first_start", true)) {
             Toast.makeText(this, "First start!", Toast.LENGTH_LONG).show()
             prefs.edit().putBoolean("first_start", false).apply()
```

And that's it. Really. Now you're using Dagger to provide a dependency. It's that simple!

## Conclusion

As you've seen here, using Dagger does not always have to involve complexity. Dagger can be used in projects of any size, of any complexity, and in any fashion that you deem fit. The example above is a very simple use of Dagger, and has scope for further improvement which we'll be looking into.

This is my first time writing about using Dagger, having only [recently started using and liking it](/posts/my-dagger-story/). Please let me know about any parts that were too complex, factually incorrect or just lacking in any way, and I will be more than glad to improve this.

In the next part, we'll be looking into constructor injection, why it's generally better, and how to inject dependencies into classes that we don't own (like activities and fragments) with the help of the `@Inject` annotation. Thanks for reading this far!
