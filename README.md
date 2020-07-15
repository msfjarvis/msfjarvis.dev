## Codex

A minimal blog theme built for [Hugo](https://gohugo.io/) 🍜

![Hugo desktop screenshot](/images/screenshot.png)

- An about page 👋🏻 and a blog 📝
- Blog posts can be tagged 🏷
- Mathematical notations are supported with KaTex 📐
- Sass/SCSS for styling ✨
- Support for Google Analytics 📈 and Disqus 💬

### Prerequisites

Hugo **extended version** (for Sass/SCSS support).

For macOS users, the extended version is installed by default if you use `homebrew`.

For Windows users, you can install with `choco`:
```
choco install hugo-extended -confirm
```

### Getting started

At the root of your Hugo project, run:

```bash
git submodule add https://github.com/jakewies/hugo-theme-codex.git themes/hugo-theme-codex
```

Next, copy the contents of the [`exampleSite/config.toml`](https://github.com/jakewies/hugo-theme-codex/blob/master/exampleSite/config.toml) to your site's `config.toml`. Make sure to read all the comments, as there a few nuances with Hugo themes that require some changes to that file.

The most important change you will need to make to the `config.toml` is removing [this line](https://github.com/jakewies/hugo-theme-codex/blob/master/exampleSite/config.toml#L2):

```
themesDir = "../../" 
```

It only exists in the example site so that the demo can function properly.

Finally, run:

```
hugo server -D 
```

**Note: If you are seeing a blank page it is probably because you have nothing in your `content/` directory. Read on to fix that.**

### Configuring the Home Page

The site's home page can be configured by creating a `content/_index.md` file. This file can use the following frontmatter:

```md
---
heading: "Hi, I'm Codex"
subheading: "A minimal blog theme for hugo."
handle: "hugo-theme-codex"
---
```

If you would rather override the about page's layout with your own, you can do so by creating a `layouts/index.html`. You can find the `index.html` file that `hugo-theme-codex` uses [here](https://github.com/jakewies/hugo-theme-codex/blob/master/layouts/index.html).

### Configuring Social Icons

Social Icons are optional. To show any of these icons, just provide the value in the `[params]` section of `config.toml`.

```toml
# config.toml

[params]
  twitter = "https://twitter.com/GoHugoIO"
  github = "https://github.com/jakewies/hugo-theme-codex"
  # ...

  iconTitles = ["Twitter", "GitHub"]
```

If any of these options are given, `hugo-theme-codex` will render the social icon in the footer, using the order specified in `iconTitles`.

See the contents of the [example site](https://github.com/jakewies/hugo-theme-codex/tree/master/exampleSite) for more details.

You can also create additional social icons by:
1. Adding your own SVGs in `static/svg/`, for example `static/svg/reddit.svg`.
2. Modifying your site's config as follows:
   ```toml
   [params]
      # ...
      reddit = "<url to your reddit>"
   
      iconTitles = ["Reddit"]
   ```

Make sure that the icon title must match the icon's file name. If the title contains more than one word, say "My Awesome Site",
you can use dash "-" for the icon name: `my-awesome-site.svg`. 

### Creating a blog post

You can create a new blog post page by going to the root of your project and typing:

```
hugo new blog/:blog-post.md
```

Where `:blog-post.md` is the name of the file of your new post. 

This will execute the theme's `blog` archetype to create a new markdown file in `contents/blog/:blog-post.md` with the following frontmatter:

```md
# Default post frontmatter:

# The title of your post. Default value is generated
# From the markdown filename
title: "{{ replace .TranslationBaseName "-" " " | title }}"
# The date the post was created
date: {{ .Date }}
# The post filename
slug: ""
# Post description used for seo
description: ""
# Post keywords used for seo
keywords: []
# If true, the blog post will not be included in static build
draft: true
# Categorize your post with tags
tags: []
# Uses math typesetting
math: false
# Includes a table of contents on screens >1024px
toc: false
```

The frontmatter above is the default for a new post, but all values can be changed.

### Adding a new section menu

In your site's `config.toml`, add a new menu definition for say, "photos":
```toml
# config.toml

[[menu.main]]
    identifier = "photos"
    name = "photos"
    title = "Photos"
    url = "/photos"
```

Then, put your posts under "content/photos". 

### Custom styling

In your site's folder, create `assets/scss/custom.scss` and put your custom styling there. For example, the snippet below 
changes the dot's color on your About page to blue:

```scss
// custom.scss
.fancy {
  color: #1e88e5;
}
```

You can even use Hugo variables/params in your custom styles too!

```scss
// custom.scss
.fancy {
  color: {{ .Site.Params.colors.fancy | default "#1e88e5" }}
}
```

```toml
# config.toml
[params.colors]
    fancy = "#f06292"
```

### Tags

Right now `hugo-theme-codex` uses the `tags` taxonomy for blog posts. You can view all the blog posts of a given tag by going to `/tags/:tag-name`, where `:tag-name` is the name of your tag.

### Favicon

To update favicon of the site, replace the one in `static/favicon.ico` with your own.

## Contributing

Check out the [CONTRIBUTORS.md file](https://github.com/jakewies/hugo-theme-codex/blob/master/CONTRIBUTING.md) for more info on how you can contribute!

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-10-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://www.jakewiesler.com"><img src="https://avatars1.githubusercontent.com/u/12075916?v=4" width="100px;" alt=""/><br /><sub><b>Jake Wiesler</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=jakewies" title="Code">💻</a> <a href="#design-jakewies" title="Design">🎨</a> <a href="https://github.com/jakewies/hugo-theme-codex/commits?author=jakewies" title="Documentation">📖</a></td>
    <td align="center"><a href="https://www.chuxinhuang.com/"><img src="https://avatars2.githubusercontent.com/u/30974572?v=4" width="100px;" alt=""/><br /><sub><b>Chuxin Huang</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=chuxinh" title="Documentation">📖</a> <a href="https://github.com/jakewies/hugo-theme-codex/commits?author=chuxinh" title="Code">💻</a> <a href="#design-chuxinh" title="Design">🎨</a></td>
    <td align="center"><a href="https://kentnek.com"><img src="https://avatars1.githubusercontent.com/u/7024160?v=4" width="100px;" alt=""/><br /><sub><b>Kent</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=kentnek" title="Code">💻</a> <a href="https://github.com/jakewies/hugo-theme-codex/commits?author=kentnek" title="Documentation">📖</a> <a href="#design-kentnek" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/somaniarushi"><img src="https://avatars3.githubusercontent.com/u/54224195?v=4" width="100px;" alt=""/><br /><sub><b>Arushi Somani</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=somaniarushi" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/xvallspl"><img src="https://avatars0.githubusercontent.com/u/867299?v=4" width="100px;" alt=""/><br /><sub><b>Xavier Valls</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=xvallspl" title="Documentation">📖</a> <a href="https://github.com/jakewies/hugo-theme-codex/commits?author=xvallspl" title="Code">💻</a> <a href="#design-xvallspl" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/pyvain"><img src="https://avatars3.githubusercontent.com/u/2924494?v=4" width="100px;" alt=""/><br /><sub><b>Pyvain</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=pyvain" title="Code">💻</a> <a href="https://github.com/jakewies/hugo-theme-codex/commits?author=pyvain" title="Documentation">📖</a></td>
    <td align="center"><a href="http://jlebar.com"><img src="https://avatars1.githubusercontent.com/u/150663?v=4" width="100px;" alt=""/><br /><sub><b>Justin Lebar</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=jlebar" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.aareet.com"><img src="https://avatars1.githubusercontent.com/u/33654?v=4" width="100px;" alt=""/><br /><sub><b>Aareet Shermon</b></sub></a><br /><a href="#design-aareet" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/dgnicholson"><img src="https://avatars1.githubusercontent.com/u/6208288?v=4" width="100px;" alt=""/><br /><sub><b>dgnicholson</b></sub></a><br /><a href="#design-dgnicholson" title="Design">🎨</a></td>
    <td align="center"><a href="https://msfjarvis.dev"><img src="https://avatars0.githubusercontent.com/u/13348378?v=4" width="100px;" alt=""/><br /><sub><b>Harsh Shandilya</b></sub></a><br /><a href="https://github.com/jakewies/hugo-theme-codex/commits?author=msfjarvis" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
