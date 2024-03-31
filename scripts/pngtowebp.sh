#!/usr/bin/env bash

set -euo pipefail

function convert_to_webp() {
  local DIR
  DIR="${1}"
  fd -tf png$ "${DIR:?}" -x cwebp -lossless -mt {} -o '{.}.webp'
  fd -tf png$ "${DIR:?}" -X rm -v
}

convert_to_webp static/uploads
convert_to_webp content/posts
