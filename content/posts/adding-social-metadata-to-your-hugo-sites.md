+++
categories = ["hugo"]
date = 2020-02-03T09:32:38+05:30
draft = true
slug = "adding-social-metadata-to-your-hugo-sites"
tags = ["hugo", "webdev", "static sites"]
title = "Adding social metadata to your Hugo sites"
description = "Optimize social media exposure with the right metadata for your site"
socialImage = "uploads/hugo_metadata_social.png"
+++

Metadata is data (information) about data.

The `<meta>` tag provides metadata about the HTML document. Metadata will not be displayed on the page, but will be machine parsable.

This metadata can be used by browsers (how to display content or reload page), search engines (keywords), or other web services.

Here's how your website will look like on Twitter with and without metadata.

![No metadata](/uploads/hugo_metadata_no_meta.png)

![Correct metadata](/uploads/hugo_metadata_correct_meta.png)

You be the judge of what you like better :)

## Automatically adding social metadata to Hugo sites

After coming across [this list](https://github.com/budparr/awesome-hugo#theme-components) I realized theme components was a thing so I've extracted my [social metadata commit](https://github.com/msfjarvis/msfjarvis.dev/commit/cc08039a6b4a6b649bdd8710295383d2388c9955) into a separate component for re-use by the community. It's available on GitHub at [msfjarvis/hugo-social-metadata](https://github.com/msfjarvis/hugo-social-metadata). The README goes through the installation steps so here I will simply cover what the component is actually adding. Here's the generated metadata for this very post.

```html
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@msf_jarvis" />
<meta name="description" content="Optimize social media exposure with the right metadata for your site" />
<meta name="keywords" content="hugo,webdev,static sites," />
<meta property="og:url" content="https://msfjarvis.dev/posts/adding-social-metadata-to-your-hugo-sites/" />
<meta property="og:title" content="Adding social metadata to your Hugo sites &middot; Harsh Shandilya" />
<meta name="twitter:title" content="Adding social metadata to your Hugo sites &middot; Harsh Shandilya" />
<meta name="og:description" content="Optimize social media exposure with the right metadata for your site" />
<meta name="twitter:description" content="Optimize social media exposure with the right metadata for your site" />
<meta name="twitter:url" content="https://msfjarvis.dev/posts/adding-social-metadata-to-your-hugo-sites/" />
<meta name="twitter:image:src" content="android-chrome-512x512.webp" />
```

- `og:type` - Allowed values are specified at the OpenGraph protocol's documentation [here](https://ogp.me/#types). I use `website` to reflect the content I serve.
- `twitter:card` - One of `summary`, `summary_large_image`, `app`, or `player`. `summary_large_image` indicates that I want to see a social image as well as the description I provide when this is rendered on Twitter.
- `twitter:site` - Twitter username of the owner of this website.
- `description` - HTML5 tag that describes the content of this page. The content of this can be replicated in `og:description` and `twitter:description` to satisfy Facebook and Twitter respectively.
- `og:url` and `twitter:url` - Permalink to the content that this page is for. You can use this to provide a link with tracking related metadata to track social origins.
- `og:title` and `twitter:title` - Title of the page as you want it to be shown on social media.
- `twitter:image:src` - Absolute link to an image that will be used in your Twitter card.
