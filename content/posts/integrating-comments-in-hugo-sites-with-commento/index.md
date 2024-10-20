+++
categories = ["hugo", "webdev"]
date = "2020-01-20T12:00:00+05:30"
devLink = "https://dev.to/msfjarvis/integrating-comments-in-hugo-sites-with-commento-136f"
lastmod = "2020-01-20T12:00:00+05:30"
slug = "integrating-comments-in-hugo-sites-with-commento"
summary = "Adding additional comment backends to Hugo is actually rather simple!"
tags = ["static sites", "comments", "commento.io"]
title = "Integrating comments in Hugo sites with commento"
+++

Disqus is unequivocally the leader when it comes to hosted comments, and it works rather swimmingly with sites of all kinds with minimal hassle. But this ease has a gnarly flipside: [annoying referral links](https://stiobhart.net/2017-02-21-disqusting/) and a [huge bundle size](https://victorzhou.com/blog/replacing-disqus/) that significantly affects page load speeds.

As I was considering adding comments to this blog, I went through these posts and realised that Disqus is not going to be satisfactory enough, especially after the time and effort I put into improving bundle sizes and page loading. I started looking into the alternatives, and shortlisted [Isso](https://posativ.org/isso) and [Commento](https://commento.io/). Going through Isso documentation and [this post](https://stiobhart.net/2017-02-24-isso-comments/) it was clear that setup was going to be a bit of a chore, and that was the end of it.

Commento is open source just like Isso, but has a cloud-hosted option. I was interested in self-hosting, though, and I was glad to find that Commento delivered very well on that front too. [docker-compose](https://docs.commento.io/installation/self-hosting/on-your-server/docker.html#with-docker-compose) is an officially supported deployment method and I was pleased to see that setup went forward without a problem.

## Integrating with Hugo

The interesting part! Hugo offers a Disqus template internally, but any other comment system's going to need some legwork done. Commento's integration code is just two lines, as you can see below.

```html
<div id="commento"></div>
<script defer src="https://commento.example.com/js/commento.js"></script>
```

Hugo offers a powerful tool called [partials](https://gohugo.io/templates/partials/#use-partials-in-your-templates) that allows injecting code into pages from another HTML file. I quickly created a partial with the integration code, scoped out the domain with a variable, and ended up with this.

```html
<div id="commento"></div>
<script defer src="{{ .Site.Params.CommentoURL }}/js/commento.js"></script>
<noscript>Please enable JavaScript to load the comments.</noscript>
```

With this saved as `layouts/partials/commento.html` and `CommentoURL` set in my `config.toml`, I set out to wire this into the posts. Because of a [pre-existing hack](https://github.com/msfjarvis/msfjarvis.dev/commit/5447bb36258934d6a5bc86be99ef91a9eeb9eb17) that I use for linkifying headings, I already had the `single.html` file from my theme copied into `layouts/_default/single.html`. If you don't, copy it over and open it. Add the following lines, removing any mention of Disqus if you find it.

```go
{{ if and .Site.Params.CommentoURL (and (not .Site.BuildDrafts) (not hugo.IsServer)) -}}
<h2>Comments</h2>
{{ partial "commento.html" . }}
{{- end }}
```

With this, the comments section is only loaded when CommentoURL is defined, and the site is not running in server mode. This allows me to exclude showing comments when using the preview server on [Forestry](https://forestry.io) (highly recommended CMS for Hugo, by far my personal favorite). Since I also have a copy of my site with drafts enabled hosted on a separate subdomain, I had to factor that into the partial as well. Here's what I deploy on my own website.

```go
{{ if and .Site.Params.CommentoURL (and (not .Site.BuildDrafts) (not hugo.IsServer)) -}}
<!-- Rest is identical to the previous -->
```

And that's it! Now you should have a fully functioning comment system on your static sites that does not bloat the bundle size unnecessarily.

P.S. If anybody's interested to have me cover the template language for Hugo (conditionals, loops and the like), put it down in the comments :P
