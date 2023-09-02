---
title: Using Retrofit to disguise scraping as a REST API
date: 2023-09-02T21:05:24.630Z
summary: We've all used Retrofit to interact with REST APIs for as long as we
  can remember, but what if there was no API?
draft: true
---
While trying to implement post search functionality in [Claw](https://msfjarvis.dev/g/compose-lobsters), my [lobste.rs](https://lobste.rs) client I stumbled into a _tiny_ problem: there was no API! lobste.rs has a [web-based search](https://lobste.rs/search) but no equivalent mechanism via the JSON API I was using for doing everything else within the app.

Thankfully, lobste.rs has a fairly JavaScript-free front-end which makes it a suitable candidate for HTML scraping. The search page used URL query parameters to specify the search term which made it quite easy to reliably construct a URL which would contain the posts we were interested in and it looked something like this: `/search?q={query}&what=stories&order=newest&page={page}`.

However, with a little [Jsoup](https://jsoup.org) and Retrofit's [Converter](https://github.com/square/retrofit/blob/40c4326e2c608a07d2709bfe9544cb1d12850d11/retrofit/src/main/java/retrofit2/Converter.java) API it became relatively easy to implement this feature without the rest of the app being able to tell that it was not backed by REST.

