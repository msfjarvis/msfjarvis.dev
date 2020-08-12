#!/usr/bin/env bash
openring \
  -s https://stjepang.github.io/feed.xml \
  -s https://fasterthanli.me/index.xml \
  < openring/in.html \
  > layouts/partials/openring.html
