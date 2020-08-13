#!/usr/bin/env bash
openring \
  -s https://stjepang.github.io/feed.xml \
  -s https://fasterthanli.me/index.xml \
  -s https://deterministic.space/feed.xml \
  -s https://adambennett.dev/index.xml \
  -s https://chris.banes.dev/atom.xml \
  -s https://jakewharton.com/feed.xml \
  -s https://joebirch.co/feed/ \
  -s https://publicobject.com/rss/ \
  -s https://mrandri19.github.io/feed.xml \
  -s https://blog.jessfraz.com/index.xml \
  < openring/in.html \
  > layouts/partials/openring.html
