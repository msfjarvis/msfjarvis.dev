#!/usr/bin/env bash

set -euo pipefail

function create_post() {
  local title postslug postdate
  if [ $# -lt 1 ]; then
    echo -e "\033[01;31mProviding a title is a must!\033[0m"
    return
  else
    title="${*}"
  fi
  postdate="$(date +"%Y-%m-%dT%H:%M:%S%:z")"
  postslug="$(echo "${title}" | tr -dc '[:alnum:][:space:]\n\r' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
  [ -z "$postslug" ] && {
    echo -e "\033[01;31mProviding a title is a must!\033[0m"
    return
  }
  mkdir -p content/posts/"${postslug}"
  printf "+++\ncategories = []\ndate = %s\nlastmod = %s\nsummary = \"\"\ndraft = true\nslug = \"%s\"\ntags = []\ntitle = \"%s\"\n+++\n" "${postdate}" "${postdate}" "${postslug}" "${title}" >content/posts/"${postslug}"/index.md
  echo "content/posts/${postslug} created!"
}

create_post "${@}"
