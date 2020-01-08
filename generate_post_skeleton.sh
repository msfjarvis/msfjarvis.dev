#!/bin/bash

set -euo pipefail

function create_post() {
    local title filename postslug postdate
    if [ $# -lt 1 ]; then
        echo -e "\033[01;31mProviding a title is a must!\033[0m"
        return
    else
        title="${*}"
    fi
    postdate="$(date -Is)"
    postslug="$(echo "${title}" | tr -dc '[:alnum:][:space:]\n\r' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
    filename="${postslug}.md"
    printf "+++\ncategories = []\ndate = %s\ndraft = true\nslug = \"%s\"\ntags = []\ntitle = \"%s\"\n+++\n" "${postdate}" "${postslug}" "${title}" > content/posts/"${filename}"
    echo "content/posts/${filename} created!"
}

create_post "${@}"
