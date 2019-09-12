#!/usr/bin/env bash

get_latest_release() {
    curl --silent "https://api.github.com/repos/${1:?}/releases/latest" | jq -r .tag_name
}

update_assets() {
    wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/"${FA_VERSION}"/css/all.min.css -O static/css/fontawesome-"${FA_VERSION}"-all.min.css

    sed -i 's|..\/webfonts|..\/fonts|g' static/css/fontawesome-"${FA_VERSION}"-all.min.css
    sed -i "s|fontawesome-${CUR_FA_VERSION}-all.min.css|fontawesome-${FA_VERSION}-all.min.css|" layouts/partials/head.html

    rm -v static/css/fontawesome-"${CUR_FA_VERSION}"-all.min.css 2>/dev/null

    for font in fa-solid-900.woff fa-brands-400.woff fa-solid-900.woff2 fa-brands-400.woff2; do
        wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/"${FA_VERSION}"/webfonts/"${font}" -O static/fonts/"${font}"
    done
}

CUR_FA_VERSION=5.10.2
FA_VERSION="$(get_latest_release FortAwesome/Font-Awesome)"

if [ "${CUR_FA_VERSION}" == "${FA_VERSION}" ]; then
    echo "FontAwesome is already up-to-date"
    exit 0
else
    update_assets
fi
