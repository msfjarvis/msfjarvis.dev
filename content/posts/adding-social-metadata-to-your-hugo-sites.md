+++
categories = ["hugo"]
date = 2020-02-03T09:32:38+05:30
draft = true
slug = "adding-social-metadata-to-your-hugo-sites"
tags = ["hugo", "webdev", "static sites"]
title = "Adding social metadata to your Hugo sites"
description = "Optimize social media exposure with the right metadata for your site"
+++

Metadata is data (information) about data.

The `<meta>` tag provides metadata about the HTML document. Metadata will not be displayed on the page, but will be machine parsable.

This metadata can be used by browsers (how to display content or reload page), search engines (keywords), or other web services.

The difference between

![No metadata](/uploads/hugo_metadata_no_meta.png)

and

![Correct metadata](/uploads/hugo_metadata_correct_meta.png)

is just metadata!

## Automatically adding social metadata to Hugo sites

After coming across [this list](https://github.com/budparr/awesome-hugo#theme-components) I realized theme components was a thing so I've extracted my [social metadata commit](https://github.com/msfjarvis/msfjarvis.dev/commit/cc08039a6b4a6b649bdd8710295383d2388c9955) into a separate component for re-use by the community.
