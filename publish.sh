#! /usr/bin/env bash

git push origin src
git_hash=$(git rev-parse --short HEAD)
hugo
cd public
git add .
git commit --signoff --gpg-sign -m "Rebuild at ${git_hash}"
git push origin master