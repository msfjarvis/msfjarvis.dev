#!/bin/bash

set -euo pipefail

base_template="
+++
date = \"%s\"
title = \"%s\"
slug = \"%s\"
tags = []
categories = []
+++
"

function create_post() {
    local title filename postslug postdate
    title="${1}"
    postdate="$(date +"%Y-%m-%d")"
    postslug="$(echo ${title:?} | tr -dc '[:alnum:][:space:]\n\r' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
    filename="${postslug}.md"
    printf "${base_template}" "${postdate}" "${title}" "${postslug}" > content/posts/"${filename}"
}

create_post "${@}"

