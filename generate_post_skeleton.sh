#!/bin/bash

set -euo pipefail

function create_post() {
    local title filename postslug postdate
    if [ $# -lt 1 ]; then
        echo -e "\033[01;31mProviding a title is a must!\033[0m"
        return
    else
        title="${@}"
    fi
    postdate="$(date +"%Y-%m-%d")"
    postslug="$(echo "${title}" | tr -dc '[:alnum:][:space:]\n\r' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
    filename="${postslug}.md"
    printf "+++\ndate = \"%s\"\ntitle = \"%s\"\nslug = \"%s\"\ntags = []\ncategories = []\n+++\n" "${postdate}" "${title}" "${postslug}" > content/posts/"${filename}"
}

create_post "${@}"

