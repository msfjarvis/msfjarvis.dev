+++
categories = ["kotlin", "dev", "android", "teachingkotlin"]
date = "2019-09-30T15:00:00+05:30"
draft = true
slug = "teaching-kotlin--variables"
tags = ["android", "teachingkotlin", "kotlin"]
title = "#TeachingKotlin Part 2 - Variables"

+++

Even the variables in Kotlin are supercharged!

Let's start with a simple [data class](https://kotlinlang.org/docs/reference/data-classes.html#data-classes) and see how the variables in there behave.

``` kotlin
data class Student(val name: String, val age: Int, val subjects: ArrayList<String>)
```

To use the variables in this class, Kotlin let's you directly use the dot notation for accessing.

``` kotlin

>>> val s1 = Student("Keith Hernandez", 21, arrayListOf("Mathematics", "Social Studies"))
>>> println(s1.name)

Keith Hernandez

>>> println(s1) // data classes automatically generate `toString` and `hashCode` 

Student(name=Keith Hernandez, age=21, subjects=[Mathematics, Social Studies])
```

For Java callers, Kotlin also generates getters and setter methods.

``` java
final Student s1 = new Student("Keith Hernandez", 21, arrayListOf("Mathematics", "Social Studies"));
System.out.println(s1.getName());
System.out.println(s1);
```

The same properties apply to variables in non-data classes as well.

``` kotlin

>>> class Item(id: Int, name: String) {

...     val itemId = id
...     val itemName = name
... }

>>> val item = Item(0, "Bricks")
>>> println(item.itemId)

0

>>> println(item)

Line_4$Item@46fb460a

>> >

```

As you can notice, the `toString` implementation is not identical to our data classes but that's a topic for another post. Back to variables!

## Customising getters and setters

While Kotlin creates getters and setters automatically, we can customize their behaviour.

``` kotlin
class Item(id: Int, name: String) {
    var itemId = id
    var itemName = name
    var currentState: Pair<Int, String> = Pair(itemId, itemName)
        set(value) {
            itemId = value.first
            itemName = value.second
            field = value
        }
    override fun toString() : String {
        return "id=$itemId,name=$itemName"
    }
}
```

Let's take this for a spin in the Kotlin REPL and see how our `currentState` field behaves.

```kotlin
>>> val item = Item(0, "Nails")
>>> println(item)
id=0,name=Nails
>>> item.currentState = Pair(1, "Bricks")
>>> println(item)
id=1,name=Bricks
```

Notice how setting a new value to currentState mutates the other variables as well? That's because of our custom setter. These setters are identical to a normal top-level function except a reference to the field in question is available as the variable `field` for manipulation.

## Visiblity modifiers
