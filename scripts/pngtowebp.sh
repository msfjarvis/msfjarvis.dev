#!/usr/bin/env bash

set -euxo pipefail

fd -tf png$ static/uploads -x cwebp -lossless -mt {} -o {.}.webp
fd -tf png$ static/uploads -X rm -v
