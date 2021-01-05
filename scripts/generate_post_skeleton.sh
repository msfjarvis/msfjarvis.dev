#!/usr/bin/env bash

set -euxo pipefail

function create_post() {
    local title filename postslug postdate
    if [ $# -lt 1 ]; then
        echo -e "\033[01;31mProviding a title is a must!\033[0m"
        return
    else
        title="${*}"
    fi
    postdate="$(date +%Y-%m-%d)"
    postslug="$(echo "${title}" | tr -dc '[:alnum:][:space:]\n\r' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
    [ -z "$postslug" ] && {
        echo -e "\033[01;31mProviding a title is a must!\033[0m"
        return
    }
    filename="${postslug}.md"
    printf "+++\ncategories = []\ndate = %s\ndescription = \"\"\ndraft = true\nslug = \"%s\"\ntags = []\ntitle = \"%s\"\n+++\n" "${postdate}" "${postslug}" "${title}" > content/posts/"${filename}"
    echo "content/posts/${filename} created!"
}

create_post "${@}"
