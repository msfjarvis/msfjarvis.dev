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

\`\`\`java

class Example {

    private final String name;

    Example(String name) {

        this.name = name;

    }

}

\`\`\`  
  
\`\`\`kotlin

class Example(val name: String)

\`\`\`