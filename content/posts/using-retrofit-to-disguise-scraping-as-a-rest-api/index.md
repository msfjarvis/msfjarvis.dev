---
title: Using Retrofit to disguise scraping as a REST API
date: 2023-09-13T07:08:10.659Z
summary: We've all used Retrofit to interact with REST APIs for as long as we
  can remember, but what if there was no API?
draft: true
---

Square's Retrofit is best known for being the gold standard of REST clients in the JVM/Android ecosystem, but it's excellent API design also lends itself to great extensibility which we will leverage today.

While trying to implement post search functionality in [Claw](https://msfjarvis.dev/g/compose-lobsters), my [lobste.rs](https://lobste.rs) client I stumbled into a _tiny_ problem: there was no API! lobste.rs has a [web-based search](https://lobste.rs/search) but no equivalent mechanism via the JSON API I was using for doing everything else within the app.

The search page uses URL query parameters to specify the search term which made it quite easy to reliably construct a URL which would contain the posts we were interested in, and it looked something like this: `/search?q={query}&what=stories&order=newest&page={page}`.

Retrofit has a [Converter](https://github.com/square/retrofit/blob/40c4326e2c608a07d2709bfe9544cb1d12850d11/retrofit/src/main/java/retrofit2/Converter.java) API which lets users convert request/response bodies to and from their HTTP representations. We will leverage this to convert the raw HTML body we will receive from the search page into a list of LobstersPost objects.
